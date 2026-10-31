/* =========================================================
   bldview.js — 건물 안 보기 (공장 지도에서 건물 더블클릭)
   - 한 화면에 층을 가로 띠로 (위가 높은 층), 반은 간단한 박스 (종류 아이콘 · 이름 · 전압) → 누르면 분전반 도면
   - [✎ 편집]에서 박스를 끌어서 배치, 다른 층 띠로 끌면 층도 바뀜, 겹치면 옆으로 비켜 놓음 · [겹침 정리] [자동 배치]
   - 배치·층은 S.cfg.bv[동] 에 저장 (백업 포함). 처음 층은 '위치 도면'의 층 정보로
   - 오른쪽 현황표: 수전·받는 곳·배전반·ACB·MCC·분전반·UPS·비상부하·중요 부하·층별
   ========================================================= */

const BV = {b: '', drag: null, rows: null};
const BV_PT = {MDB: 1, MCC: 1, PNL: 1, UPS: 1};                // 박스로 그리는 종류

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

/* ---------- 층 띠 배치 ---------- */
const BV_W = 1100, BV_LW = 92, BV_BX = 168, BV_BY = 50, BV_G = 12, BV_PAD = 12;   // 전체 폭 · 층 이름 칸 · 박스 · 간격
const BV_ORD = {MDB: 0, MCC: 1, UPS: 2, PNL: 3};
const BV_VC = v => { const x = pV(v); return x >= 1000 ? '#ea580c' : x >= 440 ? '#7c3aed' : x >= 380 ? '#2563eb' : x >= 220 ? '#0d9488' : '#64748b'; };
const bvHit = (a, b) => a.x < b.x + BV_BX + BV_G / 2 && b.x < a.x + BV_BX + BV_G / 2 && a.y < b.y + BV_BY + BV_G / 2 && b.y < a.y + BV_BY + BV_G / 2;
// 빈자리 찾기: (x,y)부터 오른쪽 → 다음 줄
function bvFree(x, y, taken) {
  const maxX = BV_W - BV_LW - BV_BX - BV_PAD;
  for (let g = 0; g < 400; g++) {
    if (!taken.some(t => bvHit({x, y}, t))) return {x, y};
    x += BV_BX + BV_G; if (x > maxX) { x = BV_PAD; y += BV_BY + BV_G; }
  }
  return {x, y};
}
// 한 층(f, '' = 층 미지정)의 박스 자리: 저장된 자리 먼저, 나머지는 종류·전압 순으로 빈자리에
function bvBand(bld, f, c) {
  const P = bvPanels(bld).filter(n => bvFloorOf(n, c) === f);
  const fixed = [], auto = [];
  P.forEach(n => { const p = c.pos[n.id]; (p && p.x != null ? fixed : auto).push(n); });
  const taken = fixed.map(n => ({n, x: c.pos[n.id].x, y: c.pos[n.id].y, fixed: 1}));
  auto.sort((a, b) => BV_ORD[a.type] - BV_ORD[b.type] || pV(effV(b)) - pV(effV(a)) || label(a).localeCompare(label(b)));
  let cx = BV_PAD, cy = BV_PAD;
  auto.forEach(n => { const q = bvFree(cx, cy, taken); taken.push({n, ...q}); cx = q.x; cy = q.y; });
  const H = Math.max(BV_BY + BV_PAD * 2, ...taken.map(t => t.y + BV_BY + BV_PAD));
  return {items: taken, H};
}
// 종류 아이콘 (배전반·MCC·분전반·UPS)
function bvIcon(t, x, y, c) {
  if (t === 'MDB') return `<g transform="translate(${x},${y})"><rect x="1" y="1" width="26" height="30" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M10 1v30M18 1v30" stroke="${c}" stroke-width="1.6"/><path d="M4 8h3M12 8h3M20 8h3M4 14h3M12 14h3M20 14h3" stroke="${c}" stroke-width="2"/></g>`;
  if (t === 'MCC') return `<g transform="translate(${x},${y})"><rect x="1" y="1" width="26" height="30" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M1 8h26M1 15h26M1 22h26" stroke="${c}" stroke-width="1.6"/><circle cx="22" cy="4.5" r="1.5" fill="${c}"/><circle cx="22" cy="11.5" r="1.5" fill="${c}"/><circle cx="22" cy="18.5" r="1.5" fill="${c}"/><circle cx="22" cy="26" r="1.5" fill="${c}"/></g>`;
  if (t === 'UPS') return `<g transform="translate(${x},${y})"><rect x="1" y="6" width="23" height="20" rx="3" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="24" y="12" width="3" height="8" fill="${c}"/><path d="M14 9l-5 8h5l-2 7 6-9h-5z" fill="${c}"/></g>`;
  return `<g transform="translate(${x},${y})"><rect x="1" y="3" width="26" height="26" rx="2" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="5" y="7" width="18" height="3" fill="${c}"/>${[13, 19, 25].map(yy => `<rect x="5" y="${yy - 1}" width="7" height="3.5" rx="1" fill="${c}"/><rect x="16" y="${yy - 1}" width="7" height="3.5" rx="1" fill="${c}"/>`).join('')}</g>`;
}
function bvBoxSvg(t, x, y) {
  const n = t.n, v = effV(n) || '전압?', vc = BV_VC(v), K = pvKindOf(n), sel = n.id === UI.sel, C = kids(n.id).filter(k => !isSlot(k));
  const em = C.some(k => effSrc(k) === 'E'), im = C.some(k => k.imp) || n.imp;
  return `<g class="bvN" data-bvn="${esc(n.id)}" transform="translate(${x},${y})" style="cursor:${UIX.edit ? 'grab' : 'pointer'}"><title>${esc(pathOf(n).map(label).join(' › '))}\n${UIX.edit ? '끌기: 배치 · ' : ''}누르면 분전반 도면</title>
    <rect width="${BV_BX}" height="${BV_BY}" rx="7" fill="#fff" stroke="${sel ? '#f59e0b' : K.c}" stroke-width="${sel ? 3.5 : 1.6}"/>
    <rect width="6" height="${BV_BY}" rx="3" fill="${vc}"/>
    ${bvIcon(n.type === 'PNL' && /UPS/i.test(n.name || '') ? 'UPS' : n.type, 12, 9, K.c)}
    <text x="46" y="21" font-size="13" font-weight="bold" fill="#0f172a">${esc(sdFit(label(n), BV_BX - 52, 13))}</text>
    <text x="46" y="38" font-size="11" fill="#64748b"><tspan fill="${K.c}" font-weight="bold">${esc(K.l)}</tspan> · <tspan fill="${vc}" font-weight="bold">${esc(v)}</tspan></text>
    ${em ? `<circle cx="${BV_BX - 10}" cy="10" r="4" fill="#dc2626"><title>비상 회로 있음</title></circle>` : ''}${im ? `<circle cx="${BV_BX - (em ? 20 : 10)}" cy="10" r="4" fill="#f59e0b"><title>중요 부하 있음</title></circle>` : ''}</g>`;
}
function bvSvg(bld, c) {
  const F = c.floors.slice().sort((a, b) => bvLv(b) - bvLv(a));
  const un = bvPanels(bld).some(n => !bvFloorOf(n, c));
  const rows = [...F, ...(un || UIX.edit ? [''] : [])].map(f => ({f, ...bvBand(bld, f, c)}));
  let y = 0; rows.forEach(r => { r.top = y; y += r.H; });
  BV.rows = rows;   // 끌어 놓을 때 어느 층인지 찾는 데 씀
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" id="bvSvg" viewBox="0 0 ${BV_W} ${y}" font-family="Malgun Gothic,sans-serif">`];
  rows.forEach((r, i) => {
    const cnt = t => r.items.filter(x => x.n.type === t).length;
    const sum = [['MDB', '배전'], ['MCC', 'MCC'], ['UPS', 'UPS'], ['PNL', '분전']].filter(([t]) => cnt(t)).map(([t, l]) => `${l} ${cnt(t)}`).join(' · ');
    o.push(`<g class="bvRow" data-bvf="${esc(r.f)}"><rect x="0" y="${r.top}" width="${BV_W}" height="${r.H}" fill="${r.f ? (i % 2 ? '#f8fafc' : '#fff') : '#fff7ed'}"/>
      <line x1="0" y1="${r.top + r.H}" x2="${BV_W}" y2="${r.top + r.H}" stroke="#94a3b8" stroke-width="2"/>
      <rect x="0" y="${r.top}" width="${BV_LW}" height="${r.H}" fill="${r.f ? '#262f7d' : '#f59e0b'}"/>
      <text x="${BV_LW / 2}" y="${r.top + r.H / 2 + (sum ? -2 : 7)}" text-anchor="middle" font-size="${r.f ? 24 : 14}" font-weight="bold" fill="#fff">${r.f ? esc(r.f) : '층 미지정'}</text>
      ${sum ? `<text x="${BV_LW / 2}" y="${r.top + r.H / 2 + 16}" text-anchor="middle" font-size="10.5" fill="${r.f ? '#c7d2fe' : '#fff'}">${esc(sum)}</text>` : ''}
      ${r.items.length ? '' : `<text x="${BV_LW + 20}" y="${r.top + r.H / 2 + 5}" font-size="13" fill="#94a3b8">${UIX.edit ? '여기로 박스를 끌어다 놓으세요' : '이 층에 놓인 반이 없어요'}</text>`}</g>`);
  });
  rows.forEach(r => r.items.forEach(t => o.push(bvBoxSvg(t, BV_LW + t.x, r.top + t.y))));
  o.push('</svg>');
  return o.join('');
}
// 겹침 정리: 지금 보이는 순서(위→아래, 왼→오른)대로 빈틈없이 다시 채움
function bvTidy(bld, c) {
  (BV.rows || []).forEach(r => {
    const A = r.items.slice().sort((a, b) => a.y - b.y || a.x - b.x), taken = [];
    let cx = BV_PAD, cy = BV_PAD;
    A.forEach(t => { const q = bvFree(cx, cy, taken); taken.push(q); cx = q.x; cy = q.y; c.pos[t.n.id] = {f: r.f || '-', x: q.x, y: q.y}; });
  });
}

