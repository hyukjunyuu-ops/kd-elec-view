/* =========================================================
   mobile.js — 핸드폰 화면 (폭 760px 이하에서 자동)
   - 아래쪽 [🌲 계통] [🗺 화면] [ℹ 정보] 로 한 번에 한 화면
   - 트리에서 항목을 누르면 정보로, 정보에서 [회로도]·[단선도에서 보기]
   - 동 줄·탭은 옆으로 밀어서, 그림은 손가락으로 이동·확대
   ========================================================= */

const MB = {on: false, view: 'main'};
const mbMQ = window.matchMedia('(max-width: 760px)');

function mbSet(v) {
  MB.view = v;
  document.body.dataset.mv = v;
  const hv = v === 'main' && UI.tab === 'plan' ? 'plan' : v;   // 위치(도면) 화면이면 📍에 불
  document.querySelectorAll('#mbNav button').forEach(b => b.classList.toggle('on', b.dataset.mv === hv));
  if (v === 'main') setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 30);   // 그림 높이 다시 맞춤
  if (v === 'field' && typeof fdRender === 'function') fdRender();
  window.scrollTo(0, 0);
}
function mbApply() {
  const was = MB.on;
  MB.on = mbMQ.matches;
  if (was !== MB.on) try { SD.z = 0; } catch (e) {}   // 화면 크기가 바뀌면 단선도 다시 맞춤
  document.body.classList.toggle('mob', MB.on);
  if (MB.on && !document.body.dataset.mv) mbSet('field');   // 핸드폰 첫 화면 = 현장
}
// 정보 화면(보기 모드 속성창) 위에 붙는 바로가기
function mbJump(n) {
  if (!MB.on || !n) return '';
  const box = FP_BOX[n.type] || n.type === 'MDB' || kids(n.id).length;
  return `<div class="mbJump">${box ? `<button data-mbgo="dg">▦ 회로도</button><button data-mbfd="${esc(n.id)}">📋 현장에서 입력</button>` : ''}<button data-mbgo="sld">⚡ 단선도에서 보기</button><button data-mbgo="map">🗺 지도</button></div>`;
}

