/* =========================================================
   bulk.js — 손이 덜 가게
   ① 속성창 [↕ 상위 바꾸기]: 끌어다 놓기 대신 목록에서 골라 옮기기 (검색 가능)
   ② 회로도 [⚡ 회로 일괄 입력]: 이 반 회로 전부(또는 빈 칸만) 형식·정격·극수 한 번에
   ③ 트리 편집에서 여러 반 체크 → [층 지정 ▼] 한 번에 (건물 안 보기 층)
   ========================================================= */

/* ---------- ① 상위 바꾸기 ---------- */
const MV_T = {IN: 1, HV: 1, SS: 1, TR: 1, GEN: 1, ATS: 1, CB: 1, MDB: 1, MCC: 1, PNL: 1, UPS: 1};
function mvCands(n, q) {
  const out = [], k = String(q || '').trim().toLowerCase();
  const walk = (pid, d) => kids(pid).forEach(c => {
    if (c.id === n.id) return;                                 // 자기와 그 하위는 빼기
    if (MV_T[c.type] && !isSlot(c)) { const t = `${label(c)} ${bk(c)} ${tlabel(c)}`.toLowerCase(); if (!k || t.includes(k)) out.push({c, d}); }
    walk(c.id, d + 1);
  });
  walk('', 0);
  return out.slice(0, 400);
}
function mvOpts(n, q) {
  const A = mvCands(n, q), cur = n.pid;
  return A.map(({c, d}) => `<option value="${esc(c.id)}"${c.id === cur ? ' selected' : ''}>${'　'.repeat(q ? 0 : Math.min(d, 8))}${esc(tlabel(c))} · ${esc(label(c))}${bk(c) ? ' (' + esc(bk(c)) + ')' : ''}${c.id === cur ? ' ← 지금 상위' : ''}</option>`).join('')
    || '<option value="">찾는 항목이 없어요</option>';
}
{
  const _rf = renderForm;
  renderForm = function () {
    _rf.apply(this, arguments);
    const n = byId(UI.sel), el = document.getElementById('form');
    if (!n || !el || (typeof UIX !== 'undefined' && !UIX.edit)) return;
    const bt = el.querySelector('.btns'); if (!bt) return;
    const d = document.createElement('div'); d.className = 'act';
    d.innerHTML = `<div class="ah">↕ 상위 바꾸기 <span class="muted">(지금: ${esc(par(n) ? label(par(n)) : '최상위')})</span></div>
      <div class="ln"><input id="mvQ" placeholder="🔍 옮길 곳 검색 (예: LV-303-A)" style="flex:1"></div>
      <div class="ln"><select id="mvT" size="6" style="flex:1;min-width:0">${mvOpts(n, '')}</select></div>
      <div class="ln"><button id="mvGo" class="pri">이 아래로 옮기기</button></div>
      <div class="muted">하위 항목도 같이 옮겨져요 · 잘못 옮기면 [되돌리기]</div>`;
    bt.parentNode.insertBefore(d, bt);
  };
}
document.addEventListener('input', e => { if (e.target.id !== 'mvQ') return; const n = byId(UI.sel), s = document.getElementById('mvT'); if (n && s) s.innerHTML = mvOpts(n, e.target.value); });
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#mvGo')) return;
  const n = byId(UI.sel), t = (document.getElementById('mvT') || {}).value; if (!n || !t) return;
  if (t === n.pid) return toast('이미 그 아래에 있어요.', false);
  moveNode(n.id, t, 'in');
});

