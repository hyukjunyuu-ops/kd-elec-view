/* =========================================================
   ptmonth.js — 월간 전기실 순찰 일지 (Word, A4 가로, 결재용)
   1장: 결재란(담당자·과장·팀장·담당 임원) · 요약(순찰률·이상·기준 초과) · 특이사항(자동 + 직접 기입)
   2장: 일별 순찰 현황 (1~말일 × 전기실) — ○ 정상 · △ 이상 · 빈칸 미순찰 · 그날 순찰자 전부
   특이사항은 같은 전기실 · 같은 내용이 반복되면 한 줄로 (기간 · 횟수)
   3장: 계측 요약 — 전기실 온·습도 / 배전반별 V·A·kW·PF 평균·최소·최대
   하루에 여러 번이면 그날 마지막 기록 · 순찰 → 기록 탭에서 받기
   ========================================================= */

const PM = {ym: ''};
const pmYM = () => PM.ym || ptToday().slice(0, 7);
const pmNote = () => (S.cfg.ptNote = S.cfg.ptNote || {});

// ---------- Word 조각 (WordprocessingML) ----------
const pmX = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PMF = '맑은 고딕';
function pmR(t, o = {}) {
  const rp = `<w:rPr><w:rFonts w:ascii="${PMF}" w:hAnsi="${PMF}" w:eastAsia="${PMF}"/>${o.b ? '<w:b/>' : ''}${o.c ? `<w:color w:val="${o.c}"/>` : ''}<w:sz w:val="${o.sz || 18}"/></w:rPr>`;
  return String(t).split('\n').map((x, i) => `${i ? '<w:r><w:br/></w:r>' : ''}<w:r>${rp}<w:t xml:space="preserve">${pmX(x)}</w:t></w:r>`).join('');
}
const pmP = (runs, o = {}) => `<w:p><w:pPr><w:spacing w:before="${o.bf || 0}" w:after="${o.af == null ? 40 : o.af}"/>${o.al ? `<w:jc w:val="${o.al}"/>` : ''}${o.keep ? '<w:keepNext/>' : ''}</w:pPr>${runs}</w:p>`;
const pmBr = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const pmB = (c = '9CA3AF') => `<w:top w:val="single" w:sz="4" w:color="${c}"/><w:left w:val="single" w:sz="4" w:color="${c}"/><w:bottom w:val="single" w:sz="4" w:color="${c}"/><w:right w:val="single" w:sz="4" w:color="${c}"/>`;
// 칸: {t, w, b, c, fill, al, span, sz, nb(테두리 없음)}
function pmC(x) {
  return `<w:tc><w:tcPr><w:tcW w:w="${x.w}" w:type="dxa"/>${x.span > 1 ? `<w:gridSpan w:val="${x.span}"/>` : ''}<w:tcBorders>${x.nb ? '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>' : pmB()}</w:tcBorders>`
    + `${x.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${x.fill}"/>` : ''}<w:tcMar><w:top w:w="30" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>`
    + (x.raw || pmP(pmR(x.t == null ? '' : x.t, {b: x.b, c: x.c, sz: x.sz}), {al: x.al, af: 0})) + '</w:tc>';
}
function pmT(widths, rows, o = {}) {
  const grid = widths.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${o.right ? '<w:jc w:val="right"/>' : ''}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>`
    + rows.map((r, i) => `<w:tr><w:trPr><w:cantSplit/>${i === 0 && o.head ? '<w:tblHeader/>' : ''}${r.h ? `<w:trHeight w:val="${r.h}" w:hRule="atLeast"/>` : ''}</w:trPr>${r.c.map(pmC).join('')}</w:tr>`).join('') + '</w:tbl>';
}

