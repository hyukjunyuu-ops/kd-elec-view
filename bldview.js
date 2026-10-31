/* =========================================================
   bldview.js — 건물 안 보기 (공장 지도에서 건물 더블클릭)
   - 층을 입체로 쌓아서 보여줌: 바닥에 '위치 도면' 탭의 층 도면 이미지, 그 위에 위치 도면에서 찍은 설비
   - 층 이름표를 누르면 그 층만 크게
   - 오른쪽 현황표: 수전(TR) · 배전반 · ACB · MCC · 분전반 · UPS · 비상부하(회로·kW) · 중요 부하 · 층별
   - 층 정보는 '위치 도면' 기준 (찍지 않은 설비는 '층 미지정')
   ========================================================= */

const BV = {b: '', f: ''};                 // 보고 있는 건물 id · 크게 보는 층 이름
const BV_W = 620, BV_K = .55, BV_F = .5, BV_GAP = 150;   // 바닥 폭 · 기울기 · 납작함 · 층 간격
const BV_T = {TR: {c: '#c2410c', s: 'TR'}, MDB: {c: '#1e3a8a', s: '배전'}, MCC: {c: '#7c3aed', s: 'MCC'}, UPS: {c: '#6d28d9', s: 'UPS'},
  PNL: {c: '#0f766e', s: '분전'}, ATS: {c: '#9f1239', s: 'ATS'}, GEN: {c: '#dc2626', s: 'G'}, CB: {c: '#1d4ed8', s: 'ACB'}};
const bvMajor = n => ['TR', 'MDB', 'MCC', 'UPS', 'ATS', 'GEN'].includes(n.type) || (n.type === 'CB' && n.cbk === 'ACB') || n.imp === 'UPS';

// 층 이름 → 정렬 숫자 (지하는 음수)
function bvLv(name) {
  const s = String(name || ''), m = s.match(/(B|지하)\s*(\d+)/i); if (m) return -(+m[2]);
  const k = s.match(/(\d+)\s*(층|F)/i); return k ? +k[1] : 0;
}
// 그 설비가 있는 층 (위치 도면에서 찍은 곳 · 없으면 위쪽 반을 따라감)
function bvFloor(n) { let c = n, g = 0; while (c && g++ < 80) { if (c.floor && S.floors.some(f => f.name === c.floor)) return c.floor; c = par(c); } return ''; }
function bvFloors(bld) {
  const F = S.floors.filter(f => f.bld === bld || S.nodes.some(n => n.floor === f.name && bk(n) === bld)).map(f => f.name);
  return [...new Set(F)].sort((a, b) => bvLv(a) - bvLv(b));
}
function bvImg(f) {   // 층 도면 이미지 (위치 도면 탭과 같은 곳)
  const k = 'F|' + f;
  if (typeof PL === 'undefined') return '';
  if (PL.img[k] === undefined) { PL.img[k] = ''; Store.img.get(k).then(u => { PL.img[k] = u || ''; if (u && UI.tab === 'map' && BV.b) renderView(); }).catch(() => {}); }
  return PL.img[k] || '';
}
const bvAsp = {};   // 도면 가로세로 비율
function bvRatio(f, url) {
  if (!url) return .55;
  if (bvAsp[f] == null) { bvAsp[f] = .55; const im = new Image(); im.onload = () => { bvAsp[f] = im.naturalHeight / im.naturalWidth || .55; if (BV.b) renderView(); }; im.src = url; }
  return bvAsp[f];
}

