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
  document.querySelectorAll('#mbNav button').forEach(b => b.classList.toggle('on', b.dataset.mv === v));
  if (v === 'main') setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 30);   // 그림 높이 다시 맞춤
  window.scrollTo(0, 0);
}
function mbApply() {
  const was = MB.on;
  MB.on = mbMQ.matches;
  if (was !== MB.on) try { SD.z = 0; } catch (e) {}   // 화면 크기가 바뀌면 단선도 다시 맞춤
  document.body.classList.toggle('mob', MB.on);
  if (MB.on && !document.body.dataset.mv) mbSet('main');
}
// 정보 화면(보기 모드 속성창) 위에 붙는 바로가기
function mbJump(n) {
  if (!MB.on || !n) return '';
  const box = FP_BOX[n.type] || n.type === 'MDB' || kids(n.id).length;
  return `<div class="mbJump">${box ? `<button data-mbgo="dg">▦ 회로도</button>` : ''}<button data-mbgo="sld">⚡ 단선도에서 보기</button><button data-mbgo="map">🗺 지도</button></div>`;
}

(function () {
  const nav = document.createElement('nav');
  nav.id = 'mbNav';
  nav.innerHTML = '<button data-mv="tree">🌲<span>계통</span></button><button data-mv="main">🗺<span>화면</span></button><button data-mv="info">ℹ<span>정보</span></button>';
  document.body.appendChild(nav);
  mbApply(); if (MB.on) renderAll();
  mbMQ.addEventListener('change', () => { mbApply(); renderAll(); });

  document.addEventListener('click', e => {
    const t = e.target; if (!t.closest) return;
    const nb = t.closest('#mbNav [data-mv]'); if (nb) { mbSet(nb.dataset.mv); return; }
    const go = t.closest('[data-mbgo]');
    if (go) { UI.tab = go.dataset.mbgo; saveUI(); renderAll(); mbSet('main'); return; }
  });
  // 트리·즐겨찾기에서 항목을 고르면 정보 화면으로 (펼치기 ▸ 누른 건 제외)
  // 트리가 바로 다시 그려지므로 먼저(capture) 확인
  document.addEventListener('click', e => {
    const t = e.target; if (!MB.on || !t.closest) return;
    if (t.closest('#tree .trow, #favBox .fv2R, #tree .srow') && !t.closest('.tg, .ck, [data-tg], [data-fvf], button')) setTimeout(() => mbSet('info'), 0);
  }, true);

  // 정보(보기 모드)에 바로가기 붙이기
  const _fv = uiFormView;
  uiFormView = function (n) { return mbJump(n) + _fv(n); };

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
body.mob #mbNav button span{font-size:11px}body.mob #mbNav button.on{color:#262f7d;background:#eef2ff;font-weight:700}
body.mob .mbJump{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
body.mob .mbJump button{flex:1;min-width:100px;padding:10px 8px;border:1px solid #c7d2fe;background:#eef2ff;color:#262f7d;border-radius:8px;font-size:13px;font-weight:600}
body.mob #tree .trow{padding-top:7px;padding-bottom:7px}
body.mob #mpCard{position:static;width:auto;max-height:none;margin-top:8px;box-shadow:none}
body.mob #view .sdBar h2,body.mob #view .mpBar h2{font-size:15px}
body.mob #view .sdBar .muted,body.mob #view .mpBar .muted{display:none}
body.mob #mFile .mList{position:fixed;left:8px;right:8px;top:48px;min-width:0}
body.mob #mdl .mdlB{width:96vw;padding:14px}`;
  document.head.appendChild(s);
  renderForm();
})();
