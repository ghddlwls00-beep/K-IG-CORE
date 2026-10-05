(() => {
  const vis = (el) => !!(el.offsetParent || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  const main = document.querySelector('main') || document.body;
  const all = [...main.querySelectorAll('button, [role=button], a[href^="#"], input[type=checkbox], input[type=radio], select')].filter(vis);
  const res = [];
  for (const el of all) {
    const t = ((el.innerText || el.value || '').replace(/\s+/g, ' ').trim() + ' ' + (el.getAttribute('aria-label') || '')).trim();
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const own = at && (at === el || el.contains(at));
    if (t && own) continue;
    const anc = [];
    for (let p = el; p && p !== main && anc.length < 6; p = p.parentElement) anc.push(p.tagName + (p.className && typeof p.className === 'string' ? '.' + p.className.split(/\s+/).slice(0, 4).join('.') : '') + (p.hidden ? '[hidden]' : '') + (p.getAttribute('aria-hidden') ? '[aria-hidden]' : '') + (p.inert ? '[inert]' : ''));
    const cs = getComputedStyle(el);
    res.push({ label: t, tag: el.tagName, type: el.type || '', html: el.outerHTML.slice(0, 200), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], sy: Math.round(scrollY), own, at: at ? (at.tagName + ' ' + (at.innerText || '').replace(/\s+/g, ' ').slice(0, 40)) : null, opacity: cs.opacity, pos: cs.position, anc });
  }
  return { total: all.length, odd: res };
})()