/* ---------- 현황 ---------- */
function bvStats(bld) {
  const N = S.nodes.filter(n => bk(n) === bld && !isSlot(n)), leaf = n => !kids(n.id).length && (n.type === 'LOAD' || n.type === 'CB') && !ckSpare(n);
  const kw = a => a.reduce((s, n) => s + (parseFloat(n.kw) || 0), 0), kwN = a => a.filter(n => parseFloat(n.kw)).length;
  const TR = N.filter(n => n.type === 'TR'), em = N.filter(n => leaf(n) && effSrc(n) === 'E');
  const ups = N.filter(n => n.type === 'UPS' || n.imp === 'UPS');
  const F = bvFloors(bld), byF = {};
  [...F, ''].forEach(f => { byF[f] = {mdb: 0, pnl: 0, ups: 0, imp: 0, cir: 0}; });
  N.forEach(n => { const f = bvFloor(n), r = byF[f] || byF['']; if (n.type === 'MDB') r.mdb++; if (FP_BOX[n.type]) r.pnl++; if (n.type === 'UPS' || n.imp === 'UPS') r.ups++; if (n.imp) r.imp++; if (leaf(n)) r.cir++; });
  const imp = {}; N.forEach(n => { if (n.imp) imp[n.imp] = (imp[n.imp] || 0) + 1; });
  const PA = typeof mapPaths === 'function' ? mapPaths(bld) : {paths: []};
  return {N, TR, mdb: N.filter(n => n.type === 'MDB'), acb: N.filter(n => n.type === 'CB' && n.cbk === 'ACB'), mcc: N.filter(n => n.type === 'MCC'),
    pnl: N.filter(n => FP_BOX[n.type]), ups, em, emKw: kw(em), emKwN: kwN(em), cir: N.filter(leaf), kw: kw(N.filter(leaf)), kwN: kwN(N.filter(leaf)),
    kva: TR.reduce((s, n) => s + (parseFloat(n.kva) || 0), 0), F, byF, imp, PA, gen: S.nodes.filter(n => FP_SRC[n.type] && (bk(n) === bld || (byId(n.link) && bk(byId(n.link)) === bld)))};
}

/* ---------- 그림: 층을 입체로 쌓기 ---------- */
function bvSvg(bld, F) {
  const show = BV.f ? [BV.f] : (F.length ? F : ['']), big = !!BV.f;
  const W = big ? 900 : BV_W, K = big ? .1 : BV_K, FF = big ? .9 : BV_F;   // 한 층만 볼 땐 거의 위에서 본 모습
  const slabs = show.map(f => { const url = f ? bvImg(f) : '', r = bvRatio(f, url); return {f, url, D: Math.round(W * Math.min(.8, Math.max(.35, r)))}; });
  const H0 = Math.max(...slabs.map(s => s.D)) * FF, gap = big ? 0 : Math.round(H0 * .78);   // 층이 살짝만 겹치게
  const SW = Math.round(W + H0 / FF * K + 190), SH = Math.round(H0 + gap * (slabs.length - 1) + 120);
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" id="bvSvg" viewBox="0 0 ${SW} ${SH}" font-family="Malgun Gothic,sans-serif"><rect width="${SW}" height="${SH}" fill="#f1f5f9"/>`];
  const labels = [];
  // 아래층부터 그려서 위층이 아래층 뒤쪽을 덮게
  slabs.map((s, i) => ({...s, i})).forEach(s => {
    // 가장 아래층(i=0)이 맨 아래, 위층일수록 위로
    const ox = 160, oyS = big ? 40 : SH - 60 - H0 - s.i * gap + (H0 - s.D * FF);
    const T = `matrix(1 0 ${K} ${FF} ${ox} ${oyS})`;
    const nodes = S.nodes.filter(n => s.f && n.floor === s.f && n.x !== '' && n.x != null && bk(n) === bld && (bvMajor(n) || FP_BOX[n.type]));
    o.push(`<g class="bvF" data-bvf="${esc(s.f)}" style="cursor:pointer">`,
      `<g transform="${T}">`,
      `<rect x="-8" y="-8" width="${W + 16}" height="${s.D + 16}" fill="#fff" stroke="#94a3b8" stroke-width="2" rx="6"/>`,
      s.url ? `<image href="${s.url}" x="0" y="0" width="${W}" height="${s.D}" preserveAspectRatio="none" opacity=".85"/>` : `<rect x="0" y="0" width="${W}" height="${s.D}" fill="#e2e8f0"/><text x="${W / 2}" y="${s.D / 2}" text-anchor="middle" font-size="22" fill="#94a3b8">${s.f ? '층 도면 이미지 없음' : '층 정보 없음 — 위치 도면 탭에서 층을 만들어 주세요'}</text>`,
      `<rect x="0" y="0" width="${W}" height="${s.D}" fill="#1e3a8a" opacity=".05"/>`,
      '</g>');
    // 설비 (기울어진 바닥 위 점 → 화면 좌표)
    const m = [1, 0, K, FF, ox, oyS];
    const at = (px, py) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]];
    nodes.sort((a, b) => (+a.y) - (+b.y)).forEach(n => {
      const [X, Y] = at(+n.x / 100 * W, +n.y / 100 * s.D), t = BV_T[n.type] || (n.imp === 'UPS' ? BV_T.UPS : BV_T.PNL), maj = bvMajor(n), sel = n.id === UI.sel;
      const lb = maj || big || sel;
      o.push(`<g class="bvN" data-bvn="${esc(n.id)}"><title>${esc(label(n))}</title>`,
        maj ? `<line x1="${X}" y1="${Y}" x2="${X}" y2="${Y - 18}" stroke="${t.c}" stroke-width="2"/><rect x="${X - 17}" y="${Y - 34}" width="34" height="17" rx="4" fill="${t.c}"/><text x="${X}" y="${Y - 21.5}" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">${n.type === 'CB' ? 'ACB' : t.s}</text>`
          : `<circle cx="${X}" cy="${Y}" r="${big ? 6 : 4.5}" fill="${t.c}" stroke="#fff" stroke-width="1.5"/>`,
        sel ? `<circle cx="${X}" cy="${Y}" r="14" fill="none" stroke="#f59e0b" stroke-width="3"/>` : '',
        lb ? `<text x="${X + (maj ? 20 : 8)}" y="${Y - (maj ? 22 : -4)}" font-size="${big ? 12 : 11}" font-weight="${maj ? 'bold' : 'normal'}" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="3.5">${esc(sdFit(n.name || label(n), 130, 11))}</text>` : '', '</g>');
    });
    // 층 이름표
    const [lx, ly] = at(0, s.D);
    const cnt = S.nodes.filter(n => bk(n) === bld && FP_BOX[n.type] && bvFloor(n) === s.f).length;
    o.push('</g>');
    labels.push(`<g class="bvFL" data-bvf="${esc(s.f)}" style="cursor:pointer"><rect x="${lx - 150}" y="${ly - 30}" width="132" height="40" rx="8" fill="${big ? '#262f7d' : '#fff'}" stroke="#262f7d" stroke-width="1.5"/>
      <text x="${lx - 84}" y="${ly - 12}" text-anchor="middle" font-size="15" font-weight="bold" fill="${big ? '#fff' : '#262f7d'}">${esc(s.f ? s.f.replace(bld, '').trim() || s.f : '층 미지정')}</text>
      <text x="${lx - 84}" y="${ly + 3}" text-anchor="middle" font-size="10.5" fill="${big ? '#c7d2fe' : '#64748b'}">분전반 ${cnt}</text></g>`);
  });
  o.push(...labels, '</svg>');   // 층 이름표는 맨 위에
  return o.join('');
}

