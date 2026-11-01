/* =========================================================
   panel-lineup.js — 배전반 라인업 회로도 (실제 배전반처럼)
   - ACB도 배전반 한 면(ACB반): ACB 바로 밑 차단기는 그 ACB반 안에
   - ACB 밑 배전반 = 그 ACB 2차측 부스바로 이어진 옆 반 · ACB 밑 ACB = 옆 ACB반 (자기 부스바로 자기 밑 반을)
   - ACB · 배전반 어느 것을 열어도 같은 라인업 (가장 위 ACB부터) · 연 반은 노란 테두리
   - 피더 = 트리 순서 · 400A 이상 2칸 · ACB 피더 3칸 · → 받는 반을 누르면 그 반 회로도로
   ========================================================= */

const lnIsAcb = n => !!n && n.type === 'CB' && n.cbk === 'ACB';
const lnIsMdb = n => !!n && n.type === 'MDB' && !(typeof pvIsMcc === 'function' && pvIsMcc(n));
// 이 반이 속한 라인업의 맨 위 (ACB를 따라 올라감)
function lnRoot(h) {
  if (!h || !(lnIsMdb(h) || (lnIsAcb(h) && kids(h.id).length))) return null;
  let r = h, g = 0; while (lnIsAcb(par(r)) && g++ < 20) r = par(r);
  return r;
}
const lnAmp = n => parseFloat(String(n.rating || '').replace(/[^\d.]/g, '')) || 0;
const lnSlots = n => lnIsAcb(n) ? 3 : lnAmp(n) >= 400 ? 2 : 1;
// 피더가 보내는 곳: 첫 반(분전반·배전반·MCC…)
function lnDest(n) { if (BV_PT && BV_PT[n.type]) return null; const q = [...kids(n.id)]; while (q.length) { const k = q.shift(); if (BV_PT[k.type]) return k; q.push(...kids(k.id)); } return null; }
// 섹션 나열 (트리 순서): ACB반 → 그 밑 배전반·ACB반 …
function lnSections(root) {
  const S2 = [];
  const add = (n, lv, feed) => {
    if (lnIsAcb(n)) {
      const sec = {n, kind: 'acb', lv, feed, units: [], subs: []}; S2.push(sec);
      kids(n.id).forEach(k => { if (lnIsMdb(k) || (lnIsAcb(k) && kids(k.id).length)) sec.subs.push(k); else sec.units.push(k); });
      sec.subs.forEach(k => add(k, lv + 1, sec));
    } else S2.push({n, kind: 'mdb', lv, feed, units: kids(n.id), subs: []});
  };
  add(root, 0, null);
  return S2;
}
// 인출형 ACB 그림 (w×h)
function lnAcbPic(x, y, w, h, nm, amp) {
  const s = w / 120;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <rect x="0" y="0" width="120" height="${h / s}" rx="4" fill="#5b6470"/>
    <path d="M6 10h108M6 16h108" stroke="#7b8592" stroke-width="2"/>
    <rect x="10" y="22" width="100" height="${h / s - 40}" rx="4" fill="url(#lnAcb)" stroke="#94a3b8"/>
    <rect x="46" y="22" width="26" height="${h / s - 40}" fill="#1f2937"/><rect x="50" y="28" width="18" height="10" rx="1" fill="#0f766e"/><text x="59" y="35.5" text-anchor="middle" font-size="6" fill="#ccfbf1">${esc(amp || '')}</text>
    ${[0, 1, 2, 3].map(i => `<circle cx="${54 + (i % 2) * 10}" cy="${48 + Math.floor(i / 2) * 9}" r="2.4" fill="#e5e7eb"/>`).join('')}
    <circle cx="84" cy="36" r="7" fill="#dc2626" stroke="#7f1d1d"/><text x="84" y="39" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">O</text>
    <circle cx="101" cy="36" r="7" fill="#16a34a" stroke="#14532d"/><text x="101" y="39" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">I</text>
    <rect x="80" y="50" width="25" height="6" rx="1" fill="#facc15"/><text x="92.5" y="55" text-anchor="middle" font-size="4.6" fill="#713f12">CHARGED</text>
    <rect x="16" y="30" width="22" height="8" rx="1" fill="#cbd5e1"/><text x="27" y="36.5" text-anchor="middle" font-size="5.5" font-weight="bold" fill="#334155">ACB</text>
    <rect x="12" y="${h / s - 16}" width="96" height="9" rx="2" fill="#334155"/><circle cx="60" cy="${h / s - 11.5}" r="2.6" fill="#94a3b8"/></g>`;
}
// 피더 차단기 그림 (작은 MCCB · ELB · ACB)
function lnBrk(n, x, y, h) {
  if (lnIsAcb(n)) return lnAcbPic(x, y, 58, h, '', '');
  const k = pvKind(n), P = Math.min(4, pvPoles(n)), w = 10 + P * 8;
  const body = k === 'E' ? 'fill="url(#pvBe)" stroke="#15803d"' : k === 'M' ? 'fill="url(#pvBm)" stroke="#4b5563"' : 'fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="3 2"';
  let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" ${body}/>`;
  if (k !== 'U') for (let i = 0; i < P; i++) o += `<rect x="${x + 5 + i * 8}" y="${y + 4}" width="6" height="${h * .42}" rx="1" fill="#d6d3d1"/><rect x="${x + 5.8 + i * 8}" y="${y + 5}" width="4.4" height="${h * .24}" rx=".8" fill="#1f2937"/>`;
  if (k === 'E') o += `<rect x="${x}" y="${y}" width="3" height="${h}" fill="#16a34a"/><circle cx="${x + w - 5}" cy="${y + h - 6}" r="3" fill="#facc15" stroke="#a16207" stroke-width=".7"/>`;
  return o;
}

