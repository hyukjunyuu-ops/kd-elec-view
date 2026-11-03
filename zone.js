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
  if (!P || !P.z) return `<div class="zoneV"><div class="empty">왼쪽 트리에서 분전반·배전반·MCC반을 고르면 그 반 부하도면이 나와요.<br><span class="muted">부하도면이 있는 반은 트리에 <span class="zb">📄</span> 표시가 붙어 있어요.</span></div></div>`;
  let h = plView();
  const H = byId(P.id), zc = H ? (S.zones[H.id] || 0) : 0;
  // 부하도면 없는 반: '올리세요'가 아니라 '없음'으로 분명하게
  if (H && !zc) h = h.replace(/<div class="empty">[\s\S]*?<\/div>(?=<\/div>$)/, `<div class="zoNo"><div class="t">📄 <b>${esc(label(H))}</b> — 부하도면 없음</div>
    <div class="muted">이 반은 아직 부하도면이 안 올라가 있어요. 부하도면이 있는 반은 트리에 <span class="zb">📄</span> 표시가 붙어 있어요.</div>
    <button class="plBtn" data-pla="mkZ">🖼 이 반 부하도면 올리기</button><div class="plRo" style="margin-top:8px">올리려면 위쪽 [✎ 편집]을 켜세요.</div></div>`);
  // 부하(회로)를 골랐으면: 이 부하가 부하도면에 찍혀 있는지
  const s = byId(UI.sel);
  if (H && zc && s && s.id !== H.id && !PL_P(s.type)) {
    const zp = s.zp && s.zp.split('|'), on = zp && zp[0] === H.id && +zp[1] <= zc;
    const b = on ? `<div class="zoSt ok">📍 <b>${esc(label(s))}</b> — 도면 ${zp[1]}에 표시돼 있어요 (빨간 점)${+zp[1] !== P.s ? ` <button data-pls="${zp[1]}">도면 ${zp[1]} 보기</button>` : ''}</div>`
      : `<div class="zoSt no">⚠ <b>${esc(label(s))}</b> — 아직 부하도면에 표시 안 됨<button class="plBtn" data-pla="put">📍 지금 위치 찍기</button></div>`;
    h = h.replace(/(<div id="plW">)/, b + '$1');
  }
  return `<div class="zoneV">${h}</div>`;
}
// 트리: 부하도면 있는 반 📄n · 부하도면에 찍힌 부하 📍
{
  const _row = rowHtml;
  rowHtml = function (n) {
    const h = _row.apply(this, arguments); let b = '';
    if (PL_P(n.type) && (S.zones[n.id] || 0) > 0) b = `<span class="zb" title="부하도면 ${S.zones[n.id]}장">📄${S.zones[n.id] > 1 ? S.zones[n.id] : ''}</span>`;
    else if (n.zp && (S.zones[n.zp.split('|')[0]] || 0) > 0) b = '<span class="zb p" title="부하도면에 위치 표시됨">📍</span>';
    return b ? h.replace(/<\/div>$/, b + '</div>') : h;
  };
}
(function () {
  const s = document.createElement('style');
  s.textContent = `
/* 부하도면 탭에서는 층(위치) 도면 버튼 숨김 */
#view .zoneV .zoNo{margin:40px auto;max-width:460px;text-align:center;padding:26px;border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc}
#view .zoneV .zoNo .t{font-size:16px;margin-bottom:8px}#view .zoneV .zoNo .plBtn{margin-top:14px}
#view .zoneV .zoSt{display:flex;align-items:center;gap:8px;padding:7px 12px;margin:0 0 6px;border-radius:8px;font-size:13px}
#view .zoneV .zoSt.ok{background:#ecfdf5;color:#065f46}#view .zoneV .zoSt.no{background:#fff7ed;color:#9a3412}
#view .zoneV .zoSt button{margin-left:auto;padding:3px 10px;border:1px solid currentColor;background:#fff;color:inherit;border-radius:6px;font-size:12px;cursor:pointer}
.zb{font-size:10.5px;margin-left:4px;padding:0 4px;border-radius:5px;background:#eef2ff;color:#3730a3;white-space:nowrap}.zb.p{background:none;padding:0}
#view .zoneV [data-plf],#view .zoneV [data-pla="addF"],#view .zoneV .seg:has([data-plv]){display:none!important}`;
  document.head.appendChild(s);
})();
