/* =========================================================
   zone.js — '부하도면' 탭 (배전반/분전반/MCC반 위치 도면과 따로)
   - 고른 반의 부하도면만 (도면 1·2·3 … 최대 20장, 부하 마커·아이콘·범위 — 위치 도면과 같은 편집)
   - 트리에서 반을 고르면 그 반 부하도면 · 회로(부하)를 고르면 그 부하가 찍힌 장
   ========================================================= */

const ZO = {last: null};
{ const _pt = plTarget; plTarget = function (n) { const t = _pt(n), P = plParse(t); return UI.tab === 'plan' && P && P.z ? plFloorOf(n) : t; }; }
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
  if (!P || !P.z) return `<div class="zoneV"><div class="empty">왼쪽 트리에서 분전반·배전반·MCC반을 고르면 그 반 부하도면이 나와요.</div></div>`;
  return `<div class="zoneV">${plView()}</div>`;
}
(function () {
  const s = document.createElement('style');
  s.textContent = `
/* 부하도면 탭에서는 층(위치) 도면 버튼 숨김 */
#view .zoneV [data-plf],#view .zoneV [data-pla="addF"],#view .zoneV .seg:has([data-plv]){display:none!important}`;
  document.head.appendChild(s);
})();
