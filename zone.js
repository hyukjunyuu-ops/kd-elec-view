/* =========================================================
   zone.js — '부하도면' 탭 (배전반/분전반/MCC반 위치 도면과 따로)
   - 위: 부하도면이 있는 반 목록 (동별, 장 수) → 누르면 그 반 부하도면
   - 아래: 그 반 부하도면 (도면 1·2·3 … 최대 20장, 부하 마커·아이콘·범위 — 위치 도면과 같은 편집)
   - 트리에서 반을 고르면 그 반 부하도면 · 회로(부하)를 고르면 그 부하가 찍힌 장
   ========================================================= */

const ZO = {last: null};
// 고른 항목의 부하도면 반: 반이면 그 반, 회로면 위쪽 반
function zoTarget() { const s = byId(UI.sel); if (!s) return null; return PL_P(s.type) ? s : plHost(s); }
function zoneView() {
  // 트리에서 다른 걸 골랐으면 그 반 부하도면으로 (위치 도면 층으로 가지 않게)
  if (UI.sel !== ZO.last) {
    ZO.last = UI.sel; const s = byId(UI.sel), T = zoTarget();
    if (s && T) { const t = plTarget(s), P = plParse(t); PL.cur = P && P.z ? t : plZK(T.id, 1); PL.place = null; PL.tool = ''; PL.keep = true; }
  }
  let P = plParse(PL.cur);
  if (!P || !P.z || !byId(P.id)) {   // 아직 고른 반이 없으면 부하도면 있는 첫 반
    const T = zoTarget(), first = Object.keys(S.zones).find(id => byId(id) && S.zones[id] > 0);
    const id = T ? T.id : first; if (id) { PL.cur = plZK(id, 1); PL.keep = true; P = plParse(PL.cur); }
  }
  // 부하도면 있는 반 (동별)
  const L = Object.keys(S.zones).filter(id => byId(id) && S.zones[id] > 0).map(byId), by = {};
  L.forEach(n => { (by[bk(n) || '동 미지정'] = by[bk(n) || '동 미지정'] || []).push(n); });
  const cur = P && P.z ? P.id : '';
  const list = Object.keys(by).sort().map(b => `<span class="zoB">${esc(b)}</span>${by[b].sort((x, y) => label(x).localeCompare(label(y), 'ko', {numeric: true}))
    .map(n => `<button data-zop="${esc(n.id)}"${n.id === cur ? ' class="on"' : ''}>${esc(label(n))}<i>${S.zones[n.id]}장</i></button>`).join('')}`).join('');
  const head = `<div class="zoBar"><b>📄 부하도면</b>${L.length ? list : '<span class="muted">아직 부하도면이 없어요.</span>'}
    <span class="muted zoH">다른 반은 왼쪽 트리에서 고르면 [부하도면 만들기]가 떠요 · 반마다 ${PL_ZMAX}장까지</span></div>`;
  if (!P || !P.z) return `<div class="zoneV">${head}<div class="empty">왼쪽 트리에서 분전반·배전반·MCC반을 고르세요.</div></div>`;
  return `<div class="zoneV">${head}${plView()}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-zop]'); if (!b || UI.tab !== 'zone') return;
  PL.cur = plZK(b.dataset.zop, 1); PL.place = null; PL.tool = ''; PL.keep = true; ZO.last = b.dataset.zop; select(b.dataset.zop, true);
});
(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .zoBar{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-bottom:8px;padding:7px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12.5px}
#view .zoBar>b{color:#262f7d;font-size:14px;margin-right:4px}#view .zoB{font-weight:700;color:#475569;margin:0 2px 0 8px}
#view .zoBar button{padding:3px 9px;border:1px solid #d6dbe8;background:#fff;border-radius:14px;font-size:12px;cursor:pointer}#view .zoBar button.on{background:#262f7d;color:#fff;border-color:#262f7d}
#view .zoBar button i{font-style:normal;font-size:10.5px;opacity:.7;margin-left:4px}#view .zoH{flex-basis:100%;font-size:11.5px}
/* 부하도면 탭에서는 층(위치) 도면 버튼 숨김 */
#view .zoneV [data-plf],#view .zoneV [data-pla="addF"],#view .zoneV .seg:has([data-plv]){display:none!important}`;
  document.head.appendChild(s);
})();
