/* =========================================================
   panel-mcc.js — MCC반 회로도 (실제 MCC처럼)
   - 왼쪽 인입반(메인 차단기) + 오른쪽으로 세로 섹션이 가로로 이어짐
   - 섹션마다 유닛(서랍)이 위에서 아래로: 번호 · 손잡이 · 표시등 · 부하명 · 정격/kW
   - 유닛 순서 = 번호 순, 1번 섹션 위→아래 다음 2번 섹션… · [단 수]로 섹션당 유닛 수 (자동 / 4~10)
   - 종류가 MCC이거나, 이름에 MCC가 들어간 분전반에 적용 · 클릭·더블클릭(이름 입력)은 분전반과 같음
   ========================================================= */

const pvIsMcc = h => !!h && (h.type === 'MCC' || (h.type === 'PNL' && /MCC/i.test(h.name || '')));
const PV_MCC_SZ = {s: {UW: 150, UH: 44, fs: 11}, m: {UW: 180, UH: 56, fs: 12.5}, l: {UW: 220, UH: 70, fs: 14}};
const pvMccSp = n => /^\s*(spare|예비)\s*$/i.test(n.name || '');   // MCC는 'P-101(예비)' 같은 예비 펌프가 많아서 이름이 SPARE/예비 뿐일 때만
const pvMccNo = n => { const m = String(n.no || '').match(/\d+/); return m ? +m[0] : 9999; };
// 섹션당 유닛 수: 저장한 값 → 자동 (7개 안팎으로 고르게)
function pvMccRows(h, n) { const r = parseInt(h.mccR); if (r >= 2) return r; if (n <= 6) return Math.max(n, 3); return Math.ceil(n / Math.ceil(n / 7)); }

