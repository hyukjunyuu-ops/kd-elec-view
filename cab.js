/* =========================================================
   cab.js — 설치 함(큐비클): 전기 연결(트리)과 따로, 어느 함 안에 들어 있는지
   n.cab: ''  = 자동 (ACB 바로 아래 MCCB 등은 ACB반 안 · VCB·ACB 자체는 단독 큐비클)
          '-' = 단독 큐비클
          '=' = 상위와 같은 함
          그 밖 = 함 이름 (같은 이름끼리 한 함 · 예: 2단 큐비클 HV-7)
   보이는 곳: 속성창 [설치 함] · 트리 ▣ 표시 · 전기 Flow 점선 상자 · 계획정전 '같은 함 충전부' 경고
   ========================================================= */

const CAB_BIG = {VCB: 1, ACB: 1};
const cabIsCB = n => n && n.type === 'CB';
// 그 차단기가 들어 있는 함: {k: 묶음 키, nm: 이름} · 함과 상관없는 항목은 null
function cabOf(n, g) {
  g = g || 0; if (!cabIsCB(n) || g > 40) return null;
  const p = par(n), v = n.cab || '';
  if (v === '-') return {k: 'id:' + n.id, nm: label(n) + ' 큐비클', own: 1};
  if (v && v !== '=') return {k: 'nm:' + v, nm: v};
  // 자동: ACB 바로 아래 차단기(MCCB 등)는 ACB반 안 · VCB 아래 피더는 모선으로 이어진 다른 큐비클이라 따로 (같은 함이면 '상위와 같은 함'으로 직접)
  if ((v === '=' || (!v && p && p.cbk === 'ACB' && n.cbk !== 'ACB' && n.cbk !== 'VCB' && effBld(n) === effBld(p))) && cabIsCB(p)) { const q = cabOf(p, g + 1); if (q) return q; }
  if (CAB_BIG[n.cbk] || v === '=') return {k: 'id:' + n.id, nm: label(n) + ' 큐비클', own: 1};
  return null;
}
// 같은 함 안의 차단기들 (나 포함)
let _cabIdx = null, _cabAt = null;
function cabIndex() {
  if (_cabIdx && _cabAt === S.nodes) return _cabIdx;
  const m = new Map(); S.nodes.forEach(n => { const c = cabOf(n); if (!c) return; if (!m.has(c.k)) m.set(c.k, {nm: c.nm, L: []}); m.get(c.k).L.push(n); });
  _cabIdx = m; _cabAt = S.nodes; return m;
}
const cabMates = n => { const c = cabOf(n); return c ? (cabIndex().get(c.k) || {L: [n]}).L : []; };
{ const _s = save; save = function () { _cabIdx = null; return _s.apply(this, arguments); }; }   // 고치면 다시 셈
const cabNames = () => [...new Set(S.nodes.map(n => n.cab).filter(v => v && v !== '-' && v !== '='))].sort();

// ---------- 속성창: [설치 함] ----------
{
  const _rf = renderForm;
  renderForm = function () {
    _rf.apply(this, arguments);
    const n = byId(UI.sel), el = document.getElementById('form'); if (!cabIsCB(n) || !el) return;
    const c = cabOf(n), mates = cabMates(n).filter(x => x.id !== n.id), p = par(n), edit = typeof UIX === 'undefined' || UIX.edit;
    if (!c && !edit) return;
    const auto = !n.cab ? (cabIsCB(p) && p.cbk === 'ACB' && cabOf(n) && cabOf(p) && cabOf(n).k === cabOf(p).k ? `자동: 상위(${label(p)})와 같은 함` : CAB_BIG[n.cbk] ? '자동: 단독 큐비클' : '자동: 함 없음') : '';
    const d = document.createElement('div'); d.className = 'cabBox';
    d.innerHTML = `<div class="h">▣ 설치 함 <span class="mu">(어느 큐비클·반 안에 있나 · 전기 연결과 따로)</span></div>
      ${edit ? `<select data-cab="${esc(n.id)}"><option value=""${!n.cab ? ' selected' : ''}>${esc(auto)}</option><option value="-"${n.cab === '-' ? ' selected' : ''}>단독 큐비클</option>${cabIsCB(p) ? `<option value="="${n.cab === '=' ? ' selected' : ''}>상위(${esc(label(p))})와 같은 함</option>` : ''}
        ${cabNames().map(v => `<option value="${esc(v)}"${n.cab === v ? ' selected' : ''}>함 이름: ${esc(v)}</option>`).join('')}<option value="+">+ 함 이름 정하기 (예: HV-7 · 2단 큐비클)…</option></select>` : ''}
      <div class="s">${c ? `<b>${esc(c.nm)}</b>${mates.length ? ` · 같은 함: ${mates.map(x => `<a data-cabgo="${esc(x.id)}">${esc(label(x))}</a>`).join(', ')}` : ' · 이 함에는 이 차단기만'}` : '<span class="mu">큐비클에 들어 있지 않음</span>'}</div>`;
    const at = el.querySelector('.act') || el.querySelector('.btns'); at ? at.parentNode.insertBefore(d, at) : el.appendChild(d);
  };
}
document.addEventListener('change', e => {
  const s = e.target.closest && e.target.closest('[data-cab]'); if (!s) return;
  const n = byId(s.dataset.cab); if (!n) return; let v = s.value;
  if (v === '+') { v = (prompt('함 이름 (현장 명판 · 예: HV-7, 고압반 No.3)\n같은 이름을 준 차단기끼리 한 함으로 묶여요.', n.cab && n.cab.length > 1 ? n.cab : '') || '').trim(); if (!v) return renderForm(); }
  snap('설치 함'); if (v) n.cab = v; else delete n.cab; save(); renderAll(); toast(`설치 함: ${(cabOf(n) || {nm: '없음'}).nm}`, true);
});
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-cabgo]'); if (a) select(a.dataset.cabgo, true); });

