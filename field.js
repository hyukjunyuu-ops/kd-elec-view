/* =========================================================
   field.js — 핸드폰 '현장' 화면 (현장 조사하면서 바로 입력)
   - 동 → 층 → 반 목록 (미조사 수 표시) · 검색
   - 반 화면: 회로를 큰 줄로 (번호 순 = 분전반 왼쪽 1·3·5 / 오른쪽 2·4·6)
   - 회로를 누르면 아래 입력 시트: 부하명 · 정격/극수 원터치 · 중요 · SPARE · 빈 자리 · 메모
     [저장하고 다음 ▶]로 회로를 위에서부터 차례로
   - [📍 위치] 층 도면 · [📍 위치 찍기] 도면을 눌러 바로 저장 · [📄 부하도면] · [▦ 그림]
   - 핸드폰(폭 760px 이하)에서만. PC 화면은 그대로
   ========================================================= */

const FDS = {bld: '', fl: null, pid: '', q: '', ed: ''};   // ed = 입력 시트에 열린 회로
try { Object.assign(FDS, JSON.parse(localStorage.getItem('ckd_elec2_fd') || '{}'), {ed: '', q: ''}); } catch (e) {}
const fdKeep = () => { try { localStorage.setItem('ckd_elec2_fd', JSON.stringify({bld: FDS.bld, fl: FDS.fl, pid: FDS.pid})); } catch (e) {} };
const FD_R = ['15', '20', '30', '40', '50', '60', '75', '100'], FD_P = ['1', '2', '3', '4'];

// 반 = 배전반·MCC반·분전반·UPS (TR 제외) · 회로 = 끝 항목(부하·차단기)
const fdIsBox = n => n && (n.type === 'MDB' || n.type === 'MCC' || n.type === 'PNL' || n.type === 'UPS');
const fdLeaf = n => (n.type === 'LOAD' || n.type === 'CB') && !kids(n.id).length;
const fdTodo = n => fdLeaf(n) && !isSlot(n) && !ckSpare(n) && ckNoLabel(n);   // 미조사 (라벨X·이름 없음)
const fdNo = n => { const m = String(n.no || '').match(/\d+/); return m ? +m[0] : 9999; };
// 그 반의 회로: 바로 아래 + 차단기 밑 부하까지 (다른 반 밑은 제외), 번호 순
function fdCircuits(P) {
  const o = [], w = n => kids(n.id).forEach(k => { if (fdIsBox(k)) { o.push(k); return; } if (kids(k.id).length && k.type === 'CB') { o.push(k); w(k); return; } o.push(k); });
  w(P);
  return o.sort((a, b) => fdNo(a) - fdNo(b) || (a.type === b.type ? 0 : fdIsBox(a) ? 1 : -1));
}
const fdFloorOf = (n, c) => typeof bvFloorOf === 'function' ? bvFloorOf(n, c) : '';
function fdBlds() { return S.blds.filter(b => S.nodes.some(n => fdIsBox(n) && bk(n) === b)); }