// ---------- 데이터 ----------
function pmData(ym) {
  const c = ptCfg(), [Y, M] = ym.split('-').map(Number), last = new Date(Y, M, 0).getDate(), today = ptToday();
  const recs = ptAll().filter(r => r.d && r.d.slice(0, 7) === ym);
  const day = {};   // day[d][room] = 그날 마지막 기록 · who[d] = 그날 순찰자들
  const who = {};
  recs.forEach(r => { const D = day[r.d] = day[r.d] || {}; if (!D[r.room] || D[r.room].ts < r.ts) D[r.room] = r; (who[r.d] = who[r.d] || new Set()).add(r.who || ''); });
  const days = [...Array(last)].map((_, i) => { const d = `${ym}-${String(i + 1).padStart(2, '0')}`, wd = new Date(Y, M - 1, i + 1).getDay(); return {d, n: i + 1, wd, fut: d > today}; });
  const daily = Object.values(day).flatMap(D => Object.values(D));   // 하루 마지막 기록들
  const past = days.filter(x => !x.fut), due = past.length * c.rooms.length, done = past.reduce((s, x) => s + c.rooms.filter(rm => day[x.d] && day[x.d][rm.id]).length, 0);
  const miss = []; past.forEach(x => c.rooms.forEach(rm => { if (!(day[x.d] && day[x.d][rm.id])) miss.push(`${x.n}일 ${rm.name.replace(/ 전기실$/, '')}`); }));
  // 특이사항: 이상·기준 초과·메모가 있는 기록 (하루 마지막 기록 기준) + [조치 완료] 내용
  const ack = S.cfg.ptAck || {}, L = c.lim;
  const notes = daily.filter(r => (r.bad || []).length || r.memo).sort((a, b) => a.ts < b.ts ? -1 : 1).map(r => {
    const A = Object.keys(r.items || {}).filter(k => r.items[k] === 'bad').map(k => ack[r.id + '|' + k]).filter(Boolean);
    return {d: r.d, room: r.rn || r.room, txt: [(r.bad || []).join(' · '), ...Object.entries(r.im || {}).filter(([k, v]) => v && (r.items || {})[k] === 'bad').map(([k, v]) => `${k}: ${v}`), r.memo ? '메모: ' + r.memo : ''].filter(Boolean).join('\n'),
      fix: A.map(a => a.m || '조치 완료').join(' / '), by: A.map(a => `${a.by || ''} ${a.at ? new Date(a.at).getMonth() + 1 + '/' + new Date(a.at).getDate() : ''}`.trim()).join(' / '), bad: (r.bad || []).length > 0};
  });
  const grp = new Map(), notesG = [];
  notes.forEach(n => { if (n.fix) { notesG.push(Object.assign({n: 1, d2: n.d}, n)); return; } const k = n.room + '|' + n.txt, g = grp.get(k);
    if (g) { g.n++; g.d2 = n.d; } else { const x = Object.assign({n: 1, d2: n.d}, n); grp.set(k, x); notesG.push(x); } });
  const cnt = {t: 0, h: 0, V: 0, PF: 0};
  daily.forEach(r => { if (ptFieldBad('t', r.t, c)) cnt.t++; if (ptFieldBad('h', r.h, c)) cnt.h++; (r.P || []).forEach(p => { if (ptFieldBad('V', p.V, c, p)) cnt.V++; if (ptFieldBad('PF', p.PF, c, p)) cnt.PF++; }); });
  const badN = daily.filter(r => (r.bad || []).length).length;
  const itemBad = daily.flatMap(r => Object.keys(r.items || {}).filter(k => r.items[k] === 'bad').map(k => r.id + '|' + k)), fixed = itemBad.filter(k => ack[k]).length;
  // 계측 요약
  const st = a => { const v = a.filter(x => x !== '' && x != null && !isNaN(+x)).map(Number); return v.length ? {n: v.length, avg: v.reduce((s, x) => s + x, 0) / v.length, min: Math.min(...v), max: Math.max(...v)} : null; };
  const roomS = c.rooms.map(rm => { const R = daily.filter(r => r.room === rm.id); return {rm, n: R.length, t: st(R.map(r => r.t)), h: st(R.map(r => r.h))}; });
  const panS = c.rooms.flatMap(rm => (rm.panels || []).map(p => { const P = daily.filter(r => r.room === rm.id).map(r => (r.P || []).find(x => x.n === p.n)).filter(Boolean);
    return {rm, p, n: P.length, V: st(P.map(x => x.V)), A: st(P.map(x => x.A)), kW: st(P.map(x => x.kW)), PF: st(P.map(x => x.PF))}; }));
  return {c, Y, M, last, days, day, who, due, done, miss, notes: notesG, cnt, badN, itemBad: itemBad.length, fixed, roomS, panS};
}

