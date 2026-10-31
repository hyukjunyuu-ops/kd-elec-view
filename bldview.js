/* =========================================================
   bldview.js — 건물 안 보기 (공장 지도에서 건물 더블클릭)
   - 층(1F, 2F …)마다 그 층의 배전반·MCC반·분전반·UPS를 전압별 색 상자로
   - 처음엔 전압별로 묶어서 자동 배치 → [✎ 편집]에서 끌어서 옮기기·크기 바꾸기·층 정하기·층 추가/삭제
   - 상자를 누르면 그 반의 분전반 도면(결선도)으로
   - 배치는 S.cfg.bv[동] 에 저장 (백업 포함). 처음 층은 '위치 도면'의 층 정보로 채움
   ========================================================= */

const BV = {b: '', f: '', drag: null};
const BV_PT = {MDB: 1, MCC: 1, PNL: 1, UPS: 1};                // 상자로 그리는 종류
const BV_BW = 1000, BV_BD = 560, BV_IW = 132, BV_IH = 58;      // 층 판 크기 · 기본 상자 크기
const BV_VC = v => { const x = pV(v); return x >= 1000 ? '#ea580c' : x >= 440 ? '#7c3aed' : x >= 380 ? '#2563eb' : x >= 220 ? '#0d9488' : '#64748b'; };
const BV_TL = {MDB: '배전반', MCC: 'MCC반', PNL: '분전반', UPS: 'UPS'};

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

/* ---------- 배치 (자동 + 저장된 위치) ---------- */
function bvLayout(bld, f) {
  const c = bvCfg(bld), P = bvPanels(bld).filter(n => bvFloorOf(n, c) === f);
  const groups = {};
  P.forEach(n => { const v = effV(n) || '전압 미지정'; (groups[v] = groups[v] || []).push(n); });
  const keys = Object.keys(groups).sort((a, b) => pV(b) - pV(a)), ord = t => t === 'MDB' ? 0 : t === 'MCC' ? 1 : t === 'UPS' ? 2 : 3;
  const out = [], headers = [], gx = 14, gy = 14;
  let x = 20, y = 46;
  keys.forEach(v => {   // 자동: 전압별 묶음을 줄 단위로 (배전반 → MCC → UPS → 분전반)
    const A = groups[v].sort((a, b) => ord(a.type) - ord(b.type) || label(a).localeCompare(label(b)));
    if (x > 20) { x = 20; y += BV_IH + gy + 26; }
    headers.push({v, x, y: y - 8});
    A.forEach(n => {
      if (x + BV_IW > BV_BW - 10) { x = 20; y += BV_IH + gy; }
      const p = c.pos[n.id];
      out.push({n, v, ...(p && p.x != null ? {x: p.x, y: p.y, w: p.w || BV_IW, h: p.h || BV_IH, fixed: 1} : {x, y, w: BV_IW, h: BV_IH})});
      x += BV_IW + gx;
    });
  });
  // 직접 옮긴 게 있으면 자동 묶음 제목은 아직 자동인 상자가 있는 전압만
  const hs = out.some(o => o.fixed) ? headers.filter(h => out.some(o => !o.fixed && o.v === h.v)) : headers;
  return {items: out, headers: hs, D: Math.max(BV_BD, ...out.map(o => o.y + o.h + 20))};
}