function lnSvg(root, focus) {
  const SE = lnSections(root), UW = 200, SL = 46, GAP = 8, X0 = 30, BUS = 112, TOP = 150;
  const acbH = 196;   // ACB반 위쪽: 계기 + ACB + 이름
  const slotsOf = sec => sec.units.reduce((a, u) => a + lnSlots(u), 0);
  const maxSl = Math.max(4, ...SE.map(s => slotsOf(s) + (s.kind === 'acb' ? Math.ceil(acbH / SL) : 1)));
  const SH = maxSl * SL + 34, W = Math.max(760, X0 * 2 + SE.length * (UW + GAP)), H = TOP + SH + 50;
  SE.forEach((s, i) => { s.x = X0 + i * (UW + GAP); });
  const vr = effV(root) || '', tr = pathOf(root).slice(0, -1).reverse().find(n => n.type === 'TR');
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Malgun Gothic,sans-serif">`,
    `<defs><linearGradient id="lnAcb" x1="0" x2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient><linearGradient id="lnSec" x1="0" x2="1"><stop offset="0" stop-color="#b8bcb4"/><stop offset=".5" stop-color="#d3d6cf"/><stop offset="1" stop-color="#b3b7af"/></linearGradient>
     <linearGradient id="pvBm" x1="0" x2="1"><stop offset="0" stop-color="#8b9199"/><stop offset=".5" stop-color="#b4b9c0"/><stop offset="1" stop-color="#868c94"/></linearGradient><linearGradient id="pvBe" x1="0" x2="1"><stop offset="0" stop-color="#f1f5f9"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#eef2f6"/></linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="#fff"/><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="8" fill="#e5e7eb" stroke="#1e3a8a" stroke-width="5"/>`];
  // 명판
  const nf = SE.filter(s => s.kind === 'mdb').length, na = SE.filter(s => s.kind === 'acb').length;
  o.push(`<rect x="${X0 + 6}" y="26" width="86" height="20" rx="10" fill="#1e3a8a"/><text x="${X0 + 49}" y="40" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">배전반</text>`,
    `<rect x="${W / 2 - 190}" y="24" width="380" height="50" rx="4" fill="#1e3a8a"/><text x="${W / 2}" y="50" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff">${esc(pvFit(label(root) + ' 라인업', 360, 18))}</text>
     <text x="${W / 2}" y="66" text-anchor="middle" font-size="11" fill="#c7d2fe">${esc([tr ? label(tr) + (tr.kva ? ' ' + tr.kva + 'kVA' : '') + '에서' : '', vr, `ACB반 ${na} · 배전반 ${nf}`].filter(Boolean).join(' · '))}</text>`,
    `<text x="${W - X0 - 8}" y="40" text-anchor="end" font-size="10.5" fill="#374151">회색 = 배선용 · 초록 띠 = 누전</text><text x="${W - X0 - 8}" y="56" text-anchor="end" font-size="10.5" fill="#374151">→ 받는 반을 누르면 그 반 회로도</text>`);
  // 부스바: ACB마다 2차측 (자기 반 ~ 바로 밑 반들)
  SE.filter(s => s.kind === 'acb').forEach(s => {
    const mine = SE.filter(t => t.feed === s), x1 = s.x + UW / 2, x2 = mine.length ? Math.max(...mine.map(t => t.x + UW - 10)) : s.x + UW - 10, y = BUS + s.lv * 12;
    [['#92400e', 0], ['#18181b', 3], ['#9ca3af', 6]].forEach(([c, d]) => o.push(`<rect x="${x1}" y="${y + d - 18}" width="${x2 - x1}" height="2.6" fill="${c}"/>`));
    o.push(`<text x="${x1 + 4}" y="${y - 21}" font-size="9" fill="#1e3a8a" font-weight="bold">${esc(label(s.n))} 2차측 부스바</text>`);
    mine.forEach(t => o.push(`<path d="M${t.x + UW / 2} ${y - 12}V${TOP}" stroke="#57534e" stroke-width="2"/>`));
  });
  // 섹션
  SE.forEach(s => {
    const foc = focus && s.n.id === focus.id, x = s.x;
    o.push(`<g class="lnS"><rect x="${x}" y="${TOP}" width="${UW}" height="${SH}" fill="url(#lnSec)" stroke="${foc ? '#f59e0b' : '#6b7068'}" stroke-width="${foc ? 4 : 1.2}"/>
      <g class="pvr" data-id="${esc(s.n.id)}" style="cursor:pointer"><title>${esc(label(s.n))} — 클릭: 선택</title><rect data-card="1" x="${x + 4}" y="${TOP + 4}" width="${UW - 8}" height="24" rx="3" fill="${s.kind === 'acb' ? '#334155' : '#1e3a8a'}"/>
      <text x="${x + UW / 2}" y="${TOP + 21}" text-anchor="middle" font-size="12.5" font-weight="bold" fill="#fff">${esc(pvFit((s.kind === 'acb' ? 'ACB반 · ' : '') + label(s.n), UW - 16, 12.5))}</text></g>`);
    let y = TOP + 32;
    if (s.kind === 'acb') {   // 계기 + 인출형 ACB
      ['A', 'V', 'PF'].forEach((m, i) => o.push(`<rect x="${x + 26 + i * 52}" y="${y + 2}" width="40" height="26" rx="2" fill="#f8fafc" stroke="#475569"/><rect x="${x + 30 + i * 52}" y="${y + 6}" width="32" height="12" fill="#0f766e"/><text x="${x + 46 + i * 52}" y="${y + 25}" text-anchor="middle" font-size="7" fill="#334155">${m}</text>`));
      y += 36;
      o.push(`<g class="pvr" data-id="${esc(s.n.id)}" style="cursor:pointer"><title>${esc(label(s.n))} ${esc(pvAmp(s.n))}</title>${lnAcbPic(x + 20, y, UW - 40, 112, label(s.n), pvAmp(s.n))}</g>`);
      y += 118;
      o.push(`<text x="${x + UW / 2}" y="${y + 6}" text-anchor="middle" font-size="12" font-weight="bold" fill="#111827">${esc(pvFit(label(s.n), UW - 12, 12))}</text><text x="${x + UW / 2}" y="${y + 21}" text-anchor="middle" font-size="10.5" fill="#374151">${esc([pvAmp(s.n), s.n.poles ? pvPoles(s.n) + 'P' : '', s.feed ? '← ' + label(s.feed.n) + ' 부스바' : tr ? '← ' + label(tr) : ''].filter(Boolean).join(' · '))}</text>`);
      y = TOP + 32 + Math.ceil(acbH / SL) * SL;
      if (s.units.length) o.push(`<path d="M${x + 8} ${y - 6}H${x + UW - 8}" stroke="#6b7068" stroke-dasharray="4 3"/><text x="${x + 10}" y="${y - 9}" font-size="9" fill="#374151">ACB반 안 차단기</text>`);
    }
    if (!s.units.length && s.kind === 'mdb') o.push(`<text x="${x + UW / 2}" y="${y + 24}" text-anchor="middle" font-size="11" fill="#475569">피더 없음</text>`);
    s.units.forEach(u => {
      const sl = lnSlots(u), uh = sl * SL - 4, sel = u.id === UI.sel, w = UW - 8, ux = x + 4;
      if (isSlot(u)) { o.push(`<g class="pvr" data-id="${esc(u.id)}" style="cursor:pointer"><title>빈 자리</title><rect data-card="1" x="${ux}" y="${y}" width="${w}" height="${uh}" rx="2" fill="${sel ? '#e0e7ff' : '#c4c8c0'}" stroke="#8a8f87" stroke-dasharray="4 3"/><text x="${ux + w / 2}" y="${y + uh / 2 + 4}" text-anchor="middle" font-size="11" fill="#f8fafc">빈 자리</text></g>`); y += sl * SL; return; }
      const sp = pvSpare(u), todo = !sp && (!String(u.name || '').trim() || /라벨\s*x/i.test(u.name || '')), d = lnDest(u);
      const bw = lnIsAcb(u) ? 58 : 10 + Math.min(4, pvPoles(u)) * 8, tx = ux + bw + 12, tw = ux + w - tx - 4, bh = Math.min(uh - 8, lnIsAcb(u) ? uh - 8 : 30);
      const nm = u.name ? u.name : '(이름 없음)', fill = sel ? '#262f7d' : sp ? '#d1d5db' : todo ? '#fde7c8' : '#eef0ec', tc = sel ? '#fff' : sp ? '#6b7280' : todo ? '#9a3412' : '#111827';
      o.push(`<g class="pvr" data-id="${esc(u.id)}" style="cursor:pointer"><title>${esc(label(u))} ${esc(spec(u))}${d ? ' → ' + esc(label(d)) : ''} — 클릭: 선택 · 더블클릭: 이름 입력</title>
        <rect x="${ux}" y="${y}" width="${w}" height="${uh}" rx="2" fill="${fill}" stroke="${sel ? '#262f7d' : '#8a8f87'}"${sp && !sel ? ' stroke-dasharray="4 3"' : ''}/>
        ${lnBrk(u, ux + 5, y + (uh - bh) / 2, bh)}
        <rect data-card="1" x="${tx - 3}" y="${y + 2}" width="${tw + 4}" height="${uh - 4}" fill="transparent"/>
        <text x="${tx}" y="${y + 14}" font-size="11.5" font-weight="bold" fill="${tc}">${esc(pvFit((u.no && !/^\d+$/.test(u.no) ? '' : '') + nm, tw, 11.5))}</text>
        <text x="${tx}" y="${y + 27}" font-size="10" fill="${sel ? '#c7d2fe' : '#4b5563'}">${esc(pvFit([pvAmp(u), u.poles ? pvPoles(u) + 'P' : '', u.no && !/^\d+$/.test(u.no) ? u.no : ''].filter(Boolean).join(' · '), tw, 10))}</text>
        ${d ? `<g data-open="${esc(u.id)}" style="cursor:pointer"><title>${esc(label(d))} 회로도 열기</title><text x="${tx}" y="${y + Math.min(uh - 4, 40)}" font-size="10.5" font-weight="bold" fill="${sel ? '#fde68a' : '#0f766e'}">→ ${esc(pvFit(label(d), tw - 12, 10.5))}</text></g>` : ''}</g>`);
      y += sl * SL;
    });
  });
  o.push('</svg>');
  return o.join('');
}

// 회로도 탭에 연결: 배전반·ACB면 라인업 그림
(function () {
  const _svg = pvSvg; pvSvg = function (h) { const r = lnRoot(h); return r ? lnSvg(r, h) : _svg(h); };
})();
