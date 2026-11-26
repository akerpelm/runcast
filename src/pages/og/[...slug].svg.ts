import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title, description: post.data.description },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { title, description } = props as { title: string; description: string };

  // Escape XML entities
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Wrap title text at ~35 chars per line
  const titleLines = wrapText(title, 35);
  // Truncate description to ~100 chars
  const desc = description.length > 100 ? description.slice(0, 97) + "..." : description;

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f3f1eb"/>
      <stop offset="100%" stop-color="#f3f1eb"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Accent stripe -->
  <rect x="0" y="0" width="8" height="630" fill="#a83f2a"/>

  <!-- Logo -->
  <text x="80" y="85" font-family="'Barlow Condensed', 'Arial Narrow', sans-serif" font-weight="800" font-size="28" fill="#16181a">
    Should I <tspan fill="#a83f2a">Run</tspan>
  </text>
  <text x="80" y="112" font-family="sans-serif" font-size="14" fill="#5c5850">Blog</text>

  <!-- Title -->
  ${titleLines.map((line, i) => `<text x="80" y="${220 + i * 56}" font-family="'Barlow Condensed', 'Arial Narrow', sans-serif" font-weight="800" font-size="48" fill="#16181a">${esc(line)}</text>`).join("\n  ")}

  <!-- Description -->
  <text x="80" y="${220 + titleLines.length * 56 + 40}" font-family="sans-serif" font-size="20" fill="#5c5850">${esc(desc)}</text>

  <!-- Footer -->
  <text x="80" y="580" font-family="sans-serif" font-size="16" fill="#A8A29E">shouldirun.today</text>

  <!-- Decorative circle -->
  <circle cx="1080" cy="315" r="120" fill="none" stroke="#a83f2a" stroke-width="2" opacity="0.15"/>
  <circle cx="1080" cy="315" r="80" fill="none" stroke="#a83f2a" stroke-width="1.5" opacity="0.1"/>
</svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // max 3 lines
}