/* ---------- 화면 ---------- */
function bvView() {
  const b = MAP_BLD.find(x => x.id === BV.b); if (!b) { BV.b = ''; return mapView(); }
  const bld = mapBldOf(b.id), c = bvCfg(bld), T = bvStats(bld, c), nm = mapName(b);
  const lists = BV.lists = {};
  const L = (k, a) => { lists[k] = a; return k; };
  const R = (k, v, key, sub) => `<span class="bvS"><em>${k}</em>${key && lists[key].length ? `<a data-bvl="${key}">${v}</a>` : v}${sub ? `<small>${sub}</small>` : ''}</span>`;
  const pathTxt = T.PA.paths.slice(0, 4).map(p => { const tr = p.chain.slice().reverse().find(n => n.type === 'TR'), mv = p.chain.slice().reverse().find(n => n.type === 'CB' && pV(effV(n)) >= 1000);
    return `${mv ? esc(label(mv)) + ' → ' : ''}${tr ? `<b>${esc(label(tr))}</b> ${esc(tr.kva || '?')}kVA` : esc(label(p.n))}`; }).join('<br>');
  const kwS = (v, n, tot) => n ? `${Math.round(v * 10) / 10} kW (${n}/${tot}회로 입력)` : 'kW 미입력';
  const vs = [...new Set(bvPanels(bld).map(n => effV(n) || '전압?'))].sort((a, b) => pV(b) - pV(a));
  return `<div class="bvBar"><button data-bva="back">◀ 공장 지도</button><h2>${esc(nm)}</h2>
      <span class="bvLg">${vs.map(v => `<i style="background:${BV_VC(v)}"></i>${esc(v)}`).join('')}<i class="d" style="background:#f59e0b"></i>중요 부하<i class="d" style="background:#dc2626"></i>비상</span><span class="sp"></span>
      ${UIX.edit ? '<button data-bva="tidy">▦ 겹침 정리</button><button data-bva="reset">↺ 자동 배치</button><button data-bva="addf">+ 층 추가</button><button data-bva="delf">− 층 삭제</button>' : ''}
      <button data-bva="csv">📊 이 동 목록 엑셀</button></div>
    ${UIX.edit ? '<div class="bvHint">✎ 편집: 박스를 끌어서 배치 · 다른 층 띠로 끌면 층이 바뀌어요 · 겹치면 옆 빈자리로 비켜요</div>' : ''}
    <div class="bvSum">
      ${R('수전', T.TR.length ? `TR ${T.TR.length}대 · <b>${T.kva.toLocaleString()}</b> kVA` : '—', L('tr', T.TR))}
      ${R('배전반', `<b>${T.mdb.length}</b>`, L('mdb', T.mdb))}${R('ACB', `<b>${T.acb.length}</b>`, L('acb', T.acb))}${R('MCC반', `<b>${T.mcc.length}</b>`, L('mcc', T.mcc))}
      ${R('분전반', `<b>${T.pnl.length}</b>`, L('pnl', T.pnl))}${R('UPS', `<b>${T.ups.length}</b>대`, L('ups', T.ups))}
      ${R('비상부하', `<b>${T.em.length}</b>회로`, L('em', T.em), T.em.length ? kwS(T.emKw, T.emKwN, T.em.length) : '')}
      ${R('전체 회로', `<b>${T.cir.length}</b>`, L('cir', T.cir), kwS(T.kw, T.kwN, T.cir.length))}
      ${R('중요 부하', Object.keys(T.imp).length ? Object.entries(T.imp).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(' · ') : '<b>0</b>', L('imp', T.N.filter(n => n.imp)))}
      ${T.gen.length ? R('비상 전원', T.gen.map(n => `${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}`).join(' · '), L('gen', T.gen)) : ''}
      ${T.PA.paths.length ? `<span class="bvS pa"><em>받는 곳</em>${pathTxt.replace(/<br>/g, ' · ')}</span>` : ''}
    </div>
    <div id="bvW">${bvSvg(bld, c)}</div>`;
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
const bvPt = e => { const sv = document.getElementById('bvSvg'), p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(sv.getScreenCTM().inverse()); };
document.addEventListener('click', e => {
  if (UI.tab !== 'map' || !e.target.closest) return;
  const t = e.target;
  // 공장 지도에서 건물 더블클릭 (첫 클릭에 화면이 다시 그려져서 dblclick 대신 클릭 간격으로)
  const mb = !BV.b && t.closest('#mapSvg .mpB');
  if (mb) { const id = mb.dataset.mpb, now = Date.now();
    if (BV_LC.id === id && now - BV_LC.t < 450) { e.stopPropagation(); BV_LC = {id: '', t: 0}; BV.b = id; MAP.selB = ''; renderView(); return; }
    BV_LC = {id, t: now}; }
  if (t.closest('[data-mpa="inside"]') && MAP.selB) { BV.b = MAP.selB; renderView(); return; }
  const go = t.closest('[data-bvgo]'); if (go) { uiModalClose(); select(go.dataset.bvgo, true); return; }
  if (!BV.b) return;
  if (BV.drag && BV.drag.moved) return;
  const a = t.closest('[data-bva]');
  if (a) {
    const v = a.dataset.bva, bld = mapBldOf(BV.b), c = bvCfg(bld);
    if (v === 'back') { MAP.selB = BV.b; BV.b = ''; }
    else if (v === 'csv') { bvCsv(); return; }
    else if (v === 'tidy') { bvTidy(bld, c); save(); }
    else if (v === 'reset') { if (!confirm('끌어서 옮긴 위치를 지우고 자동 배치로 돌릴까요? (층은 그대로)')) return; Object.values(c.pos).forEach(p => { delete p.x; delete p.y; }); save(); }
    else if (v === 'addf') { const f = (prompt('추가할 층 (예: 4F, B1)', (Math.max(0, ...c.floors.map(bvLv)) + 1) + 'F') || '').trim().toUpperCase(); if (!f) return; if (!c.floors.includes(f)) { c.floors.push(f); c.floors.sort((x, y) => bvLv(x) - bvLv(y)); save(); } }
    else if (v === 'delf') { const f = (prompt(`지울 층 (${c.floors.join(', ')}) — 그 층의 반은 '층 미지정'으로 가요`) || '').trim().toUpperCase(); if (!c.floors.includes(f)) return;
      bvPanels(bld).forEach(n => { if (bvFloorOf(n, c) === f) c.pos[n.id] = {f: '-'}; }); c.floors = c.floors.filter(x => x !== f); save(); }
    renderView(); return;
  }
  const ls = t.closest('[data-bvl]'); if (ls) { bvList(ls.dataset.bvl); return; }
  const n = t.closest('#bvSvg .bvN');
  if (n) { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; saveUI(); select(n.dataset.bvn, true); }   // 박스 = 분전반 도면
}, true);
// 편집 모드: 끌어서 배치 (다른 층 띠로 놓으면 층도 바뀜)
document.addEventListener('pointerdown', e => {
  if (UI.tab !== 'map' || !BV.b || !UIX.edit || e.button !== 0 || !e.target.closest) return;
  const g = e.target.closest('#bvSvg .bvN'); if (!g) return;
  const tr = g.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
  BV.drag = {g, id: g.dataset.bvn, x0: +tr[1], y0: +tr[2], p0: bvPt(e), moved: false}; e.preventDefault();
});
document.addEventListener('pointermove', e => {
  const d = BV.drag; if (!d) return;
  const p = bvPt(e), dx = p.x - d.p0.x, dy = p.y - d.p0.y; if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
  if (!d.moved) { d.moved = true; d.g.parentNode.appendChild(d.g); d.g.style.opacity = '.85'; }   // 맨 위로
  d.g.setAttribute('transform', `translate(${d.x0 + dx},${d.y0 + dy})`);
});
document.addEventListener('pointerup', e => {
  const d = BV.drag; if (!d) return;
  setTimeout(() => { BV.drag = null; }, 0);
  if (!d.moved) return;
  const p = bvPt(e), X = d.x0 + p.x - d.p0.x, Y = d.y0 + p.y - d.p0.y, cy = Y + BV_BY / 2;
  const rows = BV.rows || [], r = rows.find(q => cy >= q.top && cy < q.top + q.H) || (cy < 0 ? rows[0] : rows[rows.length - 1]);
  if (!r) return;
  const bld = mapBldOf(BV.b), c = bvCfg(bld), sn = v => Math.round(v / 10) * 10;
  const want = {x: Math.max(BV_PAD, Math.min(BV_W - BV_LW - BV_BX - BV_PAD, sn(X - BV_LW))), y: Math.max(BV_PAD, sn(Y - r.top))};
  const others = r.items.filter(t => t.n.id !== d.id && t.fixed);   // 옮겨 둔 박스만 피함 (자동 박스는 알아서 비켜감)
  const q = bvFree(want.x, want.y, others);
  c.pos[d.id] = {f: r.f || '-', x: q.x, y: q.y};
  save(); renderView();
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .bvBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
#view .bvBar h2{margin:0 6px;color:#262f7d;font-size:18px}#view .bvBar .sp{flex:1}
#view .bvBar button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12.5px;cursor:pointer}
#view .bvBar button[data-bva="back"]{background:#262f7d;color:#fff;border-color:#262f7d}
#view .bvLg{font-size:12px;color:#475569;display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}#view .bvLg i{display:inline-block;width:6px;height:16px;border-radius:3px;margin-left:8px}#view .bvLg i.d{width:9px;height:9px;border-radius:50%}
#view .bvHint{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 9px;margin-bottom:6px}
#bvW{flex:1;min-width:0;border:2px solid #94a3b8;border-radius:10px;overflow:hidden;background:#fff}#bvW svg{display:block;width:100%;height:auto;user-select:none}
body:not(.ro) #bvW svg{touch-action:none}#bvW .bvN:hover rect:first-child{stroke-width:3}
#view .bvSum{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#view .bvS{display:inline-flex;align-items:baseline;gap:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;font-size:12.5px}
#view .bvS em{font-style:normal;color:#64748b;font-size:11.5px}#view .bvS b{color:#262f7d;font-size:14px}#view .bvS small{color:#94a3b8;font-size:10.5px}
#view .bvS a{color:inherit;cursor:pointer;text-decoration:underline dotted}#view .bvS.pa{font-size:11.5px}
`;
  document.head.appendChild(s);
})();
