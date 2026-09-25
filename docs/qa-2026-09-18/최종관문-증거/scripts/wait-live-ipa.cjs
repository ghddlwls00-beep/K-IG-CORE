// 새 배포(dd12758)가 운영에 올라왔는지 — 무료 s1-2 첫 문장의 새 키(발음 기호판)가 로그인 없이 206, 지금까지의 한글판 키가 403 이면 올라온 것
// (무료 소리 키 목록 freeSpeechKeys.json 이 앱과 함께 배포되므로). 읽기만 · 20초마다 · 최대 N분.
//   node wait-live-ipa.cjs [분]
const NEW = "https://k-ig-core.vercel.app/audio/azure-ava/v1/26-081f831b4d5ea0cc.mp3";
const OLD = "https://k-ig-core.vercel.app/audio/azure-ava/v1/x-2981f91b43135230.mp3";
const st = async (u) => { try { const r = await fetch(u, { headers: { Range: "bytes=0-1" }, signal: AbortSignal.timeout(20000) }); return r.status; } catch (e) { return `err ${e.cause ? e.cause.code : e.name}`; } };
(async () => {
  const until = Date.now() + Number(process.argv[2] || 10) * 60000;
  while (Date.now() < until) {
    const a = await st(NEW), b = await st(OLD);
    const t = new Date().toISOString().slice(11, 19) + "Z";
    console.log(`${t} new ${a} old ${b}`);
    if (a === 206 && b === 403) { console.log(`LIVE ${new Date().toISOString()}`); process.exit(0); }
    await new Promise((r) => setTimeout(r, 20000));
  }
  console.log("not live yet"); process.exit(1);
})();