/* ---------- 그림 ---------- */
function bvBox(o, flat) {
  const n = o.n, c = BV_VC(o.v), C = kids(n.id).filter(k => !isSlot(k)).length, sel = n.id === UI.sel;
  const w = o.w, h = o.h, fs = Math.max(10, Math.min(14, w / 9)), hb = Math.min(16, h / 3);
  return `<g class="bvN" data-bvn="${esc(n.id)}" transform="translate(${o.x},${o.y})" style="cursor:${UIX.edit && flat ? 'move' : 'pointer'}"><title>${esc(pathOf(n).map(label).join(' › '))}\n누르면 분전반 도면</title>
    <rect width="${w}" height="${h}" rx="6" fill="#fff" stroke="${sel ? '#f59e0b' : c}" stroke-width="${sel ? 4 : 2}"/>
    <rect width="${w}" height="${hb}" rx="6" fill="${c}"/><rect y="${hb - 6}" width="${w}" height="6" fill="${c}"/>
    <text x="7" y="${hb - 4}" font-size="10" font-weight="bold" fill="#fff">${esc(BV_TL[n.type] || n.type)} · ${esc(o.v)}</text>
    ${flat ? `<text x="${w / 2}" y="${h / 2 + 10}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="#0f172a">${esc(sdFit(label(n), w - 10, fs))}</text>
    <text x="${w / 2}" y="${h - 6}" text-anchor="middle" font-size="9.5" fill="#64748b">${C ? '회로 ' + C : ''}</text>` : ''}
    ${flat && UIX.edit ? `<rect class="bvRz" x="${w - 12}" y="${h - 12}" width="12" height="12" fill="${c}" opacity=".6" style="cursor:nwse-resize"/>` : ''}</g>`;
}
// 여러 층을 비스듬히 쌓은 그림 (상자는 판 위에 · 이름은 바로 세워서)
function bvStackSvg(bld, c) {
  const F = c.floors.slice().sort((a, b) => bvLv(a) - bvLv(b)), K = .5, FF = .42, gap = 210;
  const Ls = F.map(f => bvLayout(bld, f)), D = Math.max(...Ls.map(L => L.D));
  const SW = Math.round(BV_BW + D * K + 240), SH = Math.round(D * FF + gap * (F.length - 1) + 110);
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" id="bvSvg" viewBox="0 0 ${SW} ${SH}" font-family="Malgun Gothic,sans-serif"><rect width="${SW}" height="${SH}" fill="#f1f5f9"/>`], labels = [];
  F.forEach((f, i) => {   // 아래층부터 그려서 위층이 앞에 옴
    const oy = SH - 50 - D * FF - i * gap, ox = 170, L = Ls[i];
    const at = (x, y) => [ox + x + y * K, oy + y * FF];
    o.push(`<g class="bvF" data-bvf="${esc(f)}" style="cursor:pointer"><g transform="matrix(1 0 ${K} ${FF} ${ox} ${oy})">
      <rect x="0" y="0" width="${BV_BW}" height="${D}" rx="10" fill="#fff" stroke="#94a3b8" stroke-width="3"/>
      ${L.items.map(it => bvBox(it, false)).join('')}</g>`);
    // 전체 층에서는 배전반·MCC·UPS 이름만 크게 (분전반은 색 상자로만)
    L.items.filter(it => it.n.type !== 'PNL').forEach(it => { const [X, Y] = at(it.x + it.w / 2, it.y + it.h / 2);
      o.push(`<text x="${X}" y="${Y + 7}" text-anchor="middle" font-size="20" font-weight="bold" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="5" pointer-events="none">${esc(sdFit(label(it.n), 150, 20))}</text>`); });
    if (!L.items.length) { const [X, Y] = at(BV_BW / 2, D / 2); o.push(`<text x="${X}" y="${Y}" text-anchor="middle" font-size="16" fill="#94a3b8">이 층에 놓인 반이 없어요</text>`); }
    o.push('</g>');
    const [lx, ly] = at(0, D), ct = t => L.items.filter(it => it.n.type === t).length;
    const sum = [['MDB', '배전'], ['MCC', 'MCC'], ['UPS', 'UPS'], ['PNL', '분전']].filter(([t]) => ct(t)).map(([t, l]) => `${l} ${ct(t)}`).join(' · ') || '비어 있음';
    labels.push(`<g class="bvFL" data-bvf="${esc(f)}" style="cursor:pointer"><title>누르면 ${esc(f)}만 크게</title><rect x="${lx - 160}" y="${ly - 46}" width="148" height="56" rx="8" fill="#262f7d"/>
      <text x="${lx - 86}" y="${ly - 20}" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff">${esc(f)}</text>
      <text x="${lx - 86}" y="${ly + 2}" text-anchor="middle" font-size="13" fill="#c7d2fe">${esc(sum)}</text></g>`);
  });
  o.push(...labels, '</svg>');   // 층 이름표는 맨 위에
  return o.join('');
}
// 한 층만 (평평하게 · 편집 모드에서 끌기·크기)
function bvFloorSvg(bld, f) {
  const L = bvLayout(bld, f);
  return `<svg xmlns="http://www.w3.org/2000/svg" id="bvSvg" class="flat" viewBox="0 0 ${BV_BW} ${L.D}" font-family="Malgun Gothic,sans-serif">
    <rect class="bvBg" width="${BV_BW}" height="${L.D}" fill="#fff"/>
    ${UIX.edit ? `<g opacity=".25">${Array.from({length: Math.floor(BV_BW / 50)}, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="${L.D}" stroke="#cbd5e1"/>`).join('')}</g>` : ''}
    ${L.headers.map(h => `<text x="${h.x}" y="${h.y}" font-size="13" font-weight="bold" fill="${BV_VC(h.v)}">● ${esc(h.v)}</text>`).join('')}
    ${L.items.map(it => bvBox(it, true)).join('')}
    ${L.items.length ? '' : `<text x="${BV_BW / 2}" y="${L.D / 2}" text-anchor="middle" font-size="18" fill="#94a3b8">이 층에 놓인 반이 없어요${UIX.edit ? ' — 오른쪽 [층 미지정]에서 [이 층에 놓기]' : ''}</text>`}
  </svg>`;
}

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
function bvView() {
  const b = MAP_BLD.find(x => x.id === BV.b); if (!b) { BV.b = ''; return mapView(); }
  const bld = mapBldOf(b.id), c = bvCfg(bld), T = bvStats(bld, c), nm = mapName(b);
  if (BV.f && !c.floors.includes(BV.f)) BV.f = '';
  const lists = BV.lists = {};
  const L = (k, a) => { lists[k] = a; return k; };
  const R = (k, v, key, sub) => `<tr><th>${k}</th><td>${key && lists[key].length ? `<a data-bvl="${key}">${v}</a>` : v}${sub ? `<small>${sub}</small>` : ''}</td></tr>`;
  const pathTxt = T.PA.paths.slice(0, 4).map(p => { const tr = p.chain.slice().reverse().find(n => n.type === 'TR'), mv = p.chain.slice().reverse().find(n => n.type === 'CB' && pV(effV(n)) >= 1000);
    return `${mv ? esc(label(mv)) + ' → ' : ''}${tr ? `<b>${esc(label(tr))}</b> ${esc(tr.kva || '?')}kVA` : esc(label(p.n))}`; }).join('<br>');
  const kwS = (v, n, tot) => n ? `<b>${Math.round(v * 10) / 10}</b> kW <small>(${n}/${tot}회로 입력)</small>` : '<small>kW 미입력</small>';
  const fl = [...c.floors.slice().sort((a, b) => bvLv(b) - bvLv(a)), ''].filter(f => f || Object.values(T.byF['']).some(Boolean)).map(f => { const r = T.byF[f];
    return `<tr${f ? ` data-bvf="${esc(f)}" class="c${BV.f === f ? ' sel' : ''}"` : ''}><td>${f ? esc(f) : '층 미지정'}</td><td>${r.mdb}</td><td>${r.mcc}</td><td>${r.pnl}</td><td>${r.ups}</td><td>${r.imp}</td></tr>`; }).join('');
  const un = bvPanels(bld).filter(n => !bvFloorOf(n, c));
  const tray = BV.f && UIX.edit ? `<h3>층 미지정 (${un.length})</h3><div class="bvTray">${un.map(n => `<div><span style="color:${BV_VC(effV(n))}">●</span> ${esc(label(n))} <small>${esc(BV_TL[n.type] || '')} ${esc(effV(n))}</small><button data-bvput="${esc(n.id)}">이 층에 놓기</button></div>`).join('') || '<div class="muted">모두 층이 정해졌어요</div>'}</div>` : '';
  const vs = [...new Set(bvPanels(bld).map(n => effV(n) || '전압 미지정'))].sort((a, b) => pV(b) - pV(a));
  return `<div class="bvBar"><button data-bva="back">◀ 공장 지도</button><h2>${esc(nm)}${BV.f ? ` · ${esc(BV.f)}` : ''}</h2>
      ${BV.f ? `<button data-bva="all">⇣ 전체 층</button>` : ''}
      <span class="bvLg">${vs.map(v => `<i style="background:${BV_VC(v)}"></i>${esc(v)}`).join(' ')}</span><span class="sp"></span>
      ${UIX.edit ? `${BV.f ? `<button data-bva="reset">↺ 이 층 자동 배치</button><button data-bva="delf">🗑 ${esc(BV.f)} 층 삭제</button>` : ''}<button data-bva="addf">+ 층 추가</button>` : ''}
      <button data-bva="csv">📊 이 동 목록 엑셀</button></div>
    ${UIX.edit ? `<div class="bvHint">✎ 편집: ${BV.f ? '상자를 끌어서 옮기기 · 오른쪽 아래 모서리로 크기 · 상자를 누르면 층 바꾸기' : '층 이름표를 누르면 그 층에서 배치할 수 있어요'}</div>` : ''}
    <div class="bvWrap"><div id="bvW">${BV.f ? bvFloorSvg(bld, BV.f) : bvStackSvg(bld, c)}</div>
    <div class="bvSide">${tray}<h3>${esc(nm)} 현황</h3><table class="bvT">
      ${R('수전', T.TR.length ? `TR ${T.TR.length}대 · <b>${T.kva.toLocaleString()}</b> kVA` : '—', L('tr', T.TR))}
      ${T.PA.paths.length ? `<tr><th>받는 곳</th><td class="pa">${pathTxt}${T.PA.paths.length > 4 ? `<small>외 ${T.PA.paths.length - 4}</small>` : ''}</td></tr>` : ''}
      ${R('배전반', T.mdb.length, L('mdb', T.mdb))}${R('ACB', T.acb.length, L('acb', T.acb))}${R('MCC반', T.mcc.length, L('mcc', T.mcc))}
      ${R('분전반', T.pnl.length, L('pnl', T.pnl))}${R('UPS', T.ups.length ? `<b>${T.ups.length}</b>대` : 0, L('ups', T.ups))}
      ${R('비상부하', T.em.length ? `<b>${T.em.length}</b>회로` : 0, L('em', T.em), T.em.length ? kwS(T.emKw, T.emKwN, T.em.length) : '')}
      ${R('전체 회로', T.cir.length, L('cir', T.cir), kwS(T.kw, T.kwN, T.cir.length))}
      ${R('중요 부하', Object.keys(T.imp).length ? Object.entries(T.imp).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') : 0, L('imp', T.N.filter(n => n.imp)))}
      ${T.gen.length ? R('비상 전원', T.gen.map(n => `${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}`).join(' · '), L('gen', T.gen)) : ''}
    </table>
    <h3>층별</h3><table class="tb bvFT"><thead><tr><th>층</th><th>배전</th><th>MCC</th><th>분전</th><th>UPS</th><th>중요</th></tr></thead><tbody>${fl}</tbody></table></div></div>`;
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
// 상자 누르기: 보기 모드 = 분전반 도면 / 편집 모드 = 층 바꾸기 창
function bvOpen(id) {
  const n = byId(id); if (!n) return;
  if (!UIX.edit) { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; saveUI(); select(id, true); return; }
  const c = bvCfg(mapBldOf(BV.b)), cur = bvFloorOf(n, c);
  uiModal(`<h3>${esc(label(n))}</h3><p>${esc(BV_TL[n.type] || '')} · ${esc(effV(n))}</p>
    <div class="rpRow">층: ${c.floors.map(f => `<button data-bvmv="${esc(f)}" data-id="${esc(id)}" class="${f === cur ? 'on' : ''}">${esc(f)}</button>`).join('')}<button data-bvmv="" data-id="${esc(id)}">층 미지정</button></div>
    <div class="mdlA"><button data-bvgo="${esc(id)}" data-bvdg="1">▦ 분전반 도면 보기</button><button data-mdl="x">닫기</button></div>`);
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
    if (BV_LC.id === id && now - BV_LC.t < 450) { e.stopPropagation(); BV_LC = {id: '', t: 0}; BV.b = id; BV.f = ''; MAP.selB = ''; renderView(); return; }
    BV_LC = {id, t: now}; }
  if (t.closest('[data-mpa="inside"]') && MAP.selB) { BV.b = MAP.selB; BV.f = ''; renderView(); return; }
  const mv = t.closest('[data-bvmv]');
  if (mv) { const c = bvCfg(mapBldOf(BV.b)), id = mv.dataset.id; c.pos[id] = {f: mv.dataset.bvmv || '-'}; save(); uiModalClose(); renderView(); return; }
  const go = t.closest('[data-bvgo]'); if (go) { uiModalClose(); if (go.dataset.bvdg) { UI.tab = 'dg'; S.cfg.pvMode = 'pv'; saveUI(); } select(go.dataset.bvgo, true); return; }
  if (!BV.b) return;
  if (BV.drag && BV.drag.moved) return;
  const a = t.closest('[data-bva]');
  if (a) {
    const v = a.dataset.bva, c = bvCfg(mapBldOf(BV.b));
    if (v === 'back') { MAP.selB = BV.b; BV.b = ''; BV.f = ''; }
    else if (v === 'all') BV.f = '';
    else if (v === 'csv') { bvCsv(); return; }
    else if (v === 'addf') { const f = (prompt('추가할 층 (예: 4F, B1)', (Math.max(0, ...c.floors.map(bvLv)) + 1) + 'F') || '').trim().toUpperCase(); if (!f) return; if (!c.floors.includes(f)) { c.floors.push(f); c.floors.sort((x, y) => bvLv(x) - bvLv(y)); save(); } BV.f = f; }
    else if (v === 'delf') { if (!confirm(`${BV.f} 층을 지울까요? 이 층에 놓인 반은 '층 미지정'으로 가요.`)) return;
      bvPanels(mapBldOf(BV.b)).forEach(n => { if (bvFloorOf(n, c) === BV.f) c.pos[n.id] = {f: '-'}; }); c.floors = c.floors.filter(x => x !== BV.f); save(); BV.f = ''; }
    else if (v === 'reset') { bvPanels(mapBldOf(BV.b)).forEach(n => { const p = c.pos[n.id]; if (p && bvFloorOf(n, c) === BV.f) { delete p.x; delete p.y; delete p.w; delete p.h; } }); save(); }
    renderView(); return;
  }
  const put = t.closest('[data-bvput]'); if (put) { const c = bvCfg(mapBldOf(BV.b)); c.pos[put.dataset.bvput] = {f: BV.f}; save(); renderView(); return; }
  const ls = t.closest('[data-bvl]'); if (ls) { bvList(ls.dataset.bvl); return; }
  const n = t.closest('.bvN');
  if (n && !t.closest('.bvRz')) { if (BV.f || !UIX.edit) bvOpen(n.dataset.bvn); else { BV.f = t.closest('[data-bvf]').dataset.bvf; renderView(); } return; }
  const f = t.closest('[data-bvf]'); if (f && f.dataset.bvf) { BV.f = BV.f === f.dataset.bvf ? '' : f.dataset.bvf; renderView(); }
}, true);
// 편집 모드 · 한 층 보기에서 끌기 / 크기
document.addEventListener('pointerdown', e => {
  if (UI.tab !== 'map' || !BV.b || !BV.f || !UIX.edit || e.button !== 0 || !e.target.closest) return;
  const g = e.target.closest('#bvSvg .bvN'); if (!g) return;
  const it = bvLayout(mapBldOf(BV.b), BV.f).items.find(o => o.n.id === g.dataset.bvn); if (!it) return;
  BV.drag = {g, it, rz: !!e.target.closest('.bvRz'), p0: bvPt(e), moved: false}; e.preventDefault();
});
document.addEventListener('pointermove', e => {
  const d = BV.drag; if (!d) return;
  const p = bvPt(e), dx = p.x - d.p0.x, dy = p.y - d.p0.y; if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
  d.moved = true;
  if (d.rz) { const r = d.g.querySelector('rect'); r.setAttribute('width', Math.max(70, d.it.w + dx)); r.setAttribute('height', Math.max(36, d.it.h + dy)); }
  else d.g.setAttribute('transform', `translate(${d.it.x + dx},${d.it.y + dy})`);
});
document.addEventListener('pointerup', e => {
  const d = BV.drag; if (!d) return;
  setTimeout(() => { BV.drag = null; }, 0);
  if (!d.moved) return;
  const p = bvPt(e), dx = p.x - d.p0.x, dy = p.y - d.p0.y, c = bvCfg(mapBldOf(BV.b)), sn = v => Math.round(v / 10) * 10;   // 10 단위로 맞춤
  const it = d.it;
  c.pos[it.n.id] = {f: BV.f, x: sn(d.rz ? it.x : Math.max(0, it.x + dx)), y: sn(d.rz ? it.y : Math.max(0, it.y + dy)),
    w: d.rz ? sn(Math.max(70, it.w + dx)) : it.w, h: d.rz ? sn(Math.max(36, it.h + dy)) : it.h};
  save(); renderView();
});

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .bvBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
#view .bvBar h2{margin:0 6px;color:#262f7d;font-size:18px}#view .bvBar .sp{flex:1}
#view .bvBar button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12.5px;cursor:pointer}
#view .bvBar button[data-bva="back"]{background:#262f7d;color:#fff;border-color:#262f7d}
#view .bvLg{font-size:12px;color:#475569;display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}#view .bvLg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-left:6px}
#view .bvHint{font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 9px;margin-bottom:6px}
#view .bvWrap{display:flex;gap:10px;align-items:flex-start}
#bvW{flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff}#bvW svg{display:block;width:100%;height:auto;user-select:none}
body:not(.ro) #bvW svg.flat{touch-action:none}
#bvW .bvFL:hover rect{fill:#3b47a8}#bvW .bvN:hover rect:first-child{stroke-width:4}
#view .bvSide{width:300px;flex:none;font-size:12.5px}#view .bvSide h3{margin:4px 0 6px;color:#262f7d;font-size:14px}
#view .bvTray{max-height:230px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px}
#view .bvTray div{display:flex;align-items:center;gap:5px;padding:5px 8px;border-bottom:1px solid #f1f5f9}#view .bvTray small{color:#94a3b8}
#view .bvTray button{margin-left:auto;padding:2px 8px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:5px;font-size:11px;cursor:pointer;white-space:nowrap}
table.bvT{width:100%;border-collapse:collapse}table.bvT th{text-align:left;color:#64748b;font-weight:normal;width:68px;padding:5px 4px;vertical-align:top;border-bottom:1px solid #f1f5f9}
table.bvT td{padding:5px 4px;border-bottom:1px solid #f1f5f9}table.bvT td small{display:block;color:#94a3b8;font-size:10.5px}
table.bvT a{color:#1d4ed8;cursor:pointer;text-decoration:underline dotted}table.bvT td.pa{font-size:11.5px;line-height:1.6}
table.bvFT td,table.bvFT th{text-align:center}table.bvFT td:first-child,table.bvFT th:first-child{text-align:left}
#mdl .rpRow button.on{background:#262f7d;color:#fff;border-color:#262f7d}
body.mob #view .bvWrap{flex-direction:column}body.mob #view .bvSide{width:auto}`;
  document.head.appendChild(s);
})();
