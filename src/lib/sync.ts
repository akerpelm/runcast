/**
 * Feedback sync — fire-and-forget sync to Cloudflare Worker + D1.
 * localStorage is the write buffer; syncs unsynced entries on save and startup.
 */
import { LS_FEEDBACK } from "./feedback";

const SYNC_ENDPOINT = "https://runcast-feedback-sync.akerpelm.workers.dev/feedback";

export function syncFeedback(): void {
  try {
    const raw = localStorage.getItem(LS_FEEDBACK);
    if (!raw) return;

    const entries = JSON.parse(raw) as { synced?: boolean; id?: string }[];
    const unsynced = entries.filter(e => e.synced === false);
    if (unsynced.length === 0) return;

    // Fire-and-forget — don't block UI
    fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unsynced),
    })
      .then(res => {
        if (res.ok) {
          // Mark synced entries in localStorage
          const current = localStorage.getItem(LS_FEEDBACK);
          if (!current) return;
          const all = JSON.parse(current) as { synced?: boolean; id?: string }[];
          const syncedIds = new Set(unsynced.map(e => e.id));
          for (const entry of all) {
            if (entry.id && syncedIds.has(entry.id)) {
              entry.synced = true;
            }
          }
          localStorage.setItem(LS_FEEDBACK, JSON.stringify(all));
        }
      })
      .catch(() => {
        // Silently fail — will retry next time
      });
  } catch {
    // Silently fail
  }
}