/* ---------- 화면 ---------- */
function bvView() {
  const b = MAP_BLD.find(x => x.id === BV.b); if (!b) { BV.b = ''; return mapView(); }
  const bld = mapBldOf(b.id), T = bvStats(bld), nm = mapName(b);
  const R = (k, v, list, sub) => `<tr><th>${k}</th><td>${list && list.length ? `<a data-bvl="${list}">${v}</a>` : v}${sub ? `<small>${sub}</small>` : ''}</td></tr>`;
  T.lists = {};
  const L = (key, arr) => { T.lists[key] = arr; return key; };
  BV.lists = T.lists;
  const pathTxt = T.PA.paths.slice(0, 4).map(p => { const tr = p.chain.slice().reverse().find(n => n.type === 'TR'), mv = p.chain.slice().reverse().find(n => n.type === 'CB' && pV(effV(n)) >= 1000);
    return `${mv ? esc(label(mv)) + ' → ' : ''}${tr ? `<b>${esc(label(tr))}</b> ${esc(tr.kva || '?')}kVA` : esc(label(p.n))}`; }).join('<br>');
  const fl = [...T.F, ''].filter(f => f || Object.values(T.byF['']).some(Boolean)).map(f => { const r = T.byF[f];
    return `<tr data-bvf="${esc(f)}" class="c${BV.f === f && f ? ' sel' : ''}"><td>${esc(f ? f.replace(bld, '').trim() || f : '층 미지정')}</td><td>${r.mdb}</td><td>${r.pnl}</td><td>${r.ups}</td><td>${r.imp}</td></tr>`; }).join('');
  const kwS = (v, n, tot) => n ? `<b>${Math.round(v * 10) / 10}</b> kW <small>(${n}/${tot}회로 입력)</small>` : '<small>kW 미입력</small>';
  return `<div class="bvBar"><button data-bva="back">◀ 공장 지도</button><h2>${esc(nm)}</h2>
      ${BV.f ? `<button data-bva="all">⇣ 전체 층 보기</button>` : `<span class="muted">층 이름표를 누르면 그 층만 크게</span>`}
      <span class="sp"></span><button data-bva="csv">📊 이 동 목록 엑셀</button></div>
    <div class="bvWrap"><div id="bvW">${bvSvg(bld, T.F)}</div>
    <div class="bvSide"><h3>${esc(nm)} 현황</h3><table class="bvT">
      ${R('수전', T.TR.length ? `TR ${T.TR.length}대 · <b>${T.kva.toLocaleString()}</b> kVA` : '—', L('tr', T.TR))}
      ${T.PA.paths.length ? `<tr><th>받는 곳</th><td class="pa">${pathTxt}${T.PA.paths.length > 4 ? `<small>외 ${T.PA.paths.length - 4}</small>` : ''}</td></tr>` : ''}
      ${R('배전반', T.mdb.length, L('mdb', T.mdb))}${R('ACB', T.acb.length, L('acb', T.acb))}${T.mcc.length ? R('MCC', T.mcc.length, L('mcc', T.mcc)) : ''}
      ${R('분전반', T.pnl.length, L('pnl', T.pnl))}${R('UPS', T.ups.length ? `<b>${T.ups.length}</b>대` : 0, L('ups', T.ups))}
      ${R('비상부하', T.em.length ? `<b>${T.em.length}</b>회로` : 0, L('em', T.em), T.em.length ? kwS(T.emKw, T.emKwN, T.em.length) : '')}
      ${R('전체 회로', T.cir.length, L('cir', T.cir), kwS(T.kw, T.kwN, T.cir.length))}
      ${R('중요 부하', Object.keys(T.imp).length ? Object.entries(T.imp).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') : 0, L('imp', T.N.filter(n => n.imp)))}
      ${T.gen.length ? R('비상 전원', T.gen.map(n => `${esc(label(n))}${n.kw ? ' ' + esc(n.kw) + 'kW' : ''}`).join(' · '), L('gen', T.gen)) : ''}
    </table>
    <h3>층별</h3><table class="tb bvFT"><thead><tr><th>층</th><th>배전반</th><th>분전반</th><th>UPS</th><th>중요</th></tr></thead><tbody>${fl || '<tr><td colspan="5" class="muted">층 정보 없음 — 위치 도면 탭에서 층 도면을 만들고 설비를 찍어 주세요</td></tr>'}</tbody></table>
    <div class="muted" style="margin-top:6px">층은 '위치 도면' 탭 기준이에요. 분전반 아래 회로는 그 분전반의 층으로 셈.</div></div></div>`;
}
function bvList(key) {
  const A = (BV.lists || {})[key] || [];
  uiModal(`<h3>${esc(mapName(MAP_BLD.find(x => x.id === BV.b)))} · ${A.length}개</h3><div class="mdlS"><table class="tb"><thead><tr><th>층</th><th>종류</th><th>명칭</th><th>사양</th><th>상위</th></tr></thead><tbody>
    ${A.slice(0, 800).map(n => `<tr class="c" data-bvgo="${esc(n.id)}"><td>${esc((bvFloor(n) || '').replace(bk(n), '').trim())}</td><td>${esc(tlabel(n))}</td><td>${esc(label(n))}</td><td>${esc(spec(n))}${n.kw ? ' · ' + esc(n.kw) + 'kW' : ''}</td><td>${esc(par(n) ? label(par(n)) : '')}</td></tr>`).join('')}
    </tbody></table></div><div class="mdlA"><button data-mdl="x">닫기</button></div>`, true);
}
function bvCsv() {
  const b = MAP_BLD.find(x => x.id === BV.b), bld = mapBldOf(b.id);
  const rows = [['층', '종류', '번호', '명칭', '정격', 'kW', '전원', '중요 부하', '상위', '경로']];
  S.nodes.filter(n => bk(n) === bld && !isSlot(n)).forEach(n => rows.push([(bvFloor(n) || '층 미지정'), tlabel(n), n.no || '', n.name || '', spec(n), n.kw || '', SRC[effSrc(n)], n.imp || '', par(n) ? label(par(n)) : '', pathOf(n).slice(0, -1).map(label).join(' › ')]));
  download(new Blob(['﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n')], {type: 'text/csv'}), `${bld}_설비목록_${stamp()}.csv`);
}