/* ---------- ② 회로 일괄 입력 (회로도) ---------- */
const bkCirc = h => kids(h.id).filter(k => !isSlot(k) && !(typeof BV_PT !== 'undefined' && BV_PT[k.type]) && (k.type === 'CB' || k.type === 'LOAD'));
function bkOpen() {
  const h = byId(PV_HOST); if (!h) return;
  const C = bkCirc(h), emp = C.filter(k => pvKind(k) === 'U' || !k.rating || !k.poles).length;
  uiModal(`<h3>⚡ ${esc(label(h))} · 회로 일괄 입력</h3>
    <div class="bkF"><div class="lb">대상</div>
      <label><input type="radio" name="bkW" value="emp" checked> 빈 칸만 채우기 <span class="muted">(형식·정격·극수 중 빈 것만 · 회로 ${emp}개)</span></label>
      <label><input type="radio" name="bkW" value="all"> 모든 회로 덮어쓰기 <span class="muted">(${C.length}개)</span></label>
      <div class="lb">차단기 형식</div><div class="bkC" data-g="k">${[['', '그대로'], ['MCCB', '배선용 MCCB'], ['ELB', '누전 ELB']].map(([v, l], i) => `<button data-v="${v}"${i ? '' : ' class="on"'}>${l}</button>`).join('')}</div>
      <div class="lb">정격 (A)</div><div class="bkC" data-g="r">${['', '15', '20', '30', '40', '50', '60', '75', '100'].map((v, i) => `<button data-v="${v}"${i ? '' : ' class="on"'}>${v || '그대로'}</button>`).join('')}</div>
      <div class="lb">극수</div><div class="bkC" data-g="p">${['', '1', '2', '3', '4'].map((v, i) => `<button data-v="${v}"${i ? '' : ' class="on"'}>${v ? v + 'P' : '그대로'}</button>`).join('')}</div>
      <div class="muted" style="margin-top:8px">SPARE·빈 자리·하위 반은 건드리지 않아요 (SPARE는 형식·정격만) · 적용 뒤 [되돌리기] 가능</div></div>
    <div class="mdlA"><button data-mdl="x">취소</button><button id="bkGo" class="pri">적용</button></div>`, true);
}
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('[data-bkopen]')) return bkOpen();
  const c = t.closest('.bkC button'); if (c) { c.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === c)); return; }
  if (!t.closest('#bkGo')) return;
  const h = byId(PV_HOST); if (!h) return;
  const v = g => (document.querySelector(`.bkC[data-g="${g}"] .on`) || {dataset: {v: ''}}).dataset.v;
  const K = v('k'), R = v('r'), P = v('p'), all = (document.querySelector('input[name="bkW"]:checked') || {}).value === 'all';
  if (!K && !R && !P) return alert('바꿀 값을 하나 이상 고르세요.');
  snap('회로 일괄 입력'); let n = 0;
  bkCirc(h).forEach(k => {
    let ch = false;
    if (K && (all || pvKind(k) === 'U')) { k.cbk = K; ch = true; }   // 형식은 모델명으로 이미 알아본 것도 '있음'
    if (R && (all || !k.rating)) { k.rating = R; ch = true; }
    if (P && !ckSpare(k) && (all || !k.poles)) { k.poles = P; ch = true; }
    if (ch) n++;
  });
  uiModalClose(); save(); renderAll(); toast(`회로 ${n}개를 바꿨어요.`, true);
});
{
  const _h = pvHtml; pvHtml = function (h) {
    const s = _h(h);
    return s.replace('<button data-pvslot="1"', '<button data-bkopen="1" title="이 반 회로 형식·정격·극수 한 번에">⚡ 회로 일괄 입력</button><button data-pvslot="1"');
  };
}

/* ---------- ③ 여러 반 층 한 번에 (트리 편집) ---------- */
{
  const _eb = renderEditBar;
  renderEditBar = function () {
    _eb.apply(this, arguments);
    const b = document.getElementById('editBar'); if (!b || b.hidden || !UI.chk.size || typeof bvCfg !== 'function') return;
    const P = [...UI.chk].map(byId).filter(n => n && BV_PT[n.type]); if (!P.length) return;
    const F = [...new Set(P.flatMap(n => bvCfg(bk(n)).floors))].sort((a, c) => bvLv(c) - bvLv(a));
    const s = document.createElement('select'); s.id = 'tFl'; s.title = '체크한 반의 층 (건물 안 보기)';
    s.innerHTML = `<option value="">층 지정 (반 ${P.length}개) ▼</option>${F.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}<option value="-">층 미지정</option><option value="+">+ 새 층…</option>`;
    b.insertBefore(s, b.querySelector('#tDel'));
  };
}
document.addEventListener('change', e => {
  if (e.target.id !== 'tFl' || !e.target.value) return;
  let f = e.target.value;
  if (f === '+') { f = (prompt('새 층 (예: 4F, B1)', '') || '').trim().toUpperCase(); if (!f) return renderEditBar(); }
  const P = [...UI.chk].map(byId).filter(n => n && BV_PT[n.type]);
  P.forEach(n => { const c = bvCfg(bk(n)); if (f !== '-' && !c.floors.includes(f)) { c.floors.push(f); c.floors.sort((a, b) => bvLv(a) - bvLv(b)); } c.pos[n.id] = {f}; });
  save(); UI.chk.clear(); renderAll(); toast(`반 ${P.length}개를 ${f === '-' ? '층 미지정' : f}(으)로 정했어요.`, false);
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
.bkF .lb{font-size:12.5px;color:#475569;font-weight:700;margin:10px 0 4px}.bkF label{display:block;font-size:13px;margin:3px 0}
.bkC{display:flex;flex-wrap:wrap;gap:5px}.bkC button{padding:6px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:8px;font-size:13px;cursor:pointer}.bkC button.on{background:#262f7d;color:#fff;border-color:#262f7d}
#editBar #tFl{font-size:12px;padding:3px 4px;border:1px solid #c7d2fe;border-radius:6px;margin-right:4px}`;
  document.head.appendChild(s);
})();
