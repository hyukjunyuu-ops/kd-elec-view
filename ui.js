/* =========================================================
   ui.js — 화면 정리: 보기 모드 / 편집 모드, 파일 메뉴
   - 평소(보기 모드): 입력칸·추가·삭제·배치 버튼을 숨기고 속성창은 요약만
   - [✎ 편집]을 켜면 모두 보임 (트리 편집, 분전반 이름 입력, 위치 도면 배치, 지도 설비 위치)
   - 켜짐/꺼짐은 이 PC에 기억
   ========================================================= */

const UIX = {edit: false, allB: false};
try { UIX.edit = localStorage.getItem('ckd_elec2_edit') === '1'; } catch (e) {}

function uiSetEdit(on) {
  UIX.edit = !!on;
  try { localStorage.setItem('ckd_elec2_edit', UIX.edit ? '1' : '0'); } catch (e) {}
  document.body.classList.toggle('ro', !UIX.edit);
  const b = $('#bEdit'); if (b) { b.classList.toggle('on', UIX.edit); b.textContent = UIX.edit ? '✎ 편집 중' : '✎ 편집'; }
  if (!UIX.edit) {                       // 끌 때: 각 화면의 편집 상태도 같이 끔
    if (UI.edit) { UI.edit = false; UI.chk.clear(); }
    try { PL.edit = false; PL.place = null; PL.tool = ''; } catch (e) {}
  }
  try { MAP.edit = UIX.edit; } catch (e) {}
}

/* ---------- 보기 모드 속성창 (요약) ---------- */
function uiFormView(n) {
  const T = TYPES[n.type] || {l: n.type, c: '#64748b'}, C = kids(n.id);
  const row = (k, v) => v ? `<tr><th>${k}</th><td>${v}</td></tr>` : '';
  const volt = n.type === 'TR' ? `${esc(effV(n) || '?')} → ${esc(n.v2 || '?')}` : esc(effV(n));
  const src = byId(n.link);
  let h = (typeof favFormBtn === 'function' ? favFormBtn(n) : '') +
    `<div class="path">${pathOf(n).map(x => `<a data-go="${esc(x.id)}">${esc(label(x))}</a>`).join(' › ')}</div>` +
    `<div class="fvH"><span class="ty" style="background:${T.c}">${esc(tlabel(n))}</span><b>${esc(label(n))}</b>${n.imp ? `<span class="impT">중요 · ${esc(n.imp)}</span>` : ''}</div>` +
    '<table class="fvT">' +
    row('종류', esc(T.l) + (n.cbk ? ' · ' + esc(n.cbk) : '')) +
    row('동', esc(effBld(n)) + (n.loc ? ' · ' + esc(n.loc) : '')) +
    row('전압', volt) + row('용량', n.kva ? esc(n.kva) + ' kVA' : n.kw ? esc(n.kw) + ' kW' : '') +
    row('정격', n.type === 'TR' ? '' : esc(spec(n))) + row('형식', esc(n.model || '')) +
    row('결선', esc((WIRES[n.wire] || {}).l || '')) + row('상', n.phase ? esc(n.phase) + '상' : '') +
    row('전원', SRC[effSrc(n)] === '비상' ? '<b style="color:#dc2626">비상</b>' : '') +
    row('공급 위치', src ? `<a data-go="${esc(src.id)}">${esc(label(src))}</a>` : (FP_SRC[n.type] ? '<i>조사 중</i>' : '')) +
    row('빈 자리', isSlot(n) ? '차단기 없는 칸 (현장 순서 맞추기용)' : '') +
    row('하위', C.length ? C.length + '개' : '') + row('비고', esc(n.note || '').replace(/\n/g, '<br>')) +
    '</table><div class="muted" style="margin-top:10px">고치려면 위쪽 <b>[✎ 편집]</b>을 켜세요.</div>';
  return h;
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('#bEdit')) { uiSetEdit(!UIX.edit); renderAll(); toast(UIX.edit ? '✎ 편집 모드 — 입력·추가·삭제·배치를 할 수 있어요.' : '보기 모드 — 실수로 고치지 않게 편집 버튼을 숨겼어요.', false); return; }
  if (t.closest('#bAllB')) { UIX.allB = !UIX.allB; renderBld(); return; }
  const m = $('#mFile .mList');
  if (t.closest('#bFile')) { m.hidden = !m.hidden; return; }
  if (m && !m.hidden && (!t.closest('#mFile') || t.closest('.mList button'))) m.hidden = true;
}, true);
// 보기 모드에서는 분전반 그림 더블클릭(이름 입력)을 막음
document.addEventListener('dblclick', e => { if (!UIX.edit && e.target.closest && e.target.closest('#pvW')) e.stopPropagation(); }, true);

(function () {
  const s = document.createElement('style');
  s.textContent = `
#mFile{position:relative}
#mFile .mList{position:absolute;top:100%;left:0;z-index:50;margin-top:4px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);padding:6px;min-width:230px;display:flex;flex-direction:column;gap:2px}
#mFile .mList[hidden]{display:none}
#mFile .mList button{text-align:left;border:0;background:none;padding:7px 10px;border-radius:6px;font-size:13px}
#mFile .mList button:hover{background:#eef2ff}#mFile .mList button.dng{color:#dc2626}
#mFile .mList hr{border:0;border-top:1px solid #e2e8f0;margin:4px 0}
#bEdit.on{background:#f59e0b;border-color:#f59e0b;color:#fff;font-weight:700}
#bkAge{font-size:12px;color:#6b7280}#bkAge.warn{color:#b45309;font-weight:700}
#bldBar .lnk{border:0;background:none;color:#4f46e5;padding:3px 6px}
.fvH{display:flex;align-items:center;gap:6px;margin:6px 0 8px;font-size:15px}.fvH .ty{color:#fff;font-size:11px;padding:1px 6px;border-radius:4px}
.impT{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:4px;font-size:11px;padding:1px 6px}
table.fvT{width:100%;border-collapse:collapse;font-size:13px}table.fvT th{text-align:left;color:#64748b;font-weight:normal;width:72px;padding:5px 4px;vertical-align:top}
table.fvT td{padding:5px 4px;border-bottom:1px solid #f1f5f9}table.fvT a{color:#1d4ed8;cursor:pointer}
/* 보기 모드에서 숨기는 것 */
body.ro .edOnly,body.ro #tEdit,body.ro #editBar,body.ro #view .pvAdd,body.ro #view .mpBt.ed,
body.ro #view [data-pla="addF"],body.ro #view [data-pla="addS"],body.ro #view [data-pla="bldF"],body.ro #view [data-pla="delF"],
body.ro #view [data-pla="delIc"],body.ro #view [data-pla="delS"],body.ro #view [data-pla="edit"],body.ro #view [data-pla="img"],
body.ro #view [data-pla="renF"],body.ro #view [data-pla="seq"],body.ro #view [data-pla="unput"],body.ro #view [data-pla="put"],
body.ro #view [data-plt],body.ro #view .plBtn{display:none!important}`;
  document.head.appendChild(s);
  uiSetEdit(UIX.edit);
  renderAll();
})();