/* ---------- 이벤트 ---------- */
// 더블클릭: 첫 클릭에 화면이 다시 그려져서 dblclick이 안 오므로 클릭 간격으로 판단
let BV_LC = {id: '', t: 0};
document.addEventListener('click', e => {
  if (UI.tab !== 'map' || !e.target.closest) return;
  const t = e.target;
  const mb = !BV.b && t.closest('#mapSvg .mpB');
  if (mb) {
    const id = mb.dataset.mpb, now = Date.now();
    if (BV_LC.id === id && now - BV_LC.t < 450) { e.stopPropagation(); BV_LC = {id: '', t: 0}; BV.b = id; BV.f = ''; MAP.selB = ''; renderView(); return; }
    BV_LC = {id, t: now};
  }
  const io = t.closest('[data-mpa="inside"]'); if (io && MAP.selB) { BV.b = MAP.selB; BV.f = ''; renderView(); return; }
  if (!BV.b) return;
  const a = t.closest('[data-bva]');
  if (a) { const v = a.dataset.bva; if (v === 'back') { MAP.selB = BV.b; BV.b = ''; BV.f = ''; } else if (v === 'all') BV.f = ''; else if (v === 'csv') { bvCsv(); return; } renderView(); return; }
  const go = t.closest('[data-bvgo]'); if (go) { uiModalClose(); select(go.dataset.bvgo, true); return; }
  const ls = t.closest('[data-bvl]'); if (ls) { bvList(ls.dataset.bvl); return; }
  const n = t.closest('.bvN'); if (n) { select(n.dataset.bvn, true); return; }
  const f = t.closest('[data-bvf]'); if (f && f.dataset.bvf) { BV.f = BV.f === f.dataset.bvf ? '' : f.dataset.bvf; renderView(); }
}, true);