/* ---------- 화면 ---------- */
function fdView() {
  const P = FDS.pid && byId(FDS.pid);
  return P && fdIsBox(P) ? fdPanelV(P) : fdListV();
}
// ① 동 → 층 → 반 목록
function fdListV() {
  const B = fdBlds(); if (!B.includes(FDS.bld)) FDS.bld = B.includes('본동') ? '본동' : B[0] || '';
  let h = `<div class="fdTop"><input id="fdQ" type="search" placeholder="🔍 반·부하 이름 검색" value="${esc(FDS.q)}" autocomplete="off"></div>`;
  if (FDS.q.trim()) return h + fdSearchH(FDS.q.trim());
  if (!FDS.bld) return h + '<div class="fdEmp">아직 반 데이터가 없어요.<br>[📁 파일 → 백업 불러오기]로 백업을 넣어 주세요.</div>';
  const c = bvCfg(FDS.bld), P = S.nodes.filter(n => fdIsBox(n) && !isSlot(n) && bk(n) === FDS.bld);
  const fl = [...c.floors.slice().sort((a, b) => bvLv(a) - bvLv(b)), ''].filter(f => P.some(n => fdFloorOf(n, c) === f));
  if (FDS.fl == null || !fl.includes(FDS.fl)) FDS.fl = fl[0] != null ? fl[0] : '';
  const L = P.filter(n => fdFloorOf(n, c) === FDS.fl).sort((a, b) => String(a.name || label(a)).localeCompare(String(b.name || label(b)), 'ko', {numeric: true}));
  const todo = n => fdCircuits(n).filter(fdTodo).length;
  h += `<div class="fdChips">${B.map(b => `<button data-fdb="${esc(b)}"${b === FDS.bld ? ' class="on"' : ''}>${esc(b)}</button>`).join('')}</div>
    <div class="fdChips fl">${fl.map(f => { const t = P.filter(n => fdFloorOf(n, c) === f).reduce((s, n) => s + todo(n), 0);
      return `<button data-fdf="${esc(f)}"${f === FDS.fl ? ' class="on"' : ''}>${esc(f || '층 미지정')}${t ? `<i>${t}</i>` : ''}</button>`; }).join('')}</div>
    <div class="fdList">${L.map(n => { const C = fdCircuits(n).filter(fdLeaf), t = C.filter(fdTodo).length, p = typeof bvBoxPar === 'function' ? bvBoxPar(n) : par(n);
      return `<button class="fdRow" data-fdp="${esc(n.id)}">${fdPic(n, 26)}<span class="t"><b>${esc(label(n))}</b><small>${esc(effV(n) || '')}${p ? ' · ' + esc(label(p)) + '에서' : ''}</small></span>
        <span class="r">${t ? `<em class="w">⚠ ${t}</em>` : C.length ? '<em class="ok">✔</em>' : ''}<small>회로 ${C.length}</small></span></button>`; }).join('') || '<div class="fdEmp">이 층에 반이 없어요.</div>'}</div>`;
  return h;
}
function fdSearchH(q) {
  const k = q.toLowerCase(), A = S.nodes.filter(n => !isSlot(n) && (fdIsBox(n) || fdLeaf(n)) && (label(n) + ' ' + (n.name || '') + ' ' + (n.no || '')).toLowerCase().includes(k)).slice(0, 60);
  return `<div class="fdList">${A.map(n => { const P = fdIsBox(n) ? n : pathOf(n).slice(0, -1).reverse().find(fdIsBox);
    return `<button class="fdRow" data-fdp="${esc(P ? P.id : '')}"${fdIsBox(n) ? '' : ` data-fde="${esc(n.id)}"`}>${fdIsBox(n) ? fdPic(n, 22) : '<span class="ld">◆</span>'}<span class="t"><b>${esc(fdIsBox(n) ? label(n) : (n.no ? n.no + ' ' : '') + (n.name || '(이름 없음)'))}</b>
      <small>${esc(bk(n))}${P && !fdIsBox(n) ? ' · ' + esc(label(P)) : ''}</small></span></button>`; }).join('') || '<div class="fdEmp">찾는 게 없어요.</div>'}</div>`;
}
const fdPic = (n, w) => typeof bvPic === 'function' ? `<svg class="pic" viewBox="0 0 40 54" width="${w}" height="${Math.round(w * 1.35)}">${bvPic(n, 0, 0)}</svg>` : '';
// ② 반 화면: 회로 목록
function fdPanelV(P) {
  const c = bvCfg(bk(P)), f = fdFloorOf(P, c), up = typeof bvBoxPar === 'function' ? bvBoxPar(P) : par(P), C = fdCircuits(P);
  const leaf = C.filter(fdLeaf), todo = leaf.filter(fdTodo).length, placed = P.floor && P.x !== '' && P.x != null;
  const row = n => {
    if (fdIsBox(n)) return `<button class="fdC sub" data-fdp="${esc(n.id)}">${fdPic(n, 18)}<span class="no">${esc(n.no || '')}</span><span class="nm">${esc(n.name || label(n))}</span><span class="sp">하위 반 ›</span></button>`;
    if (!fdLeaf(n)) return `<div class="fdC grp"><span class="no">${esc(n.no || '')}</span><span class="nm">${esc(label(n))}</span><span class="sp">${esc(spec(n))}</span></div>`;
    const sl = isSlot(n), sp = ckSpare(n), td = fdTodo(n);
    return `<button class="fdC${sl ? ' slot' : sp ? ' spare' : td ? ' todo' : ''}${FDS.ed === n.id ? ' on' : ''}" data-fde="${esc(n.id)}">
      <span class="no">${esc(n.no || '·')}</span><span class="nm">${sl ? '빈 자리' : td ? `⚠ ${esc(n.name || '이름 없음')}` : esc(n.name)}${n.imp ? ' <i class="st">★</i>' : ''}${n.note ? ' <i class="me">📝</i>' : ''}</span>
      <span class="sp">${sl ? '' : esc(spec(n))}</span></button>`;
  };
  return `<div class="fdHd"><button class="bk" data-fda="back">‹</button>${fdPic(P, 24)}<span class="t"><b>${esc(label(P))}</b>
      <small>${esc(bk(P))}${f ? ' ' + esc(f) : ''} · ${esc(effV(P) || '')}${up ? ' · ' + esc(label(up)) + '에서' : ''}</small></span></div>
    <div class="fdAct"><button data-fda="loc">📍 위치${placed ? '' : ' (안 찍힘)'}</button><button data-fda="put">📍 위치 찍기</button><button data-fda="zone">📄 부하도면</button><button data-fda="dg">▦ 그림</button></div>
    <div class="fdSum">회로 <b>${leaf.length}</b>${todo ? ` · <span class="w">⚠ 미조사 ${todo}</span>` : leaf.length ? ' · <span class="ok">✔ 조사 완료</span>' : ''}${todo ? '<button data-fda="first">⚠ 첫 미조사부터 입력 ▶</button>' : ''}</div>
    <div class="fdCs">${C.map(row).join('') || '<div class="fdEmp">회로가 아직 없어요.</div>'}</div>
    <button class="fdAdd" data-fda="add">+ 회로 추가</button>`;
}
// ③ 입력 시트
function fdSheet() {
  const n = FDS.ed && byId(FDS.ed); if (!n) return '';
  const sl = isSlot(n), r = String(n.rating || ''), p = String(n.poles || '');
  const names = fdNames(n), cats = typeof IMP_CATS !== 'undefined' ? IMP_CATS : [];
  return `<div id="fdSh"><div class="bg" data-fda="close"></div><div class="pn">
    <div class="h"><b>${esc(n.no ? n.no + '번 회로' : '회로')}</b><span class="mu">${esc(label(byId(FDS.pid) || {}))}</span><button data-fda="close">✕</button></div>
    <div class="f2"><label>번호<input id="fdNo" value="${esc(n.no || '')}" inputmode="numeric"></label>
      <label class="w">부하명<input id="fdNm" value="${esc(sl ? '' : fdTodo(n) ? String(n.name || '').replace(/\s*라벨\s*x\s*/i, ' ').replace(/\s+$/, ' ').replace(/^\s+/, '') : n.name || '')}" list="fdDL" placeholder="예: 포장실 조명" enterkeyhint="next"></label></div>
    <datalist id="fdDL">${names.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    ${names.length ? `<div class="sg">${names.slice(0, 8).map(x => `<button data-fdn="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
    <div class="lb">정격 (A)</div><div class="fch">${FD_R.map(v => `<button data-fdr="${v}"${r === v ? ' class="on"' : ''}>${v}</button>`).join('')}<input id="fdR" value="${esc(FD_R.includes(r) ? '' : r)}" placeholder="기타" inputmode="decimal"></div>
    <div class="lb">극수</div><div class="fch">${FD_P.map(v => `<button data-fdpl="${v}"${p === v ? ' class="on"' : ''}>${v}P</button>`).join('')}</div>
    <div class="lb">중요 부하</div><div class="fch">${['', ...cats].map(v => `<button data-fdi="${esc(v)}"${(n.imp || '') === v ? ' class="on"' : ''}>${v ? esc(v) : '아님'}</button>`).join('')}</div>
    <div class="fch ftg"><button data-fdt="spare"${ckSpare(n) ? ' class="on"' : ''}>SPARE (예비)</button><button data-fdt="slot"${sl ? ' class="on"' : ''}>빈 자리 (차단기 없음)</button></div>
    <label class="lb">메모<textarea id="fdMe" rows="2" placeholder="현장 메모 (예: 라벨 떨어짐, 2026.11 확인)">${esc(n.note || '')}</textarea></label>
    <div class="bt"><button data-fda="del" class="dn">삭제</button><span class="sp"></span><button data-fda="save">저장</button><button data-fda="next" class="pri">저장하고 다음 ▶</button></div>
  </div></div>`;
}
// 부하명 추천: 같은 반 → 같은 동에서 자주 쓴 이름
function fdNames(n) {
  const cnt = new Map(), add = (x, w) => { x = String(x || '').trim(); if (!x || /라벨\s*x|spare|예비/i.test(x)) return; cnt.set(x, (cnt.get(x) || 0) + w); };
  const P = byId(FDS.pid); if (P) fdCircuits(P).forEach(k => add(k.name, 3));
  S.nodes.forEach(k => { if (k.type === 'LOAD' && bk(k) === bk(n)) add(k.name, 1); });
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]).filter(x => x !== n.name).slice(0, 40);
}