function pvMccSvg(h) {
  const Z = PV_MCC_SZ[S.cfg.pvSz] || PV_MCC_SZ.m, UW = Z.UW, UH = Z.UH, fs = Z.fs;
  const C = kids(h.id).slice().sort((a, b) => pvMccNo(a) - pvMccNo(b)), R = pvMccRows(h, C.length), cols = Math.max(1, Math.ceil(C.length / R));
  const IW = 130, X0 = 30, TOP = 118, SH = R * UH + 34, W = Math.max(760, X0 * 2 + IW + cols * (UW + 6)), H = TOP + SH + 58;
  const K = {l: 'MCC반', c: '#7c3aed'}, mp = Math.max(3, Math.min(4, parseInt(h.poles) || 3));
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Malgun Gothic,sans-serif">`,
    `<defs><linearGradient id="pvMu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9dcd5"/><stop offset="1" stop-color="#c3c6bf"/></linearGradient><linearGradient id="pvM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f3f46"/><stop offset="1" stop-color="#111113"/></linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="#fff"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="8" fill="#a8ada4" stroke="${K.c}" stroke-width="5"/>`];
  // 명판 · 수평 모선
  const sub = [h.rating ? `MAIN ${pvAmp(h)}` : '', `유닛 ${C.filter(n => !isSlot(n)).length}`, `섹션 ${cols}`].filter(Boolean).join(' · ');
  o.push(`<rect x="${X0}" y="24" width="${W - X0 * 2}" height="58" rx="4" fill="#9ea39a" stroke="#6b7068"/>`,
    `<rect x="${X0 + 10}" y="31" width="76" height="20" rx="10" fill="${K.c}"/><text x="${X0 + 48}" y="45" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">MCC반</text>`,
    `<rect x="${W / 2 - 160}" y="30" width="320" height="46" rx="4" fill="${K.c}"/><text x="${W / 2}" y="55" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff">${esc(pvFit(label(h), 300, 18))}</text><text x="${W / 2}" y="70" text-anchor="middle" font-size="11" fill="#ede9fe">${esc(sub)}</text>`,
    `<text x="${W - X0 - 10}" y="45" text-anchor="end" font-size="10.5" fill="#1f2937">● 운전 ● 정지 ○ 트립</text><text x="${W - X0 - 10}" y="61" text-anchor="end" font-size="10.5" fill="#1f2937">유닛 순서 = 번호 순 (위 → 아래 → 다음 섹션)</text>`);
  [['#92400e', 0], ['#18181b', 1], ['#9ca3af', 2]].forEach(([c, i]) => o.push(`<rect x="${X0 + 8}" y="${92 + i * 7}" width="${W - X0 * 2 - 16}" height="4" fill="${c}"/>`));
  o.push(`<text x="${X0 + 10}" y="${TOP - 3}" font-size="9.5" fill="#1f2937">수평 모선 L1 · L2 · L3</text>`);
  // 인입반: 메인 차단기
  const ix = X0;
  o.push(`<rect x="${ix}" y="${TOP}" width="${IW}" height="${SH}" fill="url(#pvMu)" stroke="#6b7068"/><text x="${ix + IW / 2}" y="${TOP + 18}" text-anchor="middle" font-size="11" font-weight="bold" fill="#374151">인입</text>`);
  const mw = 22 * mp + 18, mx = ix + (IW - mw) / 2, my = TOP + 32, mh = Math.min(110, SH - 60);
  o.push(`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="4" fill="url(#pvM)" stroke="#000"/><text x="${mx + mw / 2}" y="${my + 14}" text-anchor="middle" font-size="9" fill="#e5e7eb" font-weight="bold">MAIN</text>`);
  for (let i = 0; i < mp; i++) { const sx = mx + 11 + i * 22; o.push(`<rect x="${sx}" y="${my + 22}" width="15" height="${Math.round(mh * .38)}" rx="2" fill="#09090b"/><rect x="${sx + 3}" y="${my + 24}" width="9" height="${Math.round(mh * .16)}" rx="2" fill="#f4f4f5"/>`); }
  o.push(`<text x="${mx + mw / 2}" y="${my + mh - 8}" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">${esc((h.rating ? pvAmp(h) + ' ' : '') + mp + 'P')}</text>`);
  const up = par(h); if (up) o.push(`<text x="${ix + IW / 2}" y="${my + mh + 18}" text-anchor="middle" font-size="10" fill="#374151">← ${esc(pvFit(label(up), IW - 14, 10))}</text>`);
  // 섹션 · 유닛
  if (!C.length) o.push(`<text x="${ix + IW + 30}" y="${TOP + 40}" font-size="13" fill="#1f2937">유닛이 없어요 – 위쪽 [+ …] 버튼으로 추가하세요</text>`);
  for (let c = 0; c < cols; c++) {
    const sx = ix + IW + 6 + c * (UW + 6);
    o.push(`<rect x="${sx}" y="${TOP}" width="${UW}" height="${SH}" fill="#8f948b" stroke="#6b7068"/><text x="${sx + UW / 2}" y="${TOP + 18}" text-anchor="middle" font-size="11" font-weight="bold" fill="#f8fafc">섹션 ${c + 1}</text>`);
  }
  C.forEach((n, i) => {
    const c = Math.floor(i / R), r = i % R, x = ix + IW + 6 + c * (UW + 6) + 4, y = TOP + 28 + r * UH, w = UW - 8, uh = UH - 4, sel = n.id === UI.sel;
    if (isSlot(n)) {   // 빈 자리 = 덮개판
      o.push(`<g class="pvr" data-id="${esc(n.id)}" style="cursor:pointer"><title>빈 자리 (유닛 없음)</title><rect data-card="1" x="${x}" y="${y}" width="${w}" height="${uh}" rx="2" fill="${sel ? '#e0e7ff' : '#b4b8b0'}" stroke="${sel ? '#262f7d' : '#8a8f87'}" stroke-dasharray="4 3"/>
        <circle cx="${x + 8}" cy="${y + 8}" r="2" fill="#6b7068"/><circle cx="${x + w - 8}" cy="${y + uh - 8}" r="2" fill="#6b7068"/><text x="${x + w / 2}" y="${y + uh / 2 + 4}" text-anchor="middle" font-size="${fs - 1}" fill="#f1f5f9">빈 자리</text></g>`);
      return;
    }
    const sp = pvMccSp(n), todo = !sp && (!String(n.name || '').trim() || /라벨\s*x/i.test(n.name || '')), kc = kids(n.id).length;
    const kr = Math.min(uh * .32, 13), kx = x + 22 + kr - 8, ky = y + uh / 2, tx = x + 34 + kr, tw = x + w - tx - 6;
    const spec = [pvAmp(n), n.poles ? pvPoles(n) + 'P' : '', n.kw ? n.kw + 'kW' : ''].filter(Boolean).join(' · ');
    const nm = n.name ? n.name : '(이름 없음)', [l1, l2] = uh >= 48 ? sdWrap(nm, tw, fs) : [pvFit(nm, tw, fs), ''];
    const fill = sel ? '#262f7d' : sp ? '#c9ccc5' : todo ? '#fde7c8' : 'url(#pvMu)', tc = sel ? '#fff' : sp ? '#6b7280' : todo ? '#9a3412' : '#111827';
    o.push(`<g class="pvr" data-id="${esc(n.id)}" style="cursor:pointer"><title>${esc(label(n))}${spec ? ' · ' + esc(spec) : ''} — 클릭: 선택 · 더블클릭: 이름 입력</title>
      <rect x="${x}" y="${y}" width="${w}" height="${uh}" rx="2" fill="${fill}" stroke="${sel ? '#262f7d' : '#7b8077'}"${sp && !sel ? ' stroke-dasharray="4 3"' : ''}/>
      <rect x="${x + 3}" y="${y + 3}" width="16" height="14" rx="3" fill="${sel ? '#fff' : K.c}"/><text x="${x + 11}" y="${y + 13.5}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="${sel ? K.c : '#fff'}">${esc(n.no || i + 1)}</text>
      <circle cx="${kx}" cy="${ky + 3}" r="${kr}" fill="#4b5563" stroke="#1f2937"/><path d="M${kx - kr * .7} ${ky + 3 + kr * .4}L${kx + kr * .7} ${ky + 3 - kr * .4}" stroke="#e5e7eb" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="${x + 6}" cy="${y + uh - 7}" r="2.4" fill="${sp ? '#9ca3af' : '#16a34a'}"/><circle cx="${x + 12}" cy="${y + uh - 7}" r="2.4" fill="${sp ? '#9ca3af' : '#dc2626'}"/><circle cx="${x + 18}" cy="${y + uh - 7}" r="2.4" fill="#f8fafc" stroke="#6b7280" stroke-width=".5"/>
      <rect data-card="1" x="${tx - 3}" y="${y + 2}" width="${tw + 6}" height="${uh - 4}" rx="2" fill="transparent"/>
      <text x="${tx}" y="${y + (l2 ? fs + 3 : uh / 2 + (spec ? -1 : fs * .36))}" font-size="${fs}" font-weight="${sel || todo ? 'bold' : 'normal'}" fill="${tc}">${esc(l1)}</text>
      ${l2 ? `<text x="${tx}" y="${y + fs * 2 + 5}" font-size="${fs}" fill="${tc}">${esc(l2)}</text>` : ''}
      ${spec ? `<text x="${tx}" y="${y + uh - 5}" font-size="${fs - 2}" fill="${sel ? '#c7d2fe' : '#4b5563'}">${esc(pvFit(spec, tw, fs - 2))}</text>` : ''}
      ${kc ? `<g data-open="${esc(n.id)}" style="cursor:pointer"><title>하위 ${kc}개 열기</title><circle cx="${x + w - 10}" cy="${y + 10}" r="7" fill="#0f766e"/><path d="M${x + w - 12} ${y + 6.5}L${x + w - 6.5} ${y + 10}L${x + w - 12} ${y + 13.5}Z" fill="#fff"/></g>` : ''}</g>`);
  });
  o.push('</svg>');
  return o.join('');
}

// 회로도 탭에 연결: MCC면 MCC 그림 · 위쪽에 [단 수] 버튼
(function () {
  const _svg = pvSvg; pvSvg = function (h) { return pvIsMcc(h) ? pvMccSvg(h) : _svg(h); };
  const _can = pvCan; pvCan = function (h) { return (h && h.type === 'MCC') || _can(h); };
  const _html = pvHtml; pvHtml = function (h) {
    const s = _html(h); if (!pvIsMcc(h)) return s;
    const cur = parseInt(h.mccR) || 0, seg = `<span class="seg" title="섹션 하나에 들어가는 유닛 수"><button disabled style="cursor:default;background:#f8fafc;color:#64748b">단</button>${[0, 4, 5, 6, 7, 8, 10].map(v => `<button data-pvmr="${v}"${v === cur ? ' class="on"' : ''}>${v || '자동'}</button>`).join('')}</span>`;
    return s.replace('<span class="seg">', seg + '<span class="seg">');
  };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-pvmr]'); if (!b) return;
    const h = byId(PV_HOST); if (!h) return;
    const v = +b.dataset.pvmr; if (v) h.mccR = v; else delete h.mccR;
    save(); renderView();
  });
})();
