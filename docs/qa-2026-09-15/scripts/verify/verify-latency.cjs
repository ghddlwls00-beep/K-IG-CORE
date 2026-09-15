#!/usr/bin/env node
/**
 * RE-016 — response time, so a fix that repairs the 404 cannot quietly tax
 * every other request.
 *
 * The proxy runs in front of the page routes. It is a set lookup and it should
 * cost nothing measurable, but "should" is not a measurement — this prints the
 * numbers so the claim can be checked. Five requests per path; the first one on
 * a cold server is reported separately because it includes the start-up cost
 * and averaging it in would hide the steady-state figure.
 *
 *   node docs/qa-2026-09-15/scripts/verify/verify-latency.cjs http://localhost:3100
 *   node docs/qa-2026-09-15/scripts/verify/verify-latency.cjs https://k-ig-core.vercel.app
 */
const BASE = (process.argv[2] || "http://localhost:3100").replace(/\/+$/, "");
const PATHS = ["/", "/ld", "/ld/d001"];
const ROUNDS = 5;

(async () => {
  console.log(`base: ${BASE}\n`);
  const rows = [];
  for (const p of PATHS) {
    const times = [];
    let status = 0;
    for (let i = 0; i < ROUNDS; i += 1) {
      const t0 = performance.now();
      const res = await fetch(`${BASE}${p}`, { redirect: "follow" });
      await res.arrayBuffer();
      times.push(performance.now() - t0);
      status = res.status;
    }
    const cold = times[0];
    const warm = times.slice(1);
    const median = [...warm].sort((a, b) => a - b)[Math.floor(warm.length / 2)];
    const min = Math.min(...warm);
    const max = Math.max(...warm);
    rows.push({ path: p, status, cold, median, min, max });
    console.log(
      `${p.padEnd(12)} status=${status}  cold=${cold.toFixed(0)}ms  ` +
        `median=${median.toFixed(0)}ms  min=${min.toFixed(0)}ms  max=${max.toFixed(0)}ms`,
    );
  }
  const medianOfMedians = rows.map((r) => r.median).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  console.log(`\nmedian across the three paths: ${medianOfMedians.toFixed(0)}ms`);
  console.log(JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 2));
})();
