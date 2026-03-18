/**
 * RunCast Feedback Sync Worker
 * Receives feedback entries from the client and persists them in D1.
 * Idempotent on `id` field (INSERT OR IGNORE).
 */

interface Env {
  DB: D1Database;
}

interface FeedbackPayload {
  id: string;
  anonId: string;
  timestamp: string;
  date: string;
  location?: string;
  lat?: number | null;
  lng?: number | null;
  weather?: Record<string, unknown>;
  aqiForHour?: number | null;
  recommended?: Record<string, unknown>;
  prefs?: Record<string, unknown>;
  clothingFeel?: string | null;
  effortLevel?: string | null;
  shoes?: string | null;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, resets when the isolate is evicted — fine for Workers)
// ---------------------------------------------------------------------------
const MAX_REQUESTS_PER_MINUTE = 20;
const RATE_WINDOW_MS = 60_000;

const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let timestamps = ipHits.get(ip);

  if (!timestamps) {
    timestamps = [];
    ipHits.set(ip, timestamps);
  }

  // Drop entries older than the window
  while (timestamps.length > 0 && timestamps[0] <= now - RATE_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }

  timestamps.push(now);
  return false;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const MAX_ENTRIES = 10;
const MAX_BODY_BYTES = 100 * 1024; // 100 KB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUIRED_FIELDS = ["id", "anonId", "timestamp", "date"] as const;

function validateEntry(entry: unknown): entry is FeedbackPayload {
  if (typeof entry !== "object" || entry === null) return false;
  const obj = entry as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (typeof obj[field] !== "string" || (obj[field] as string).length === 0) {
      return false;
    }
  }

  if (!UUID_RE.test(obj.id as string)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------
function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/feedback") {
      return jsonResponse({ error: "Not found" }, 404, corsHeaders);
    }

    // --- Rate limit by IP ---
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isRateLimited(ip)) {
      return jsonResponse({ error: "Too many requests" }, 429, corsHeaders);
    }

    // --- Body size check ---
    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request body too large" }, 413, corsHeaders);
    }

    try {
      // Read body as text first so we can enforce size even when
      // Content-Length is missing or untrusted.
      const bodyText = await request.text();
      if (bodyText.length > MAX_BODY_BYTES) {
        return jsonResponse({ error: "Request body too large" }, 413, corsHeaders);
      }

      const parsed: unknown = JSON.parse(bodyText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return jsonResponse({ error: "Expected non-empty array" }, 400, corsHeaders);
      }

      // --- Max entries check ---
      if (parsed.length > MAX_ENTRIES) {
        return jsonResponse(
          { error: `Too many entries (max ${MAX_ENTRIES})` },
          400,
          corsHeaders,
        );
      }

      // --- Validate every entry ---
      const invalid = parsed.filter((e) => !validateEntry(e));
      if (invalid.length > 0) {
        return jsonResponse(
          { error: "Invalid entries: each must have id (UUID), anonId, timestamp, date as strings" },
          400,
          corsHeaders,
        );
      }

      const entries = parsed as FeedbackPayload[];

      // Insert
      const stmt = env.DB.prepare(
        `INSERT OR IGNORE INTO feedback
         (id, anon_id, timestamp, date, location, lat, lng, weather_json, aqi, recommended_json, prefs_json, clothing_feel, effort_level, shoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      const batch = entries.map((e) =>
        stmt.bind(
          e.id,
          e.anonId,
          e.timestamp,
          e.date,
          e.location || null,
          e.lat ?? null,
          e.lng ?? null,
          e.weather ? JSON.stringify(e.weather) : null,
          e.aqiForHour ?? null,
          e.recommended ? JSON.stringify(e.recommended) : null,
          e.prefs ? JSON.stringify(e.prefs) : null,
          e.clothingFeel || null,
          e.effortLevel || null,
          e.shoes || null,
        ),
      );

      await env.DB.batch(batch);

      return jsonResponse({ inserted: batch.length }, 200, corsHeaders);
    } catch {
      return jsonResponse({ error: "Internal error" }, 500, corsHeaders);
    }
  },
} satisfies ExportedHandler<Env>;
