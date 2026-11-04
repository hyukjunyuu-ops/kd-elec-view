/* =========================================================
   cab.js — 큐비클(반) 묶음: VCB·ACB·LBS의 [번호] 칸 = 큐비클 번호 (현장 명판 · 예: HV-7)
   - 같은 동에서 번호가 같으면 한 함 (2단 큐비클 · VCB 큐비클 안 분기)
   - 번호를 안 쓰면 따로 · 분전반 안 MCCB의 번호(회로 번호)는 묶지 않음
   보이는 곳: 속성창 번호 칸 옆 '같은 함' · 전기 Flow 점선 상자 · 계획정전 '같은 함 충전부' 경고
   ========================================================= */

const CAB_T = {VCB: 1, ACB: 1, LBS: 1};
const cabNo = n => n && n.type === 'CB' && CAB_T[n.cbk] ? String(n.no || '').trim() : '';
function cabOf(n) { const no = cabNo(n); return no ? {k: effBld(n) + '|' + no.toUpperCase(), nm: no} : null; }
let _cabIdx = null, _cabAt = null;
function cabIndex() {
  if (_cabIdx && _cabAt === S.nodes) return _cabIdx;
  const m = new Map(); S.nodes.forEach(n => { const c = cabOf(n); if (!c) return; if (!m.has(c.k)) m.set(c.k, {nm: c.nm, L: []}); m.get(c.k).L.push(n); });
  _cabIdx = m; _cabAt = S.nodes; return m;
}
const cabMates = n => { const c = cabOf(n); return c ? (cabIndex().get(c.k) || {L: [n]}).L : []; };
{ const _s = save; save = function () { _cabIdx = null; return _s.apply(this, arguments); }; }

// 속성창: VCB·ACB·LBS면 번호 칸 아래 작은 안내 + 같은 함
{
  const _rf = renderForm;
  renderForm = function () {
    _rf.apply(this, arguments);
    const n = byId(UI.sel), el = document.getElementById('form'); if (!n || n.type !== 'CB' || !CAB_T[n.cbk] || !el) return;
    const f = el.querySelector('[data-f="no"]'), mates = cabMates(n).filter(x => x.id !== n.id);
    const d = document.createElement('div'); d.className = 'cabHint';
    d.innerHTML = cabNo(n) ? `▣ 큐비클 <b>${esc(cabNo(n))}</b>${mates.length ? ` · 같은 함: ${mates.map(x => `<a data-cabgo="${esc(x.id)}">${esc(label(x))}</a>`).join(', ')}` : ' · 이 함에는 이 차단기만'}`
      : '번호 = 큐비클(반) 번호 · 같은 번호끼리 한 함 (예: 2단 큐비클)';
    const lab = f && f.closest('label'); if (lab) lab.appendChild(d); else if (cabNo(n)) { const at = el.querySelector('.act') || el.querySelector('.btns'); at ? at.parentNode.insertBefore(d, at) : el.appendChild(d); }
  };
}
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-cabgo]'); if (a) select(a.dataset.cabgo, true); });

// 계획정전: 같은 함 안에 살아 있는 차단기
function cabLiveMates(offIds) {
  const P = fpPower(), out = [];
  offIds.map(byId).filter(Boolean).forEach(n => cabMates(n).forEach(x => { if (x.id !== n.id && P.alive.has(x.id) && !out.some(o => o.x.id === x.id)) out.push({x, by: n, nm: cabNo(n)}); }));
  return out;
}
{
  const _m = rpMenu;
  rpMenu = async function () {
    await _m.apply(this, arguments);
    const L = cabLiveMates([...fpOffIds()]), box = document.querySelector('#mdl .rpF'); if (!L.length || !box) return;
    const w = document.createElement('div'); w.className = 'cabWarn';
    w.innerHTML = `⚠ <b>같은 함 안에 전기가 살아 있는 차단기</b> — 작업 시 충전부 주의: ${L.map(o => `${esc(label(o.x))} (큐비클 ${esc(o.nm)})`).join(', ')}`;
    box.parentNode.insertBefore(w, box);
  };
  const _ft = typeof rpFormTags === 'function' ? rpFormTags : null;
  if (_ft) rpFormTags = function (D) { const o = _ft.apply(this, arguments), L = cabLiveMates(D.off.map(n => n.id));
    if (L.length) o.정전차단기 += `   ⚠ 같은 함 충전 중: ${L.map(x => label(x.x)).join(', ')}`; return o; };
}

(function () {
  const s = document.createElement('style');
  s.textContent = `#form .cabHint{display:block;font-size:11.5px;color:#7c3aed;font-weight:400;margin-top:3px}#form .cabHint a{color:#6d28d9;cursor:pointer;text-decoration:underline}
#mdl .cabWarn{margin:6px 0;padding:7px 10px;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:12.5px}`;
  document.head.appendChild(s);
})();