/* ---------- 그리기 · 저장 ---------- */
function fdRender(keepScroll) {
  const v = document.getElementById('fdV'); if (!v) return;
  const y = keepScroll ? v.scrollTop : 0, q = document.activeElement && document.activeElement.id === 'fdQ';
  v.innerHTML = fdView() + fdSheet();
  v.scrollTop = y;
  if (q) { const i = document.getElementById('fdQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  const on = FDS.ed && v.querySelector('.fdC.on'); if (on && !keepScroll) on.scrollIntoView({block: 'center'});
}
function fdOpen(id) { FDS.ed = id; fdRender(true); const i = document.getElementById('fdNm'); if (i && (!i.value || / $/.test(i.value))) setTimeout(() => { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 50); }   // 미조사면 바로 입력
function fdSave() {
  const n = byId(FDS.ed); if (!n) return false;
  const $v = id => (document.getElementById(id) || {}).value;
  snap('현장 입력');
  n.no = String($v('fdNo') || '').trim();
  const nm = String($v('fdNm') || '').trim(), r = String($v('fdR') || '').trim();
  if (!isSlot(n)) n.name = nm ? nm.replace(/\s*\/\s*$/, '') : n.name || '';
  if (r) n.rating = r;
  n.note = String($v('fdMe') || '').trim(); if (!n.note) delete n.note;
  save(); dirty();
  return true;
}
// 방금 추가하고 아무것도 안 넣은 회로는 닫으면 지움
function fdDropEmpty() {
  const k = FDS.nw && byId(FDS.nw); FDS.nw = '';
  if (k && !String(k.name || '').trim() && !k.rating && !k.poles && !k.note && !k.imp && !isSlot(k)) { S.nodes = S.nodes.filter(x => x.id !== k.id); save(); dirty(); }
}
function fdNext() {
  const P = byId(FDS.pid); if (!P) return;
  const L = fdCircuits(P).filter(fdLeaf), i = L.findIndex(n => n.id === FDS.ed);
  const nx = L[i + 1];
  if (nx) fdOpen(nx.id); else { FDS.ed = ''; fdRender(true); toast('이 반 마지막 회로까지 입력했어요.', false); }
}
// 현장에서 [위치 찍기] → 도면을 누르면 저장하고 현장 화면으로
if (typeof plPutAt === 'function') { const _pp = plPutAt; plPutAt = function () { const r = _pp.apply(this, arguments);
  if (FDS.back && !PL.place && MB.on) { const n = byId(FDS.back); FDS.back = ''; setTimeout(() => { mbSet('field'); toast(`📍 ${n ? label(n) : ''} 위치를 저장했어요.`, false); }, 250); } return r; }; }
// 다른 화면(트리 수정 등) 뒤에도 현장 화면을 새로
const _fdRA = renderAll;
renderAll = function () { _fdRA.apply(this, arguments); if (document.body.dataset.mv === 'field') fdRender(true); };

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest || !t.closest('#fdV')) return;
  const g = s => t.closest(s);
  let b;
  if ((b = g('[data-fdb]'))) { FDS.bld = b.dataset.fdb; FDS.fl = null; fdKeep(); return fdRender(); }
  if ((b = g('[data-fdf]'))) { FDS.fl = b.dataset.fdf; fdKeep(); return fdRender(); }
  if ((b = g('[data-fdp]'))) { if (!b.dataset.fdp) return; FDS.pid = b.dataset.fdp; FDS.q = ''; fdKeep(); UI.sel = FDS.pid; saveUI();
    if (b.dataset.fde) { FDS.ed = b.dataset.fde; } else FDS.ed = ''; return fdRender(); }
  if ((b = g('[data-fde]'))) return fdOpen(b.dataset.fde);
  // 시트 원터치
  const n = FDS.ed && byId(FDS.ed);
  if (n && (b = g('[data-fdn]'))) { document.getElementById('fdNm').value = b.dataset.fdn; return; }
  if (n && (b = g('[data-fdr]'))) { fdSave(); n.rating = b.dataset.fdr; const ri = document.getElementById('fdR'); if (ri) ri.value = ''; save(); return fdRender(true); }
  if (n && (b = g('[data-fdpl]'))) { fdSave(); n.poles = b.dataset.fdpl; save(); return fdRender(true); }
  if (n && (b = g('[data-fdi]'))) { fdSave(); if (b.dataset.fdi) n.imp = b.dataset.fdi; else delete n.imp; save(); return fdRender(true); }
  if (n && (b = g('[data-fdt]'))) { fdSave();
    if (b.dataset.fdt === 'spare') { if (ckSpare(n)) n.name = ''; else { n.name = 'SPARE'; delete n.slot; } }
    else { if (isSlot(n)) { delete n.slot; if (/^x$/i.test(n.no || '')) n.no = ''; if (/^(x|칸\s*채우기|빈칸)$/i.test(n.name || '')) n.name = ''; } else { n.slot = 'E'; n.name = ''; } }
    save(); dirty(); return fdRender(true); }
  if (!(b = g('[data-fda]'))) return;
  const a = b.dataset.fda, P = byId(FDS.pid);
  if (a === 'back') { FDS.pid = ''; FDS.ed = ''; fdKeep(); return fdRender(); }   // 반 목록으로
  if (a === 'close') { fdDropEmpty(); FDS.ed = ''; return fdRender(true); }
  if (a === 'save') { fdSave(); FDS.ed = ''; fdRender(true); return toast('저장했어요.', true); }
  if (a === 'next') { fdSave(); return fdNext(); }
  if (a === 'del') { const x = byId(FDS.ed); if (!x || !confirm(`${x.no || ''} ${x.name || ''} 회로를 지울까요?`)) return; snap('회로 삭제'); S.nodes = S.nodes.filter(k => k.id !== x.id); FDS.ed = ''; save(); dirty(); fdRender(true); return toast('지웠어요.', true); }
  if (a === 'first') { const x = fdCircuits(P).find(fdTodo); if (x) fdOpen(x.id); return; }
  if (a === 'add') { const L = fdCircuits(P).filter(fdLeaf), mx = Math.max(0, ...L.map(fdNo).filter(v => v < 9999));
    snap('회로 추가'); const k = {id: uid(), pid: P.id, type: 'LOAD', no: String(mx + 1), name: ''}; S.nodes.push(k); FDS.nw = k.id; save(); dirty(); return fdOpen(k.id); }
  if (a === 'dg') { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; saveUI(); select(P.id, true); return mbSet('main'); }
  if (a === 'loc' || a === 'zone' || a === 'put') {
    UI.tab = 'plan'; PL.lastSel = null;
    if (a === 'zone') { PL.cur = plZK(P.id, 1); PL.keep = true; }
    if (a === 'put') {   // 그 동·층 도면을 열고 누르면 바로 찍힘
      const c = bvCfg(bk(P)), f = fdFloorOf(P, c), F = S.floors.find(x => (x.bld === bk(P) || x.name.startsWith(bk(P))) && bvFL(x.name) === f);
      if (F) { PL.cur = plFK(F.name); PL.keep = true; }
      PL.place = {ids: [P.id]}; PL.tool = ''; FDS.back = P.id;   // 찍고 나면 현장 화면으로 돌아옴
      toast(F ? `📍 ${F.name} 도면에서 ${label(P)} 자리를 누르세요.` : '📍 위쪽에서 층 도면을 고른 뒤 자리를 누르세요.', false);
    }
    saveUI(); select(P.id, true); return mbSet('main');
  }
});
document.addEventListener('input', e => { if (e.target.id === 'fdQ') { FDS.q = e.target.value; fdRender(); } });
document.addEventListener('keydown', e => { if (e.target.id === 'fdNm' && e.key === 'Enter') { e.preventDefault(); fdSave(); fdNext(); } });

