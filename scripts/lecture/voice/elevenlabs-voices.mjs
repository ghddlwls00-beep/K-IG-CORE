#!/usr/bin/env node
/**
 * LECTURE voice — the ElevenLabs account's state and the Korean male voices on offer (for the owner to pick from).
 *
 *   node scripts/lecture/voice/elevenlabs-voices.mjs [--page-size 30] [--add <voice_id> …]
 *
 * Prints: the subscription (tier · credits used / limit · reset date · voice slots), the voices already in the
 * account (/v1/voices), and the Voice Library's Korean male voices (/v1/shared-voices?language=ko&gender=male —
 * name · id · accent · age · use case · description · credit multiplier · notice period). --add copies a library
 * voice into the account (/v1/voices/add/{public_owner_id}/{voice_id}) so speech-to-speech can use it.
 * Key: ELEVENLABS_API_KEY (.env.local / KIG_ENV_LOCAL) — never printed. Read-only except --add.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
for (const file of [path.join(ROOT, ".env.local"), process.env.KIG_ENV_LOCAL].filter(Boolean)) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY is required");
const API = "https://api.elevenlabs.io/v1";
const get = async (p) => {
  const r = await fetch(`${API}${p}`, { headers: { "xi-api-key": KEY } });
  if (!r.ok) throw new Error(`${p} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const sub = await get("/user/subscription");
console.log(`subscription: ${sub.tier} · credits ${sub.character_count?.toLocaleString("en-US")} / ${sub.character_limit?.toLocaleString("en-US")} · resets ${sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) : "?"} · voice slots ${sub.voice_slots_used ?? "?"}/${sub.voice_limit ?? "?"} · instant cloning ${sub.can_use_instant_voice_cloning} · pro cloning ${sub.can_use_professional_voice_cloning}`);

const mine = await get("/voices");
console.log(`\naccount voices (${mine.voices.length}):`);
for (const v of mine.voices) console.log(`  ${v.voice_id}  ${v.name}  [${v.category}]  ${Object.entries(v.labels || {}).map(([k, x]) => `${k}=${x}`).join(" ")}`);

const addIds = args.includes("--add") ? args.slice(args.indexOf("--add") + 1).filter((a) => !a.startsWith("--")) : [];
const lib = await get(`/shared-voices?language=ko&gender=male&page_size=${arg("--page-size", 30)}&sort=usage_character_count_1y`);
console.log(`\nVoice Library — Korean · male (${lib.voices.length} shown${lib.has_more ? ", more exist" : ""}):`);
for (const v of lib.voices) {
  console.log(`  ${v.voice_id}  ${v.name}  owner ${v.public_owner_id}  ${v.accent || ""} ${v.age || ""} ${v.use_case || ""} ×${v.category === "professional" ? "pro" : v.category}  mult ${v.rate ?? 1}  notice ${v.notice_period ?? "-"}d  uses1y ${v.usage_character_count_1y ?? "?"}`);
  console.log(`      ${(v.description || "").replace(/\s+/g, " ").slice(0, 160)}`);
  if (addIds.includes(v.voice_id)) {
    const r = await fetch(`${API}/voices/add/${v.public_owner_id}/${v.voice_id}`, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify({ new_name: v.name }) });
    console.log(`      → added to the account: ${r.status} ${r.ok ? "" : (await r.text()).slice(0, 160)}`);
  }
}
