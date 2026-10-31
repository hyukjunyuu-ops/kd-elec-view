/* =========================================================
   bldview.js — 건물 안 보기 (공장 지도에서 건물 더블클릭)
   - 그 동의 배전반·MCC반·UPS·분전반 도면을 종류별로 작은 그림으로 모아 보여줌 → 누르면 분전반 도면
   - 층 칩으로 걸러 보기 (층은 '위치 도면' 기준, 예전에 정한 층이 있으면 그것)
   - 오른쪽 현황표: 수전·받는 곳·배전반·ACB·MCC·분전반·UPS·비상부하·중요 부하·층별
   ========================================================= */

const BV = {b: '', f: ''};
const BV_PT = {MDB: 1, MCC: 1, PNL: 1, UPS: 1};                // 도면 모음에 넣는 종류

/* ---------- 저장된 배치 ---------- */
function bvCfg(bld) {
  S.cfg.bv = S.cfg.bv || {};
  const c = S.cfg.bv[bld] = S.cfg.bv[bld] || {floors: null, pos: {}};
  if (!c.floors) {   // 처음: 위치 도면 층에서 1F·2F… 만들기
    const L = S.floors.filter(f => f.bld === bld).map(f => bvFL(f.name)).filter(Boolean);
    c.floors = [...new Set(L)].sort((a, b) => bvLv(a) - bvLv(b));
    if (!c.floors.length) c.floors = ['1F'];
  }
  c.pos = c.pos || {};
  return c;
}
const bvLv = f => { const s = String(f || ''), m = s.match(/^B(\d+)/i); return m ? -(+m[1]) : (parseInt(s) || 0); };
function bvFL(name) {   // '본동 3층' → '3F' · '지하1층' → 'B1'
  const s = String(name || ''), m = s.match(/(B|지하)\s*(\d+)/i); if (m) return 'B' + m[2];
  const k = s.match(/(\d+)\s*(층|F)/i); return k ? k[1] + 'F' : '';
}
const bvPanels = bld => S.nodes.filter(n => BV_PT[n.type] && !isSlot(n) && bk(n) === bld);
// 그 반이 있는 층: 직접 정한 것('-' = 층 미지정) → 위치 도면 층 → 없음
function bvFloorOf(n, c) {
  const p = c.pos[n.id]; if (p && p.f) return c.floors.includes(p.f) ? p.f : '';
  const f = bvFL(n.floor); return f && c.floors.includes(f) ? f : '';
}
// 회로 등은 위쪽 반의 층을 따라감
function bvFloorUp(n, c) { let x = n, g = 0; while (x && g++ < 80) { if (BV_PT[x.type]) { const f = bvFloorOf(x, c); if (f) return f; } x = par(x); } return ''; }

/* ---------- 현황 ---------- */
function bvStats(bld, c) {
  const N = S.nodes.filter(n => bk(n) === bld && !isSlot(n)), leaf = n => !kids(n.id).length && (n.type === 'LOAD' || n.type === 'CB') && !ckSpare(n);
  const kw = a => a.reduce((s, n) => s + (parseFloat(n.kw) || 0), 0), kwN = a => a.filter(n => parseFloat(n.kw)).length;
  const TR = N.filter(n => n.type === 'TR'), em = N.filter(n => leaf(n) && effSrc(n) === 'E'), ups = N.filter(n => n.type === 'UPS' || n.imp === 'UPS');
  const byF = {}; [...c.floors, ''].forEach(f => { byF[f] = {mdb: 0, mcc: 0, pnl: 0, ups: 0, imp: 0}; });
  N.forEach(n => { const r = byF[bvFloorUp(n, c)] || byF['']; if (n.type === 'MDB') r.mdb++; if (n.type === 'MCC') r.mcc++; if (n.type === 'PNL') r.pnl++; if (n.type === 'UPS' || n.imp === 'UPS') r.ups++; if (n.imp) r.imp++; });
  const imp = {}; N.forEach(n => { if (n.imp) imp[n.imp] = (imp[n.imp] || 0) + 1; });
  const PA = typeof mapPaths === 'function' ? mapPaths(bld) : {paths: []};
  return {N, TR, mdb: N.filter(n => n.type === 'MDB'), acb: N.filter(n => n.type === 'CB' && n.cbk === 'ACB'), mcc: N.filter(n => n.type === 'MCC'),
    pnl: N.filter(n => n.type === 'PNL'), ups, em, emKw: kw(em), emKwN: kwN(em), cir: N.filter(leaf), kw: kw(N.filter(leaf)), kwN: kwN(N.filter(leaf)),
    kva: TR.reduce((s, n) => s + (parseFloat(n.kva) || 0), 0), byF, imp, PA,
    gen: S.nodes.filter(n => FP_SRC[n.type] && (bk(n) === bld || (byId(n.link) && bk(byId(n.link)) === bld)))};
}