// ---------- 문서 ----------
function pmDoc(D) {
  const G = 'F2F2F2', H = 'E7E7E7', TT = '1F2937', MU = '6B7280', RED = 'DC2626', W = 15138;   // A4 가로 본문 폭 (여백 850)
  const f = (x, k = 1) => x == null ? '' : Math.round(x * k) / k;
  const o = [];
  // 1장 — 제목 + 결재란
  const sw = 1150, sign = ['담당자', '과장', '팀장', '담당 임원'];
  o.push(pmT([W - sw * 4, sw, sw, sw, sw], [
    {c: [{w: W - sw * 4, nb: 1, raw: pmP(pmR(`${D.Y}년 ${D.M}월 전기실 순찰 일지`, {b: 1, sz: 36, c: TT}), {af: 20}) + pmP(pmR(`종근당 천안공장 유틸리티팀 · 기간 ${D.Y}.${D.M}.1 ~ ${D.M}.${D.last} · 작성 ${ptToday().replace(/-/g, '.')}${ptWho() ? ' · ' + ptWho() : ''}`, {sz: 16, c: MU}), {af: 0})},
      ...sign.map(s => ({t: s, w: sw, b: 1, fill: H, al: 'center', sz: 17}))]},
    {h: 900, c: [{w: W - sw * 4, nb: 1, t: ''}, ...sign.map(() => ({t: '', w: sw}))]}
  ]));
  const pct = D.due ? Math.round(D.done / D.due * 1000) / 10 : 0;
  o.push(pmP(pmR('■ 요약', {b: 1, sz: 21, c: TT}), {bf: 200, af: 60, keep: 1}));
  const LW = 2200, VW = W - LW;
  o.push(pmT([LW, VW], [
    ['순찰률', `${D.done} / ${D.due}회 (${pct}%)${D.miss.length ? `   · 미순찰 ${D.miss.length}회: ${D.miss.slice(0, 12).join(', ')}${D.miss.length > 12 ? ` 외 ${D.miss.length - 12}회` : ''}` : '   · 미순찰 없음'}`],
    ['이상', `${D.badN}회 (이상·기준 초과가 있던 순찰)   · 외관 이상 ${D.itemBad}건 중 조치 완료 ${D.fixed}건${D.itemBad - D.fixed ? ` · 미조치 ${D.itemBad - D.fixed}건` : ''}`],
    ['기준 초과', `온도 ${D.cnt.t}회 · 습도 ${D.cnt.h}회 · 전압 ${D.cnt.V}회 · 역률 ${D.cnt.PF}회   (기준: 온도 ${D.c.lim.tHi}℃ · 습도 ${D.c.lim.hHi}% · 전압 ±${D.c.lim.vTol}% · 역률 ${D.c.lim.pfLo})`],
  ].map(([k, v]) => ({c: [{t: k, w: LW, b: 1, fill: G, al: 'center'}, {t: v, w: VW}]}))));
  o.push(pmP(pmR('■ 특이사항', {b: 1, sz: 21, c: TT}), {bf: 200, af: 60, keep: 1}));
  const nw = [1300, 1700, 7138, 3400, 1600];
  o.push(pmT(nw, [{c: ['날짜', '전기실', '내용', '조치 내용', '조치자'].map((t, i) => ({t, w: nw[i], b: 1, fill: H, al: 'center'}))},
    ...(D.notes.length ? D.notes.map(n => ({c: [{t: n.d.slice(5).replace('-', '/') + (n.n > 1 ? `~${n.d2.slice(5).replace('-', '/')}\n(${n.n}회)` : ''), w: nw[0], al: 'center'}, {t: n.room.replace(/ 전기실$/, ''), w: nw[1]}, {t: n.txt, w: nw[2], c: n.bad ? 'B91C1C' : null}, {t: n.fix, w: nw[3]}, {t: n.by, w: nw[4]}]}))
      : [{c: [{t: '이번 달 특이사항 없음', w: W, span: 5, al: 'center', c: MU}]}])], {head: 1}));
  const note = pmNote()[`${D.Y}-${String(D.M).padStart(2, '0')}`] || '';
  o.push(pmP(pmR('■ 특이사항 (담당자 기입)', {b: 1, sz: 21, c: TT}), {bf: 200, af: 60, keep: 1}));
  o.push(pmT([W], [{h: 1100, c: [{t: note, w: W}]}]));
  // 2장 — 일별 순찰 현황
  o.push(pmBr());
  o.push(pmP(pmR(`일별 순찰 현황 (${D.Y}년 ${D.M}월)`, {b: 1, sz: 24, c: TT}), {af: 30}));
  o.push(pmP(pmR('○ 정상 · △ 이상 · 빈칸 미순찰 · 하루에 여러 번이면 마지막 기록 · 회색 줄 = 주말', {sz: 15, c: MU}), {af: 80}));
  const R = D.c.rooms, dw = [620, 620], rw = Math.floor((W - 1240 - 3200) / R.length), ww = W - 1240 - rw * R.length;
  const cw = [...dw, ...R.map(() => rw), ww];
  o.push(pmT(cw, [{c: [{t: '일', w: cw[0], b: 1, fill: H, al: 'center', sz: 16}, {t: '요일', w: cw[1], b: 1, fill: H, al: 'center', sz: 16},
      ...R.map((rm, i) => ({t: rm.name.replace(/ 전기실$/, ''), w: rw, b: 1, fill: H, al: 'center', sz: 15})), {t: '순찰자', w: ww, b: 1, fill: H, al: 'center', sz: 16}]},
    ...D.days.map(x => { const we = x.wd === 0 || x.wd === 6, fl = we ? 'F5F5F5' : null;
      return {c: [{t: x.n, w: cw[0], al: 'center', fill: fl, sz: 16}, {t: '일월화수목금토'[x.wd], w: cw[1], al: 'center', fill: fl, sz: 16, c: x.wd === 0 ? RED : null},
        ...R.map(rm => { const r = D.day[x.d] && D.day[x.d][rm.id], b = r && (r.bad || []).length; return {t: r ? b ? '△' : '○' : '', w: rw, al: 'center', fill: fl, sz: 18, c: b ? RED : '374151', b: !!b}; }),
        {t: D.who[x.d] ? [...D.who[x.d]].filter(Boolean).join(', ') : '', w: ww, fill: fl, sz: 15}]}; })], {head: 1}));
  // 3장 — 계측 요약
  o.push(pmBr());
  o.push(pmP(pmR(`계측 요약 (${D.Y}년 ${D.M}월)`, {b: 1, sz: 24, c: TT}), {af: 30}));
  o.push(pmP(pmR('하루 마지막 순찰 값 기준 · 일별 원본은 구글 시트 / [엑셀(CSV) 받기]', {sz: 15, c: MU}), {af: 80}));
  const tw = [3000, 1600, 2600, 2600, 5338];
  o.push(pmP(pmR('■ 전기실 온·습도', {b: 1, sz: 19, c: TT}), {af: 40, keep: 1}));
  o.push(pmT(tw, [{c: ['전기실', '순찰 일수', '온도 평균 / 최고 (℃)', '습도 평균 / 최고 (%)', '비고'].map((t, i) => ({t, w: tw[i], b: 1, fill: H, al: 'center'}))},
    ...D.roomS.map(x => ({c: [{t: x.rm.name, w: tw[0]}, {t: x.n, w: tw[1], al: 'center'}, {t: x.t ? `${f(x.t.avg, 10)} / ${f(x.t.max, 10)}` : '-', w: tw[2], al: 'center', c: x.t && x.t.max >= D.c.lim.tHi ? RED : null},
      {t: x.h ? `${f(x.h.avg, 10)} / ${f(x.h.max, 10)}` : '-', w: tw[3], al: 'center', c: x.h && x.h.max >= D.c.lim.hHi ? RED : null}, {t: x.t && x.t.max >= D.c.lim.tHi ? `온도 기준(${D.c.lim.tHi}℃) 넘은 날 있음` : '', w: tw[4]}]}))], {head: 1}));
  o.push(pmP('', {af: 120}));
  o.push(pmP(pmR('■ 배전반 계측', {b: 1, sz: 19, c: TT}), {af: 40, keep: 1}));
  const pw = [2100, 2500, 900, 700, 2200, 2200, 2200, 2338];
  o.push(pmT(pw, [{c: ['전기실', '배전반', '정격', '횟수', 'V 평균 (최소~최대)', 'A 평균 (최대)', 'kW 평균 (최대)', 'PF 평균 (최소)'].map((t, i) => ({t, w: pw[i], b: 1, fill: H, al: 'center', sz: 16}))},
    ...(D.panS.length ? D.panS.map(x => { const pfLow = x.PF && x.PF.min > 0 && x.PF.min < D.c.lim.pfLo;
      return {c: [{t: x.rm.name.replace(/ 전기실$/, ''), w: pw[0]}, {t: x.p.n, w: pw[1]}, {t: x.p.v || '', w: pw[2], al: 'center'}, {t: x.n, w: pw[3], al: 'center'},
        {t: x.V ? `${f(x.V.avg, 10)} (${f(x.V.min, 10)}~${f(x.V.max, 10)})` : '-', w: pw[4], al: 'center'}, {t: x.A ? `${f(x.A.avg)} (${f(x.A.max)})` : '-', w: pw[5], al: 'center'},
        {t: x.kW ? `${f(x.kW.avg)} (${f(x.kW.max)})` : '-', w: pw[6], al: 'center'}, {t: x.PF ? `${f(x.PF.avg, 100)} (${f(x.PF.min, 100)})` : '-', w: pw[7], al: 'center', c: pfLow ? RED : null}]}; })
      : [{c: [{t: '순찰 설정에 계측할 배전반이 없어요', w: W, span: 8, al: 'center', c: MU}]}])], {head: 1}));
  const body = o.join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}`
    + `<w:sectPr><w:footerReference w:type="default" r:id="rIdFt"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="800" w:right="850" w:bottom="700" w:left="850" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