// ---------- 트리: 여러 대가 든 함은 ▣ 표시 ----------
{
  const _row = rowHtml;
  rowHtml = function (n) {
    const h = _row.apply(this, arguments); if (!cabIsCB(n)) return h;
    const c = cabOf(n); if (!c) return h; const g = cabIndex().get(c.k); if (!g || g.L.length < 2) return h;
    if (c.own && c.k !== 'id:' + n.id) return h;   // 단독 함은 대표(메인) 차단기에만
    return h.replace(/<\/div>$/, `<span class="cabT" title="${esc(c.nm)} · 차단기 ${g.L.length}대가 한 함">▣ ${c.own ? g.L.length + '대' : esc(c.nm)}</span></div>`);
  };
}

// ---------- 계획정전: 같은 함 안에 살아 있는 차단기 ----------
function cabLiveMates(offIds) {
  const P = fpPower(), out = [];
  offIds.map(byId).filter(Boolean).forEach(n => cabMates(n).forEach(x => { if (x.id !== n.id && P.alive.has(x.id) && !out.some(o => o.x.id === x.id)) out.push({x, by: n, nm: cabOf(n).nm}); }));
  return out;
}
{
  const _m = rpMenu;
  rpMenu = async function () {
    await _m.apply(this, arguments);
    const L = cabLiveMates([...fpOffIds()]), box = document.querySelector('#mdl .rpF'); if (!L.length || !box) return;
    const w = document.createElement('div'); w.className = 'cabWarn';
    w.innerHTML = `⚠ <b>같은 함 안에 전기가 살아 있는 차단기</b> — 작업 시 충전부 주의: ${L.map(o => `${esc(label(o.x))} (${esc(o.nm)})`).join(', ')}`;
    box.parentNode.insertBefore(w, box);
  };
  const _ft = typeof rpFormTags === 'function' ? rpFormTags : null;
  if (_ft) rpFormTags = function (D) { const o = _ft.apply(this, arguments), L = cabLiveMates(D.off.map(n => n.id));
    if (L.length) o.정전차단기 += `   ⚠ 같은 함 충전 중: ${L.map(x => label(x.x)).join(', ')}`; return o; };
}

(function () {
  const s = document.createElement('style');
  s.textContent = `#form .cabBox{margin:10px 0;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:12.5px}
#form .cabBox .h{font-weight:700;color:#374151;margin-bottom:5px}#form .cabBox .mu{font-weight:400;color:#94a3b8;font-size:11.5px}
#form .cabBox select{width:100%;font:inherit;font-size:12.5px;padding:4px 6px;border:1px solid #d6dbe8;border-radius:6px;margin-bottom:5px}
#form .cabBox .s{color:#475569}#form .cabBox a{color:#262f7d;cursor:pointer;text-decoration:underline}
.cabT{font-size:10.5px;margin-left:4px;color:#7c3aed;white-space:nowrap}
#mdl .cabWarn{margin:6px 0;padding:7px 10px;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:12.5px}`;
  document.head.appendChild(s);
})();
