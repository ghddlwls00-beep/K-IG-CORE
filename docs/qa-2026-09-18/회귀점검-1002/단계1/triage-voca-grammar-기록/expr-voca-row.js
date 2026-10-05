(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const row = () => document.querySelector('main [data-action="play-row"]');
  const state = () => {
    const rb = row();
    const lis = [...document.querySelectorAll('main li[data-word]')].slice(0, 6);
    return {
      row: rb ? { pressed: rb.getAttribute('aria-pressed'), label: rb.getAttribute('aria-label'), text: rb.innerText.trim() } : null,
      speakingCards: lis.filter((li) => li.className.includes('bg-ink')).map((li) => li.getAttribute('data-word')),
      audio: (window.__kigAudio || []).slice(-3).map((e) => ({ ev: e.ev, src: String(e.src || e.text || '').slice(-30) })),
    };
  };
  const out = { before: state() };
  row().click();
  await sleep(500);
  out.afterRowPress = state();
  const first = document.querySelector('main li[data-word="1"] [data-word-play]');
  out.firstLabel = first && first.getAttribute('aria-label');
  first.click();
  await sleep(300);
  out.afterCardPress = state();
  await sleep(6000);
  out.after6s = state();
  // press the row button once more: does it restart, or only clear the stuck state?
  row().click();
  await sleep(1500);
  out.afterRowPressAgain = state();
  try { window.__kigStop && window.__kigStop(); } catch {}
  return out;
})()