function pmZip(xml) {
  const z = new PizZip(), ct = 'application/vnd.openxmlformats-officedocument';
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="${ct.replace('officedocument', 'package')}.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${ct}.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="${ct}.wordprocessingml.footer+xml"/></Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdFt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);
  z.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${pmP(pmR('종근당 천안공장 유틸리티팀 · 전기계통 관리 시스템에서 작성 · ', {sz: 14, c: '9CA3AF'}) + '<w:r><w:rPr><w:sz w:val="14"/><w:color w:val="9CA3AF"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="9CA3AF"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="9CA3AF"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>', {al: 'right', af: 0})}</w:ftr>`);
  z.file('word/document.xml', xml);
  return z.generate({type: 'blob', mimeType: ct + '.wordprocessingml.document'});
}
async function pmMake() {
  const ym = pmYM(), c = ptCfg();
  // 그 달 기록이 다 있도록: 시트에서 그 달 1일부터 받아오기
  if (c.url) { try { const days = Math.ceil((Date.now() - new Date(ym + '-01T00:00:00')) / 864e5) + 2;
    if (days > 35) { const r = await fetch(`${c.url}?a=recs&days=${days}&k=${encodeURIComponent(c.key)}`), j = await r.json(); if (j.ok) { const m = new Map(PT.remote.map(x => [x.id, x])); (j.recs || []).forEach(x => m.set(x.id, x)); PT.remote = [...m.values()]; } } } catch (e) {} }
  const D = pmData(ym);
  download(pmZip(pmDoc(D)), `전기실순찰일지_${ym.replace('-', '년')}월.docx`);
  toast(`${D.Y}년 ${D.M}월 순찰 일지(Word)를 받았어요 · 순찰 ${D.done}/${D.due}회 · 특이사항 ${D.notes.length}건`, false);
  return D;
}

// 순찰 → 기록 탭 위에 [월간 일지]
{
  const _lg = ptLogH;
  ptLogH = function (c) {
    const ym = pmYM();
    return `<div class="pmBox"><b>📄 월간 순찰 일지</b><input type="month" data-pmym value="${ym}"><button class="pri" data-pma="make">Word로 받기 (결재용)</button>
      <span class="mu">결재란 · 요약 · 특이사항 / 일별 현황 / 계측 요약</span>
      <div class="nt"><textarea data-pmnote rows="2" placeholder="특이사항 (담당자 기입) — 이 달 일지 1장에 들어가요. 예) 11/12 품질동 에어컨 수리 업체 의뢰">${esc(pmNote()[ym] || '')}</textarea></div></div>` + _lg.apply(this, arguments);
  };
}
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.pmym !== undefined) { PM.ym = e.target.value; renderView(); } });
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.pmnote !== undefined) { pmNote()[pmYM()] = e.target.value; clearTimeout(PM.t); PM.t = setTimeout(save, 600); } });
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-pma="make"]')) pmMake(); });
(function () {
  const s = document.createElement('style');
  s.textContent = `#view .pmBox{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:13px}
#view .pmBox input[type=month]{font:inherit;padding:3px 6px;border:1px solid #d6dbe8;border-radius:6px}#view .pmBox .pri{padding:5px 14px;border:0;border-radius:6px;background:#262f7d;color:#fff;cursor:pointer;font-size:13px}
#view .pmBox .mu{color:#64748b;font-size:12px}#view .pmBox .nt{flex-basis:100%}#view .pmBox textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px;padding:6px 8px;border:1px solid #d6dbe8;border-radius:6px}`;
  document.head.appendChild(s);
})();