(function () {
  const v = document.createElement('section'); v.id = 'fdV'; document.querySelector('main').appendChild(v);
  if (document.body.dataset.mv === 'field') fdRender();
  const s = document.createElement('style');
  s.textContent = `
#fdV{display:none}
body.mob[data-mv="field"] #fdV{display:block;height:100%;overflow:auto;-webkit-overflow-scrolling:touch;padding-bottom:90px;box-sizing:border-box}
body.mob[data-mv="field"] #bldBar{display:none}
#fdV button{font:inherit;cursor:pointer}
#fdV .fdTop{position:sticky;top:0;z-index:2;background:#f4f6fa;padding:2px 0 8px}
#fdV #fdQ{width:100%;box-sizing:border-box;padding:12px 14px;font-size:16px;border:1.5px solid #c7d2fe;border-radius:12px;background:#fff}
#fdV .fdChips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;-webkit-overflow-scrolling:touch}
#fdV .fdChips button{flex:none;padding:8px 14px;border:1px solid #d6dbe8;background:#fff;border-radius:20px;font-size:14px;color:#334155}
#fdV .fdChips button.on{background:#262f7d;border-color:#262f7d;color:#fff;font-weight:700}
#fdV .fdChips.fl button{font-size:15px;font-weight:700;min-width:58px}#fdV .fdChips i{font-style:normal;background:#f59e0b;color:#fff;border-radius:9px;padding:0 6px;font-size:11px;margin-left:5px}
#fdV .fdList{display:flex;flex-direction:column;gap:6px}
#fdV .fdRow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border:1px solid #e2e8f0;background:#fff;border-radius:12px;min-height:58px}
#fdV .fdRow:active{background:#eef2ff}#fdV .fdRow .t{flex:1;min-width:0;display:flex;flex-direction:column}#fdV .fdRow .t b{font-size:15.5px;color:#0f172a;word-break:keep-all}
#fdV .fdRow .t small,#fdV .fdRow .r small{font-size:12px;color:#64748b}#fdV .fdRow .r{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
#fdV em{font-style:normal;font-weight:700;font-size:13px}#fdV em.w,#fdV .w{color:#c2410c}#fdV em.ok,#fdV .ok{color:#15803d}#fdV .ld{width:22px;text-align:center;color:#15803d}
#fdV .fdEmp{padding:30px 10px;text-align:center;color:#94a3b8;font-size:14px;line-height:1.7}
#fdV .fdHd{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;background:#f4f6fa;padding:2px 0 8px}
#fdV .fdHd .bk{width:42px;height:42px;border:1px solid #d6dbe8;background:#fff;border-radius:10px;font-size:24px;line-height:1;flex:none}
#fdV .fdHd .t{flex:1;min-width:0;display:flex;flex-direction:column}#fdV .fdHd b{font-size:17px;color:#0f172a}#fdV .fdHd small{font-size:12px;color:#64748b}
#fdV .fdAct{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px}#fdV .fdAct button{padding:9px 2px;border:1px solid #c7d2fe;background:#eef2ff;color:#262f7d;border-radius:10px;font-size:12.5px;font-weight:600}
#fdV .fdSum{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13.5px;color:#334155;margin:2px 2px 8px}#fdV .fdSum b{font-size:15px}
#fdV .fdSum button{margin-left:auto;padding:7px 12px;border:0;background:#c2410c;color:#fff;border-radius:18px;font-size:13px;font-weight:700}
#fdV .fdCs{display:flex;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
#fdV .fdC{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:12px 12px;border:0;border-bottom:1px solid #f1f5f9;background:#fff;min-height:50px}
#fdV .fdC:active,#fdV .fdC.on{background:#eef2ff}#fdV .fdC .no{width:30px;flex:none;font-weight:800;color:#262f7d;font-size:15px;text-align:center}
#fdV .fdC .nm{flex:1;min-width:0;font-size:15px;color:#0f172a;word-break:keep-all}#fdV .fdC .sp{flex:none;font-size:12.5px;color:#64748b}
#fdV .fdC.todo{background:#fff7ed}#fdV .fdC.todo .nm{color:#c2410c;font-weight:700}#fdV .fdC.spare .nm{color:#94a3b8}#fdV .fdC.slot .nm{color:#cbd5e1;font-style:italic}
#fdV .fdC.sub{background:#f8fafc}#fdV .fdC.sub .sp{color:#262f7d;font-weight:700}#fdV .fdC.grp{background:#f1f5f9;min-height:36px;padding:6px 12px}#fdV .fdC.grp .nm{font-size:13px;font-weight:700;color:#475569}
#fdV .st{font-style:normal;color:#f59e0b}#fdV .me{font-style:normal}
#fdV .fdAdd{width:100%;margin-top:8px;padding:13px;border:1.5px dashed #94a3b8;background:#fff;border-radius:12px;font-size:15px;color:#334155;font-weight:600}
#fdSh{position:fixed;inset:0;z-index:90}#fdSh .bg{position:absolute;inset:0;background:rgba(15,23,42,.35)}
#fdSh .pn{position:absolute;left:0;right:0;bottom:0;max-height:88vh;overflow:auto;background:#fff;border-radius:16px 16px 0 0;padding:12px 14px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -6px 24px rgba(15,23,42,.2)}
#fdSh .h{display:flex;align-items:center;gap:8px;margin-bottom:8px}#fdSh .h b{font-size:17px}#fdSh .h .mu{flex:1;color:#64748b;font-size:12.5px}#fdSh .h button{border:0;background:#f1f5f9;border-radius:50%;width:34px;height:34px;font-size:16px}
#fdSh .f2{display:flex;gap:8px}#fdSh label{display:flex;flex-direction:column;font-size:12.5px;color:#64748b;gap:3px;width:70px}#fdSh label.w{flex:1;width:auto}
#fdSh input,#fdSh textarea{font-size:16px;padding:10px;border:1.5px solid #cbd5e1;border-radius:10px;box-sizing:border-box;width:100%;font-family:inherit}#fdSh input:focus,#fdSh textarea:focus{border-color:#262f7d;outline:0}
#fdSh .sg{display:flex;gap:5px;overflow-x:auto;padding:6px 0 2px}#fdSh .sg button{flex:none;padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:16px;font-size:13px;color:#334155}
#fdSh .lb{display:block;width:auto;font-size:12.5px;color:#64748b;margin:10px 0 4px}
#fdSh .fch{display:flex;flex-wrap:wrap;gap:5px}#fdSh .fch button{min-width:46px;padding:9px 10px;border:1px solid #d6dbe8;background:#fff;border-radius:10px;font-size:14px;color:#334155}
#fdSh .fch button.on{background:#262f7d;border-color:#262f7d;color:#fff;font-weight:700}#fdSh .fch input{width:76px;padding:8px}
#fdSh .fch.ftg{margin-top:10px}#fdSh .fch.ftg button{flex:1}
#fdSh .bt{display:flex;gap:6px;margin-top:12px;align-items:center}#fdSh .bt .sp{flex:1}#fdSh .bt button{padding:12px 14px;border:1px solid #d6dbe8;background:#fff;border-radius:12px;font-size:15px;font-weight:600}
#fdSh .bt .pri{background:#262f7d;border-color:#262f7d;color:#fff}#fdSh .bt .dn{color:#b91c1c;border-color:#fecaca}`;
  document.head.appendChild(s);
})();
