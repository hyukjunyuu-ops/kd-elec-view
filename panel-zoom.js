/* =========================================================
   panel-zoom.js — 회로도(분전반·MCC반·배전반) Ctrl + 휠 확대/축소
   - 마우스 있는 곳을 기준으로 확대 · 확대하면 그림 칸이 스크롤됨
   - 위 막대에 [🔍 150% · 맞춤] → 누르면 원래(화면 맞춤)
   ========================================================= */
const PVZ = {z: 0};   // 0 = 화면 맞춤
function pvZApply() {
  const W = document.getElementById('pvW'), s = W && W.querySelector('svg'); if (!s) return;
  const bar = document.querySelector('#view .pvBar'); let b = bar && bar.querySelector('[data-pvz]');
  if (!PVZ.z) { W.classList.remove('zm'); s.style.width = ''; if (b) b.remove(); return; }
  const w0 = s.viewBox.baseVal.width || s.width.baseVal.value;
  W.classList.add('zm'); s.style.width = Math.round(w0 * PVZ.z) + 'px';
  if (bar && !b) { b = document.createElement('button'); b.dataset.pvz = '1'; bar.appendChild(b); }
  if (b) b.textContent = `🔍 ${Math.round(PVZ.z * 100)}% · 맞춤`;
}
document.addEventListener('wheel', e => {
  if (UI.tab !== 'dg' || !(e.ctrlKey || e.metaKey) || !e.target.closest || !e.target.closest('#pvW')) return;
  e.preventDefault();
  const W = document.getElementById('pvW'), s = W.querySelector('svg'); if (!s) return;
  const w0 = s.viewBox.baseVal.width || s.width.baseVal.value, cur = PVZ.z || s.getBoundingClientRect().width / w0;
  const nz = Math.max(.3, Math.min(4, cur * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
  // 마우스 아래 점이 그대로 있게
  const r = s.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  const wr = W.getBoundingClientRect();
  PVZ.z = nz; pvZApply();
  const r2 = s.getBoundingClientRect();
  W.scrollLeft += (r2.left + fx * r2.width) - e.clientX; W.scrollTop += (r2.top + fy * r2.height) - e.clientY;
}, {passive: false});
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-pvz]')) { PVZ.z = 0; pvZApply(); } });
// 회로도를 다시 그리면 배율 다시 적용
(function () {
  const _h = pvHtml; pvHtml = function (h) { setTimeout(pvZApply, 0); return _h(h); };
  const s = document.createElement('style');
  s.textContent = `#pvW.zm{max-width:none;overflow:auto;max-height:calc(100vh - 230px);border:1px solid #e2e8f0;border-radius:8px}#pvW.zm svg{max-width:none}
#view .pvBar [data-pvz]{border:1px solid #262f7d;background:#eef2ff;color:#262f7d;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:600}`;
  document.head.appendChild(s);
})();
