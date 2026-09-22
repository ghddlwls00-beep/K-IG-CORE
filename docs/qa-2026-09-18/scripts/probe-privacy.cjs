#!/usr/bin/env node
/**
 * 명령서 §14 중 기존 보안 점검이 다루지 않은 항목.
 *
 * `probe-security.cjs` covers authentication, licence gating and headers. It does not answer the
 * privacy and consumer-protection questions the command also asks: is there a cookie notice, can a
 * customer delete their account, is data retention stated, does the site load third-party
 * trackers, does it put personal data in the URL, and does anything the learner types come back
 * out as HTML.
 *
 * Everything here is read-only. It types into the site's own input fields and reads what comes
 * back; it never attacks anything.
 *
 *   node probe-privacy.cjs [--port 9650]
 * Output: out/privacy-probe.json
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const PORT = Number(arg("--port", 9650));
const OUT = path.join(__dirname, "../out");
const BASE = H.BASE;

const results = [];
const record = (area, what, status, note) => {
  results.push({ area, what, status, note });
  console.log(`${status.padEnd(8)} ${area.padEnd(12)} ${what.padEnd(42)} ${String(note).slice(0, 90)}`);
};

const PAGES = ["/", "/student", "/phonics", "/grammar1", "/ld", "/reading", "/student/s1-1"];

(async () => {
  // ---------------------------------------------------------------- 1. HTML 으로 볼 수 있는 것
  const html = {};
  for (const p of PAGES) {
    try { html[p] = await (await fetch(BASE + p)).text(); } catch (e) { html[p] = ""; }
  }
  const all = Object.values(html).join("\n");

  const LEGAL = [
    { what: "이용약관", re: /이용\s*약관|서비스\s*약관|terms of service/i },
    { what: "개인정보처리방침", re: /개인정보\s*(처리)?\s*방침|privacy policy/i },
    { what: "환불·청약철회 규정", re: /환불|청약\s*철회|refund/i },
    { what: "사업자 정보 (상호·대표·사업자번호)", re: /사업자\s*등록\s*번호|통신판매업/i },
    { what: "고객 문의처", re: /고객\s*(센터|문의)|문의하기|support@|카카오톡\s*채널/i },
    { what: "쿠키 안내·동의", re: /쿠키|cookie\s*(notice|consent|policy)/i },
    { what: "계정·데이터 삭제 안내", re: /계정\s*삭제|탈퇴|데이터\s*삭제/i },
    { what: "데이터 보관 기간 안내", re: /보관\s*기간|보유\s*기간|retention/i },
  ];
  for (const l of LEGAL) {
    const hit = Object.entries(html).filter(([, h]) => l.re.test(h)).map(([p]) => p);
    record("법정표시", l.what, hit.length ? "PASS" : "FAIL", hit.length ? `발견: ${hit.join(", ")}` : `${PAGES.length}개 페이지 어디에도 없음`);
  }

  // third-party scripts: anything loaded from a domain that is not this site or Vercel's own
  const srcs = [...all.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const third = [...new Set(srcs.filter((s) => /^https?:\/\//.test(s) && !/k-ig-core\.vercel\.app|\/_next\/|vercel-scripts|vercel\.live/.test(s)))];
  record("추적", "외부 추적·분석 스크립트", third.length ? "FAIL" : "PASS", third.length ? third.join(", ") : "외부 도메인에서 불러오는 스크립트 없음");

  // ---------------------------------------------------------------- 2. 브라우저로만 볼 수 있는 것
  const browser = await H.startBrowser("privacy-probe", PORT);
  const tab = await H.openTab(browser);
  await H.setViewport(tab, "desktop");
  await H.load(tab, "/student/s1-1", { marker: null });

  // what does the site keep in the browser, and does any of it look personal?
  const stored = await tab.eval(`(() => {
    const out = { local: [], session: [], cookies: document.cookie ? document.cookie.split(';').map((c) => c.trim().split('=')[0]) : [] };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.local.push({ key: k, len: (localStorage.getItem(k) || '').length, sample: (localStorage.getItem(k) || '').slice(0, 60) }); } } catch {}
    try { for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); out.session.push({ key: k, len: (sessionStorage.getItem(k) || '').length }); } } catch {}
    return out;
  })()`).catch(() => null);
  const SENSITIVE = /\b(\d{6}-?\d{7}|\d{3}-\d{4}-\d{4}|[\w.+-]+@[\w-]+\.[\w.]+|\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4})\b/;
  const risky = stored ? stored.local.filter((e) => SENSITIVE.test(e.sample)) : [];
  record("저장", "브라우저 저장소에 개인정보(주민·전화·이메일·카드)", risky.length ? "FAIL" : "PASS",
    risky.length ? risky.map((r) => r.key).join(", ") : `항목 ${stored ? stored.local.length : "?"}개 확인, 해당 없음`);
  record("저장", "저장소 항목 목록", "INFO", stored ? stored.local.map((e) => e.key).join(", ").slice(0, 200) : "읽지 못함");

  // does a licence key or session token sit somewhere a script could read it back out?
  const keyish = stored ? stored.local.filter((e) => /licen[cs]e|token|secret|key/i.test(e.key)) : [];
  record("저장", "이용권·토큰 관련 저장 항목", keyish.length ? "REVIEW" : "PASS", keyish.map((k) => `${k.key}(${k.len}자)`).join(", ") || "없음");

  // personal data in the URL: the command forbids it, so check the site never puts any there
  const urls = (await tab.eval(`[...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).slice(0, 400)`).catch(() => [])) || [];
  const leaky = urls.filter((u) => /[?&](email|phone|name|licen[cs]e|key|token)=/i.test(String(u)));
  record("URL", "주소에 개인정보·이용권 정보", leaky.length ? "FAIL" : "PASS", leaky.slice(0, 3).join(", ") || "링크 400개 확인, 해당 없음");

  // ---------------------------------------------------------------- 3. 입력한 글자가 HTML 로 되살아나는가
  // Typed into the site's own answer box, then read back as TEXT: if the markup became a real
  // element, the page renders what a learner types. Nothing is submitted anywhere.
  await H.load(tab, "/grammar1/gh1-006", { marker: null });
  const probe = `<img src=x onerror=1>kig-probe`;
  const xss = await tab.eval(`(() => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const el = document.querySelector('main input[type="text"], main input:not([type]), main textarea');
    if (!el) return { ran: false, why: '입력칸을 찾지 못함' };
    set.call(el, ${JSON.stringify(probe)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { ran: true };
  })()`).catch((e) => ({ ran: false, why: e.message }));
  await H.sleep(900);
  const rendered = await tab.eval(`(() => {
    const m = document.querySelector('main');
    if (!m) return { imgs: 0, text: false };
    return { imgs: [...m.querySelectorAll('img')].filter((i) => (i.getAttribute('src') || '') === 'x').length, text: (m.innerText || '').includes('kig-probe') };
  })()`).catch(() => ({ imgs: 0, text: false }));
  record("입력", "학습자가 친 글자가 HTML 로 실행되는가", !xss.ran ? "BLOCKED" : rendered.imgs ? "FAIL" : "PASS",
    !xss.ran ? xss.why : rendered.imgs ? `입력한 태그가 실제 요소로 만들어짐 (img ${rendered.imgs}개)` : "태그가 글자 그대로 처리됨 (안전)");

  // ---------------------------------------------------------------- 4. 자유 체험과 유료의 구분
  const free = await tab.eval(`(() => { const m = document.querySelector('main'); const t = m ? m.innerText : ''; return { paywall: /이용권|구독|결제|잠금|무료 체험/.test(t), sample: (t.match(/[^\\n]{0,60}(이용권|무료 체험|결제)[^\\n]{0,60}/) || [''])[0] }; })()`).catch(() => ({}));
  record("상업", "무료·유료 구분이 화면에 드러나는가", free && free.paywall ? "PASS" : "REVIEW", (free && free.sample) || "해당 문구를 찾지 못함");

  browser.proc.kill();

  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  fs.writeFileSync(path.join(OUT, "privacy-probe.json"), JSON.stringify({ at: new Date().toISOString(), counts, results }, null, 1));
  console.log(`\n${JSON.stringify(counts)}`);
  console.log(`→ ${path.join(OUT, "privacy-probe.json")}`);
})().catch((e) => { console.error(e); process.exit(1); });