(function () {
  const nav = document.createElement('nav');
  nav.id = 'mbNav';
  nav.innerHTML = '<button data-mv="field">📋<span>현장</span></button><button data-mv="tree">🌲<span>계통</span></button><button data-mv="plan">📍<span>위치</span></button><button data-mv="main">🗺<span>화면</span></button><button data-mv="info">ℹ<span>정보</span></button>';
  document.body.appendChild(nav);
  mbApply(); if (MB.on) renderAll();
  mbMQ.addEventListener('change', () => { mbApply(); renderAll(); });

  document.addEventListener('click', e => {
    const t = e.target; if (!t.closest) return;
    const nb = t.closest('#mbNav [data-mv]');
    if (nb) { if (nb.dataset.mv === 'plan') { UI.tab = 'plan'; saveUI(); renderAll(); mbSet('main'); return; }
      if (nb.dataset.mv === 'main' && UI.tab === 'plan') { UI.tab = 'map'; saveUI(); renderAll(); }
      mbSet(nb.dataset.mv); return; }
    const fg = t.closest('[data-mbfd]'); if (fg && typeof FDS !== 'undefined') { FDS.pid = fg.dataset.mbfd; FDS.ed = ''; fdKeep(); mbSet('field'); return; }
    const go = t.closest('[data-mbgo]');
    if (go) { UI.tab = go.dataset.mbgo; saveUI(); renderAll(); mbSet('main'); return; }
  });
  // 트리·즐겨찾기에서 누르면: 고르기만 (+ 하위 펼치기/접기) → 아래 막대에서 [현장 입력] [정보] [위치] 골라서 이동
  // (터치 실수로 바로 다른 화면으로 넘어가지 않게)
  document.addEventListener('click', e => {
    const t = e.target; if (!MB.on || !t.closest) return;
    const row = t.closest('#tree .trow, #favBox .fv2R, #tree .srow');
    if (row && !t.closest('.tg, .ck, [data-tg], [data-fvf], button')) {
      // 트리가 바로 다시 그려지므로 지금 확인: 트리 줄인지 · 이미 골라져 있던 줄인지 (다시 누르면 접기)
      const inTree = !!row.closest('#tree') && !!row.dataset.id, id = row.dataset.id, was = id === UI.sel;
      setTimeout(() => {
        const n = byId(UI.sel); if (!n) return;
        if (inTree && n.id === id && kids(n.id).length && !UIX.edit) { if (!was || !UI.open.has(n.id)) UI.open.add(n.id); else UI.open.delete(n.id); saveUI(); renderTree(); }
        mbActShow();
        const r = document.querySelector('#tree .trow.sel'), T = document.getElementById('tree'), bar = document.getElementById('mbAct');
        if (r && T && bar && bar.classList.contains('on')) { const rb = r.getBoundingClientRect(), bt = bar.getBoundingClientRect().top; if (rb.bottom > bt - 8) T.scrollTop += rb.bottom - bt + 16; }
      }, 0);
    }
  }, true);
  const bar = document.createElement('div'); bar.id = 'mbAct'; document.body.appendChild(bar);
  window.mbGoField = n => {
    if (typeof FDS !== 'undefined' && n) {
      if (fdIsBox(n)) { FDS.pid = n.id; FDS.ed = ''; fdKeep(); return mbSet('field'); }
      const P = fdLeaf(n) ? pathOf(n).slice(0, -1).reverse().find(fdIsBox) : null;
      if (P) { FDS.pid = P.id; FDS.ed = n.id; fdKeep(); return mbSet('field'); }
    }
    mbSet('info');
  };
  window.mbActShow = () => {
    const n = byId(UI.sel), b = document.getElementById('mbAct'); if (!b) return;
    if (!n || document.body.dataset.mv !== 'tree') { b.classList.remove('on'); return; }
    const box = typeof fdIsBox === 'function' && (fdIsBox(n) || (fdLeaf(n) && pathOf(n).slice(0, -1).some(fdIsBox)));
    b.innerHTML = `<div class="nm"><span class="ty">${esc(tlabel(n))}</span><b>${esc(label(n))}</b><small>${esc(bk(n) || '')}${kids(n.id).length ? ' · 하위 ' + kids(n.id).length : ''}</small></div>
      <div class="bt">${box ? '<button data-mba="field" class="pri">📋 현장 입력</button>' : ''}<button data-mba="info"${box ? '' : ' class="pri"'}>ℹ 정보</button><button data-mba="plan">📍 위치</button></div>`;
    b.classList.add('on');
  };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('#mbAct [data-mba]'); if (!a) return;
    const n = byId(UI.sel), v = a.dataset.mba; document.getElementById('mbAct').classList.remove('on');
    if (v === 'field') return mbGoField(n);
    if (v === 'info') return mbSet('info');
    if (v === 'plan') { UI.tab = 'plan'; saveUI(); renderAll(); mbSet('main'); }
  });
  { const _m = mbSet; mbSet = function (v) { _m.apply(this, arguments); if (typeof mbActShow === 'function') mbActShow(); }; }

  // 정보(보기 모드)에 바로가기 붙이기
  const _fv = uiFormView;
  uiFormView = function (n) { return mbJump(n) + _fv(n); };

  const sa = document.createElement('style');
  sa.textContent = `#mbAct{display:none}body.mob #mbAct.on{display:flex;position:fixed;left:0;right:0;bottom:58px;z-index:61;background:#fff;border-top:1px solid #dde1ea;box-shadow:0 -4px 14px rgba(15,23,42,.12);padding:8px 10px;gap:8px;align-items:center}
body.mob #mbAct .nm{flex:1;min-width:0;display:flex;flex-direction:column}body.mob #mbAct .nm b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}body.mob #mbAct .nm small{color:#64748b;font-size:11.5px}
body.mob #mbAct .ty{font-size:10.5px;color:#475569}body.mob #mbAct .bt{display:flex;gap:6px;flex:none}
body.mob #mbAct button{padding:9px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:10px;font-size:13px;font-weight:600}body.mob #mbAct button.pri{background:#262f7d;color:#fff;border-color:#262f7d}
body.mob[data-mv="tree"] #left{padding-bottom:70px}
body.mob[data-mv="tree"] #tree{padding-bottom:96px;box-sizing:border-box;-webkit-overflow-scrolling:touch}`;
  document.head.appendChild(sa);
  const s = document.createElement('style');
  s.textContent = `
#mbNav{display:none}
body.mob{overflow:hidden}
body.mob header{padding:4px 8px;gap:6px;flex-wrap:nowrap}
body.mob header .ttl small,body.mob #status,body.mob #bkAge{display:none}
body.mob header .ttl b{font-size:14px}body.mob #logo{font-size:14px}
body.mob #bldBar{flex-wrap:nowrap;overflow-x:auto;padding:4px 8px;-webkit-overflow-scrolling:touch}
body.mob #bldBar button{flex:none}
body.mob main{display:block;padding:6px;height:calc(100dvh - 130px);overflow:hidden}
body.mob #left,body.mob #center,body.mob #right{display:none!important;width:auto;height:100%;flex:none}
body.mob[data-mv="tree"] #left{display:flex!important}
body.mob[data-mv="main"] #center{display:flex!important}
body.mob[data-mv="info"] #right{display:block!important}
body.mob #formTog{display:none!important}
body.mob #tabs{overflow-x:auto;flex-wrap:nowrap;padding:0 4px}body.mob #tabs button{flex:none;padding:9px 10px}
body.mob #view{padding:8px}
body.mob #mbNav{display:flex;position:fixed;left:0;right:0;bottom:0;height:58px;background:#fff;border-top:1px solid #dde1ea;z-index:60;box-shadow:0 -2px 10px rgba(15,23,42,.08)}
body.mob #mbNav button{flex:1;border:0;background:none;font-size:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;color:#64748b;border-radius:0}
body.mob #mbNav button{font-size:19px}body.mob #mbNav button span{font-size:11px}body.mob #mbNav button.on{color:#262f7d;background:#eef2ff;font-weight:700}
body.mob .mbJump{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
body.mob .mbJump button{flex:1;min-width:100px;padding:10px 8px;border:1px solid #c7d2fe;background:#eef2ff;color:#262f7d;border-radius:8px;font-size:13px;font-weight:600}
body.mob #tree .trow{padding-top:7px;padding-bottom:7px}
body.mob #mpCard{position:static;width:auto;max-height:none;margin-top:8px;box-shadow:none}
body.mob #view .sdBar h2,body.mob #view .mpBar h2{font-size:15px}
body.mob #view .sdBar .muted,body.mob #view .mpBar .muted{display:none}
body.mob #mFile .mList{position:fixed;left:8px;right:8px;top:48px;min-width:0}
body.mob #mdl .mdlB{width:96vw;padding:14px}
body.mob #toast{left:10px;right:10px;bottom:68px;transform:none;font-size:14px;padding:10px 12px}body.mob #toast #tMsg{flex:1}`;
  document.head.appendChild(s);
  renderForm();
})();