/* ---------- 화면 ---------- */
const BV_ORD = [['MDB', '배전반'], ['MCC', 'MCC반'], ['UPS', 'UPS'], ['PNL', '분전반']];
function bvGallery(bld, c) {
  const P = bvPanels(bld).filter(n => !BV.f || (BV.f === '-' ? !bvFloorOf(n, c) : bvFloorOf(n, c) === BV.f));
  return BV_ORD.map(([t, l]) => {
    const A = P.filter(n => n.type === t).sort((a, b) => bvLv(bvFloorOf(b, c)) - bvLv(bvFloorOf(a, c)) || label(a).localeCompare(label(b)));
    if (!A.length) return '';
    return `<h3 class="bvSec"><span style="background:${(PV_KIND[t] || {}).c}">${l}</span> ${A.length}</h3><div class="bvGal">${A.map(n => {
      const K = pvKindOf(n), f = bvFloorOf(n, c), C = kids(n.id).filter(k => !isSlot(k));
      const em = C.some(k => effSrc(k) === 'E'), im = C.filter(k => k.imp).length;
      return `<div class="bvCard" data-bvgo="${esc(n.id)}" data-bvdg="1" style="border-color:${K.c}"><div class="bvCH" style="background:${K.c}">${esc(K.l)}<span>${esc(f || '층 미지정')} · ${esc(effV(n) || '')}</span></div>
        <div class="bvTh">${pvSvg(n)}</div>
        <div class="bvCN"><b>${esc(label(n))}</b><small>회로 ${C.length}${im ? ` · 중요 ${im}` : ''}${em ? ' · <i>비상</i>' : ''}</small></div></div>`; }).join('')}</div>`;
  }).join('') || '<div class="empty">이 동에 배전반·분전반이 없어요.</div>';
}
function bvView() {
  const b = MAP_BLD.find(x => x.id === BV.b); if (!b) { BV.b = ''; return mapView(); }
  const bld = mapBldOf(b.id), c = bvCfg(bld), T = bvStats(bld, c), nm = mapName(b);
  if (BV.f && BV.f !== '-' && !c.floors.includes(BV.f)) BV.f = '';
  const lists = BV.lists = {};
  const L = (k, a) => { lists[k] = a; return k; };
  const R = (k, v, key, sub) => `<tr><th>${k}</th><td>${key && lists[key].length ? `<a data-bvl="${key}">${v}</a>` : v}${sub ? `<small>${sub}</small>` : ''}</td></tr>`;
  const pathTxt = T.PA.paths.slice(0, 4).map(p => { const tr = p.chain.slice().reverse().find(n => n.type === 'TR'), mv = p.chain.slice().reverse().find(n => n.type === 'CB' && pV(effV(n)) >= 1000);
    return `${mv ? esc(label(mv)) + ' → ' : ''}${tr ? `<b>${esc(label(tr))}</b> ${esc(tr.kva || '?')}kVA` : esc(label(p.n))}`; }).join('<br>');
  const kwS = (v, n, tot) => n ? `<b>${Math.round(v * 10) / 10}</b> kW <small>(${n}/${tot}회로 입력)</small>` : '<small>kW 미입력</small>';
  const fl = [...c.floors.slice().sort((a, b) => bvLv(b) - bvLv(a)), ''].filter(f => f || Object.values(T.byF['']).some(Boolean)).map(f => { const r = T.byF[f];
    return `<tr data-bvf="${f ? esc(f) : '-'}" class="c${BV.f === (f || '-') ? ' sel' : ''}"><td>${f ? esc(f) : '층 미지정'}</td><td>${r.mdb}</td><td>${r.mcc}</td><td>${r.pnl}</td><td>${r.ups}</td><td>${r.imp}</td></tr>`; }).join('');
  const chips = ['', ...c.floors.slice().sort((a, b) => bvLv(b) - bvLv(a)), '-'].map(f => `<button data-bvf="${f}" class="${BV.f === f ? 'on' : ''}">${f === '' ? '전체' : f === '-' ? '층 미지정' : esc(f)}</button>`).join('');
  return `<div class="bvBar"><button data-bva="back">◀ 공장 지도</button><h2>${esc(nm)}</h2><span class="bvChips">${chips}</span><span class="sp"></span>
      <button data-bva="csv">📊 이 동 목록 엑셀</button></div>
    <div class="bvWrap"><div class="bvMain">${bvGallery(bld, c)}</div>
    <div class="bvSide"><h3>${esc(nm)} 현황</h3><table class="bvT">
      ${R('수전', T.TR.length ? `TR ${T.TR.length}대 · <b>${T.kva.toLocaleString()}</b> kVA` : '—', L('tr', T.TR))}
      ${T.PA.paths.length ? `<tr><th>받는 곳</th><td class="pa">${pathTxt}${T.PA.paths.length > 4 ? `<small>외 ${T.PA.paths.length - 4}</small>` : ''}</td></tr>` : ''}
      ${R('배전반', T.mdb.length, L('mdb', T.mdb))}${R('ACB', T.acb.length, L('acb', T.acb))}${R('MCC반', T.mcc.length, L('mcc', T.mcc))}
      ${R('분전반', T.pnl.length, L('pnl', T.pnl))}${R('UPS', T.ups.length ? `<b>${T.ups.length}</b>대` : 0, L('ups', T.ups))}
      ${R('비상부하', T.em.length ? `<b>${T.em.length}</b>회로` : 0, L('em', T.em), T.em.length ? kwS(T.emKw, T.emKwN, T.em.length) : '')}
      ${R('전체 회로', T.cir.length, L('cir', T.cir), kwS(T.kw, T.kwN, T.cir.length))}
      ${R('중요 부하', Object.keys(T.imp).length ? Object.entries(T.imp).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') : 0, L('imp', T.N.filter(n => n.imp)))}
      ${T.gen.length ? R('비상 전원', T.gen.map(n => `${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}`).join(' · '), L('gen', T.gen)) : ''}
    </table>
    <h3>층별</h3><table class="tb bvFT"><thead><tr><th>층</th><th>배전</th><th>MCC</th><th>분전</th><th>UPS</th><th>중요</th></tr></thead><tbody>${fl}</tbody></table>
    <div class="muted" style="margin-top:6px">층은 '위치 도면' 탭 기준 · 층을 누르면 그 층 반만</div></div></div>`;
}
function bvList(key) {
  const A = (BV.lists || {})[key] || [], c = bvCfg(mapBldOf(BV.b));
  uiModal(`<h3>${esc(mapName(MAP_BLD.find(x => x.id === BV.b)))} · ${A.length}개</h3><div class="mdlS"><table class="tb"><thead><tr><th>층</th><th>종류</th><th>명칭</th><th>사양</th><th>상위</th></tr></thead><tbody>
    ${A.slice(0, 800).map(n => `<tr class="c" data-bvgo="${esc(n.id)}"><td>${esc(bvFloorUp(n, c))}</td><td>${esc(tlabel(n))}</td><td>${esc(label(n))}</td><td>${esc(spec(n))}${n.kw ? ' · ' + esc(n.kw) + 'kW' : ''}</td><td>${esc(par(n) ? label(par(n)) : '')}</td></tr>`).join('')}
    </tbody></table></div><div class="mdlA"><button data-mdl="x">닫기</button></div>`, true);
}
function bvCsv() {
  const bld = mapBldOf(BV.b), c = bvCfg(bld), rows = [['층', '종류', '번호', '명칭', '전압', '정격', 'kW', '전원', '중요 부하', '상위', '경로']];
  S.nodes.filter(n => bk(n) === bld && !isSlot(n)).forEach(n => rows.push([bvFloorUp(n, c) || '층 미지정', tlabel(n), n.no || '', n.name || '', effV(n), spec(n), n.kw || '', SRC[effSrc(n)], n.imp || '', par(n) ? label(par(n)) : '', pathOf(n).slice(0, -1).map(label).join(' › ')]));
  download(new Blob(['﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n')], {type: 'text/csv'}), `${bld}_설비목록_${stamp()}.csv`);
}
/* ---------- 이벤트 ---------- */
let BV_LC = {id: '', t: 0};
document.addEventListener('click', e => {
  if (UI.tab !== 'map' || !e.target.closest) return;
  const t = e.target;
  // 공장 지도에서 건물 더블클릭 (첫 클릭에 화면이 다시 그려져서 dblclick 대신 클릭 간격으로)
  const mb = !BV.b && t.closest('#mapSvg .mpB');
  if (mb) { const id = mb.dataset.mpb, now = Date.now();
    if (BV_LC.id === id && now - BV_LC.t < 450) { e.stopPropagation(); BV_LC = {id: '', t: 0}; BV.b = id; BV.f = ''; MAP.selB = ''; renderView(); return; }
    BV_LC = {id, t: now}; }
  if (t.closest('[data-mpa="inside"]') && MAP.selB) { BV.b = MAP.selB; BV.f = ''; renderView(); return; }
  const go = t.closest('[data-bvgo]'); if (go) { uiModalClose(); if (go.dataset.bvdg) { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; saveUI(); } select(go.dataset.bvgo, true); return; }
  if (!BV.b) return;
  const a = t.closest('[data-bva]');
  if (a) { const v = a.dataset.bva; if (v === 'back') { MAP.selB = BV.b; BV.b = ''; BV.f = ''; } else if (v === 'csv') { bvCsv(); return; } renderView(); return; }
  const ls = t.closest('[data-bvl]'); if (ls) { bvList(ls.dataset.bvl); return; }
  const f = t.closest('[data-bvf]'); if (f) { BV.f = BV.f === f.dataset.bvf ? '' : f.dataset.bvf; renderView(); }
}, true);

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .bvBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
#view .bvBar h2{margin:0 6px;color:#262f7d;font-size:18px}#view .bvBar .sp{flex:1}
#view .bvBar button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12.5px;cursor:pointer}
#view .bvBar button[data-bva="back"]{background:#262f7d;color:#fff;border-color:#262f7d}
#view .bvChips{display:flex;flex-wrap:wrap;gap:4px}#view .bvChips button{border-radius:999px;padding:3px 11px}#view .bvChips button.on{background:#262f7d;color:#fff;border-color:#262f7d}
#view .bvWrap{display:flex;gap:12px;align-items:flex-start}#view .bvMain{flex:1;min-width:0}
#view .bvSec{margin:10px 0 6px;font-size:14px;color:#334155;display:flex;align-items:center;gap:6px}#view .bvSec span{color:#fff;font-size:12px;padding:2px 10px;border-radius:999px}
#view .bvGal{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
#view .bvCard{border:2px solid;border-radius:10px;overflow:hidden;background:#fff;cursor:pointer;transition:transform .1s}#view .bvCard:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(15,23,42,.15)}
#view .bvCH{color:#fff;font-size:11px;font-weight:700;padding:3px 8px;display:flex;justify-content:space-between}#view .bvCH span{font-weight:normal;opacity:.9}
#view .bvTh{height:150px;overflow:hidden;position:relative;background:#f1f5f9}#view .bvTh svg{width:100%;height:auto;display:block;pointer-events:none}
#view .bvTh:after{content:'';position:absolute;left:0;right:0;bottom:0;height:40px;background:linear-gradient(transparent,#fff)}
#view .bvCN{padding:5px 8px}#view .bvCN b{display:block;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#view .bvCN small{color:#64748b;font-size:11px}#view .bvCN i{color:#dc2626;font-style:normal;font-weight:700}
#view .bvSide{width:290px;flex:none;font-size:12.5px}#view .bvSide h3{margin:4px 0 6px;color:#262f7d;font-size:14px}
table.bvT{width:100%;border-collapse:collapse}table.bvT th{text-align:left;color:#64748b;font-weight:normal;width:68px;padding:5px 4px;vertical-align:top;border-bottom:1px solid #f1f5f9}
table.bvT td{padding:5px 4px;border-bottom:1px solid #f1f5f9}table.bvT td small{display:block;color:#94a3b8;font-size:10.5px}
table.bvT a{color:#1d4ed8;cursor:pointer;text-decoration:underline dotted}table.bvT td.pa{font-size:11.5px;line-height:1.6}
table.bvFT td,table.bvFT th{text-align:center}table.bvFT td:first-child,table.bvFT th:first-child{text-align:left}
body.mob #view .bvWrap{flex-direction:column}body.mob #view .bvSide{width:auto}body.mob #view .bvGal{grid-template-columns:repeat(2,1fr)}`;
  document.head.appendChild(s);
})();