(function () {
  const s = document.createElement('style');
  s.textContent = `
#view .bvBar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
#view .bvBar h2{margin:0 6px;color:#262f7d;font-size:18px}#view .bvBar .sp{flex:1}
#view .bvBar button{padding:5px 11px;border:1px solid #d6dbe8;background:#fff;border-radius:6px;font-size:12.5px;cursor:pointer}
#view .bvBar button[data-bva="back"]{background:#262f7d;color:#fff;border-color:#262f7d}
#view .bvWrap{display:flex;gap:10px;align-items:flex-start}
#bvW{flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}#bvW svg{display:block;width:100%;height:auto}
#bvW .bvFL:hover rect{fill:#eef2ff}#bvW .bvN{cursor:pointer}
#view .bvSide{width:300px;flex:none;font-size:12.5px}#view .bvSide h3{margin:4px 0 6px;color:#262f7d;font-size:14px}
table.bvT{width:100%;border-collapse:collapse}table.bvT th{text-align:left;color:#64748b;font-weight:normal;width:68px;padding:5px 4px;vertical-align:top;border-bottom:1px solid #f1f5f9}
table.bvT td{padding:5px 4px;border-bottom:1px solid #f1f5f9}table.bvT td small{display:block;color:#94a3b8;font-size:10.5px}
table.bvT a{color:#1d4ed8;cursor:pointer;text-decoration:underline dotted}table.bvT td.pa{font-size:11.5px;line-height:1.6}
table.bvFT td,table.bvFT th{text-align:center}table.bvFT td:first-child,table.bvFT th:first-child{text-align:left}
body.mob #view .bvWrap{flex-direction:column}body.mob #view .bvSide{width:auto}`;
  document.head.appendChild(s);
})();
