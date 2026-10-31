/* =========================================================
   report.js — 계획정전 보고서
   전기 Flow에서 [⏻ 차단기 내리기]로 정전 범위를 정하고 [📄 계획정전 보고서]
   - 개요(직접 기입) · 정전 범위 · 단선도 · 동별 영향 · 중요 부하(체크한 것만) · 협조 팀 · 확인 사항
   - 새 창으로 열림 → 인쇄 / PDF 저장, 영향 목록 CSV
   ========================================================= */

function rpData() {
  const off = [...fpOffIds()].map(byId).filter(Boolean);
  const A = new Set(), w = n => { if (A.has(n.id)) return; A.add(n.id); kids(n.id).forEach(w); };
  off.forEach(w);
  const N = S.nodes.filter(n => A.has(n.id) && !FP_SRC[n.type]);
  const host = n => { let p = par(n); while (p && !FP_BOX[p.type] && p.type !== 'MDB') p = par(p); return p; };
  const leaf = n => !kids(n.id).length && (n.type === 'LOAD' || n.type === 'CB') && !ckSpare(n) && !isSlot(n);
  const byB = {};
  N.forEach(n => { const b = bk(n), r = byB[b] = byB[b] || {mdb: 0, pnl: 0, cir: 0, imp: 0, em: 0};
    if (n.type === 'MDB') r.mdb++; if (FP_BOX[n.type]) r.pnl++; if (leaf(n)) r.cir++; if (n.imp) r.imp++; if (leaf(n) && effSrc(n) === 'E') r.em++; });
  const imp = N.filter(n => n.imp);
  // 협조 팀: 즐겨찾기 그룹 기준
  let teams = [];
  try { if (typeof flTeamMap === 'function') { const m = flTeamMap(), T = {}; N.forEach(n => { if (!leaf(n) && !FP_BOX[n.type]) return; const t = flTeamOf(n, m); if (t !== '(그룹 없음)') T[t] = (T[t] || 0) + 1; }); teams = Object.entries(T).sort((a, b) => b[1] - a[1]); } } catch (e) {}
  return {off, N, byB, imp, teams, host, leaf, gen: N.filter(leaf).length - imp.length};
}

function rpHtml(D) {
  const today = new Date(), d8 = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const ed = ph => `<td contenteditable="true" class="ed" data-ph="${ph}"></td>`;
  const cats = IMP_CATS.filter(c => D.imp.some(n => n.imp === c));
  const has = c => cats.includes(c);
  const blds = Object.keys(D.byB).filter(b => { const r = D.byB[b]; return r.mdb + r.pnl + r.cir + r.imp; }).sort((a, b) => S.blds.indexOf(a) - S.blds.indexOf(b));
  // 단선도 (정전 범위가 회색으로)
  const ob = FP.black; FP.black = false; let svg = '', map = ''; try { svg = sdSvg(sdLayout(), true); map = mapSvg({outage: true}); } finally { FP.black = ob; }
  svg = svg.replace(/ width="\d+" height="\d+"/, ' width="100%"'); map = map.replace('<svg ', '<svg width="100%" ');
  const chk = [
    '관련 팀에 정전 일시·범위 사전 공지 (아래 협조 팀)',
    has('저온창고') || has('냉장·냉동·챔버') ? '저온창고·냉장/냉동/챔버 온도 유지 대책 (사전 온도 확보, 문 개폐 최소화, 필요 시 이동 보관) · 정전 중 온도 기록' : '',
    has('UPS') ? 'UPS 배터리 상태·유지 시간 확인, 부하 측 사전 셧다운 여부 협의' : '',
    has('통신·서버') ? '서버·통신 장비 셧다운/이중화 협의 (전산·통신 담당)' : '',
    has('유틸리티') ? '유틸리티 정지 영향 확인 (공조·정제수·냉각수·압축공기) 및 생산 일정 협의' : '',
    D.N.some(n => effSrc(n) === 'E') ? '비상 계통 포함 — 발전기·ATS 동작 여부 및 비상부하 영향 확인' : '',
    '작업 전 정전 → 검전 → 접지, 잠금·표시(LOTO)', '복전 순서 확인 및 복전 후 설비 재기동·이상 유무 확인', '비상 연락망·작업 중 연락 체계 확인'].filter(Boolean);
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>계획정전 보고서 ${d8}</title><style>
  body{font-family:'Malgun Gothic',sans-serif;color:#111827;margin:0;background:#f1f5f9}
  .pg{max-width:960px;margin:16px auto;background:#fff;padding:28px 34px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  h1{font-size:22px;margin:0 0 4px;color:#1e3a8a}h2{font-size:15px;margin:22px 0 8px;padding-left:8px;border-left:4px solid #1e3a8a}
  .sub{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12.5px}
  th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f1f5f9;font-weight:600;white-space:nowrap}
  td.ed{min-width:120px;background:#fffbeb}td.ed:empty:before{content:attr(data-ph);color:#cbd5e1}
  .n{text-align:right}.em{color:#dc2626;font-weight:700}.tag{display:inline-block;background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:0 5px;font-size:11px}
  .dia{border:1px solid #e2e8f0;border-radius:6px;padding:6px;overflow:hidden}.dia svg{display:block;height:auto}
  ul.ck{list-style:none;padding:0;margin:0}ul.ck li{padding:4px 0;font-size:13px}ul.ck li:before{content:'☐ ';font-size:15px}
  .bar{position:sticky;top:0;background:#1e3a8a;padding:8px;text-align:center;z-index:5}.bar button{margin:0 4px;padding:6px 14px;border:0;border-radius:6px;cursor:pointer;font-size:13px}
  .note{font-size:11.5px;color:#64748b;margin-top:4px}
  @media print{body{background:#fff}.bar{display:none}.pg{box-shadow:none;margin:0;max-width:none;padding:0}td.ed:empty:before{content:''}h2{break-after:avoid}table,.dia{break-inside:avoid}@page{size:A4;margin:14mm}}
  </style></head><body>
  <div class="bar"><button onclick="print()">🖨 인쇄 / PDF 저장</button><button id="csv">📊 영향 목록 CSV</button></div>
  <div class="pg">
  <h1>계획정전 작업 보고서</h1><div class="sub">종근당 천안공장 · 전기계통 관리에서 작성 · ${d8} · 노란 칸은 눌러서 직접 입력</div>
  <h2>1. 개요</h2><table>
   <tr><th>작업명</th>${ed('예: TR-203 정기 점검')}<th>작성일</th><td>${d8}</td></tr>
   <tr><th>정전 일시</th>${ed('예: 2026.11.15 (토) 08:00 ~ 12:00')}<th>작업 책임자</th>${ed('이름 / 연락처')}</tr>
   <tr><th>작업 내용</th><td colspan="3" contenteditable="true" class="ed" data-ph="작업 내용·사유"></td></tr></table>
  <h2>2. 정전 범위</h2><table><tr><th>내리는 차단기</th><th>위치 (경로)</th><th>동</th></tr>
   ${D.off.map(n => `<tr><td><b>${esc(label(n))}</b> ${n.cbk ? `<span class="sub">${esc(n.cbk)}</span>` : ''}</td><td>${esc(pathOf(n).slice(0, -1).map(label).join(' › '))}</td><td>${esc(bk(n))}</td></tr>`).join('')}</table>
  <div class="dia" style="margin-top:8px">${map}</div><div class="note">빨강 = 정전 · 주황 = 일부 정전 · 초록 = 정상</div>
  <div class="dia" style="margin-top:8px">${svg}</div><div class="note">수변전 단선도 — 회색 = 정전되는 범위 (전기 담당용)</div>
  <h2>3. 동별 영향</h2><table><tr><th>동</th><th class="n">배전반</th><th class="n">분전반·MCC</th><th class="n">회로</th><th class="n">중요 부하</th><th class="n">비상 계통 회로</th></tr>
   ${blds.map(b => { const r = D.byB[b]; return `<tr><td>${esc(b)}</td><td class="n">${r.mdb}</td><td class="n">${r.pnl}</td><td class="n">${r.cir}</td><td class="n">${r.imp ? `<b>${r.imp}</b>` : 0}</td><td class="n">${r.em ? `<span class="em">${r.em}</span>` : 0}</td></tr>`; }).join('')}</table>
  <h2>4. 중요 부하 (${D.imp.length})</h2>
   ${D.imp.length ? `<table><tr><th>분류</th><th>동</th><th>분전반·배전반</th><th>명칭</th><th>정격</th><th>비고</th></tr>
   ${cats.map(c => D.imp.filter(n => n.imp === c).map((n, i, a) => `<tr>${i ? '' : `<td rowspan="${a.length}"><span class="tag">${esc(c)}</span></td>`}<td>${esc(bk(n))}</td><td>${esc(D.host(n) ? label(D.host(n)) : '')}</td><td><b>${esc(label(n))}</b></td><td>${esc(spec(n))}</td><td>${effSrc(n) === 'E' ? '<span class="em">비상 계통</span>' : ''}</td></tr>`).join('')).join('')}</table>`
     : '<div class="note">정전 범위 안에 [중요 부하]로 체크한 항목이 없어요. (속성창에서 체크)</div>'}
   <div class="note">그 밖의 일반 회로 ${D.gen}개 (조명·전열 등)는 목록에서 뺐어요 — 전체는 [📊 영향 목록 CSV]</div>
  <h2>5. 협조 팀</h2>${D.teams.length ? `<table><tr><th>팀 (즐겨찾기 그룹)</th><th class="n">영향 회로·반</th><th>통보 확인</th></tr>${D.teams.map(([t, c]) => `<tr><td>${esc(t)}</td><td class="n">${c}</td><td contenteditable="true" class="ed" data-ph="담당자 / 통보일"></td></tr>`).join('')}</table>`
    : '<div class="note">즐겨찾기 그룹을 팀 이름으로 만들어 두면 여기에 자동으로 나와요.</div>'}
  <h2>6. 확인 사항</h2><ul class="ck">${chk.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
  <h2>7. 결재</h2><table><tr><th style="width:25%">작성</th><th style="width:25%">검토</th><th style="width:25%">승인</th><th>비고</th></tr><tr style="height:56px"><td></td><td></td><td></td><td></td></tr></table>
  </div></body></html>`;
}
function rpCsv(D) {
  const rows = [['동', '경로', '종류', '명칭', '정격', '중요 부하', '비상 계통']];
  D.N.forEach(n => rows.push([bk(n), pathOf(n).slice(0, -1).map(label).join(' › '), tlabel(n), n.name || '', spec(n), n.imp || '', effSrc(n) === 'E' ? '비상' : '']));
  return '﻿' + rows.map(r => r.map(csvQ).join(',')).join('\r\n');
}
function rpOpen() {
  const D = rpData();
  if (!D.off.length) { toast('먼저 [⏻ 차단기 내리기]를 켜고 정전할 차단기를 누르세요. 그다음 [📄 계획정전 보고서]', false); SD.out = true; if (UI.tab !== 'sld') { UI.tab = 'sld'; saveUI(); } renderAll(); return null; }
  const w = window.open('', '_blank');
  if (!w) { alert('팝업이 막혀 있어요. 브라우저 주소창 오른쪽의 팝업 허용을 눌러 주세요.'); return null; }
  w.document.open(); w.document.write(rpHtml(D)); w.document.close();
  const csv = rpCsv(D);
  // 받기는 원래 창에서 (새 창은 주소가 없어서 파일 이름이 안 붙음)
  w.document.getElementById('csv').onclick = () => download(new Blob([csv], {type: 'text/csv'}), `계획정전_영향목록_${stamp()}.csv`);
  return w;
}
/* =========================================================
   Word 양식 채우기 — 1페이지 계획서 틀(직접 작성) + 2페이지 중요 부하 목록(자동)
   - 기본 양식(lib/report-template.js) 또는 내가 등록한 양식(.docx)
   - 양식 안의 {작성일} {정전차단기} … 표시를 채우고, 이름이 '단선도'인 그림을 실제 단선도로 바꿈
   ========================================================= */
const RP_TAGS = [
  ['{작성일}', '오늘 날짜'], ['{정전차단기}', '내리는 차단기 (여러 개면 쉼표)'], ['{정전경로}', '차단기 위치 (한전 › … )'], ['{영향동}', '정전되는 동'],
  ['{배전반수} {분전반수} {회로수}', '정전되는 배전반·분전반·회로 수'], ['{중요부하수} {일반회로수}', '중요 부하 수 · 그 밖의 일반 회로 수'],
  ['{협조팀목록}', '협조 팀 (즐겨찾기 그룹 기준, 쉼표)'],
  ['{#확인사항}{내용}{/확인사항}', '확인 사항 목록 (자동 추천) — 줄 반복'],
  ['{#중요부하}{번호} {분류} {동} {반} {명칭} {정격} {비고}{/중요부하}', '중요 부하 표 — 표 한 줄에 넣으면 줄 수만큼 반복'],
  ['{#동별}{동} {배전반} {분전반} {회로} {중요} {비상}{/동별}', '동별 영향 표 — 표 한 줄 반복'],
  ['{#협조팀}{팀} {개수}{/협조팀}', '협조 팀 표 — 표 한 줄 반복'],
  ['그림 대체 텍스트 = 정전지도', '공장 지도에 정전 구역 표시 (빨강 정전 · 주황 일부 · 초록 정상) — 생산·일반용'],
  ['그림 대체 텍스트 = 단선도', '수변전 단선도 (정전 범위 회색) — 전기 담당용'],
];
function rpChecks(D) {
  const has = c => D.imp.some(n => n.imp === c);
  return ['관련 팀에 정전 일시·범위 사전 공지',
    has('저온창고') || has('냉장·냉동·챔버') ? '저온창고·냉장/냉동/챔버 온도 유지 대책 (사전 온도 확보, 문 개폐 최소화, 필요 시 이동 보관) · 정전 중 온도 기록' : '',
    has('UPS') ? 'UPS 배터리 상태·유지 시간 확인, 부하 측 사전 셧다운 여부 협의' : '',
    has('통신·서버') ? '서버·통신 장비 셧다운/이중화 협의 (전산·통신 담당)' : '',
    has('유틸리티') ? '유틸리티 정지 영향 확인 (공조·정제수·냉각수·압축공기) 및 생산 일정 협의' : '',
    D.N.some(n => effSrc(n) === 'E') ? '비상 계통 포함 — 발전기·ATS 동작 여부 및 비상부하 영향 확인' : '',
    '작업 전 정전 → 검전 → 접지, 잠금·표시(LOTO)', '복전 순서 확인 및 복전 후 설비 재기동·이상 유무 확인'].filter(Boolean);
}
function rpTags(D) {
  const t = new Date(), sum = k => Object.values(D.byB).reduce((s, r) => s + r[k], 0);
  const blds = Object.keys(D.byB).filter(b => { const r = D.byB[b]; return r.mdb + r.pnl + r.cir + r.imp; }).sort((a, b) => S.blds.indexOf(a) - S.blds.indexOf(b));
  const cats = IMP_CATS.filter(c => D.imp.some(n => n.imp === c));
  const imp = cats.flatMap(c => D.imp.filter(n => n.imp === c));
  return {
    작성일: `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}`,
    정전차단기: D.off.map(n => label(n) + (n.cbk ? ` (${n.cbk})` : '')).join(', '),
    정전경로: D.off.map(n => pathOf(n).slice(0, -1).map(label).join(' › ')).join(' / '),
    영향동: blds.join(', '), 배전반수: sum('mdb'), 분전반수: sum('pnl'), 회로수: sum('cir'), 중요부하수: D.imp.length, 일반회로수: D.gen,
    협조팀목록: D.teams.map(([t]) => t).join(', '),
    확인사항: rpChecks(D).map(내용 => ({내용})),
    중요부하: imp.map((n, i) => ({번호: i + 1, 분류: n.imp, 동: bk(n), 반: D.host(n) ? label(D.host(n)) : '', 명칭: label(n), 정격: spec(n), 비고: effSrc(n) === 'E' ? '비상 계통' : ''})),
    동별: blds.map(b => { const r = D.byB[b]; return {동: b, 배전반: r.mdb, 분전반: r.pnl, 회로: r.cir, 중요: r.imp, 비상: r.em}; }),
    협조팀: D.teams.map(([팀, 개수]) => ({팀, 개수})),
  };
}
// 그림 PNG: 'map' = 공장 지도에 정전 구역 (생산·일반용) · 'sld' = 수변전 단선도 (전기 담당용)
function rpPng(kind) {
  const ob = FP.black; FP.black = false; let L, s;
  try {
    if (kind === 'map') { L = {W: MAP_W, H: MAP_H}; s = mapSvg({outage: true}).replace('<svg ', `<svg width="${MAP_W}" height="${MAP_H}" `); }
    else { L = sdLayout(); s = sdSvg(L, true).replace(/ width="\d+" height="\d+"/, ` width="${L.W}" height="${L.H}"`); }
  } finally { FP.black = ob; }
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => {
    const c = document.createElement('canvas'); c.width = L.W * 2; c.height = L.H * 2; const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
    c.toBlob(b => b ? b.arrayBuffer().then(a => res({buf: new Uint8Array(a), w: L.W, h: L.H})) : rej(new Error('그림 실패')), 'image/png'); };
    img.onerror = () => rej(new Error('그림 실패')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
}
// 등록한 양식 (이 PC 브라우저에 보관)
async function rpTplGet() { try { const t = await DB.get('kv', 'rpTpl'); if (t && t.b64) return t; } catch (e) {} return null; }
const b64ToBuf = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
const bufToB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
// 이름(대체 텍스트)이 '정전지도' / '단선도'인 그림을 실제 그림으로
function rpPutImage(zip, png, nm) {
  let x = zip.file('word/document.xml').asText();
  const m = x.match(new RegExp(`<w:drawing>(?:(?!<\\/w:drawing>)[\\s\\S])*?<wp:docPr[^>]*(?:descr|name|title)="${nm}"[\\s\\S]*?<\\/w:drawing>`));
  if (!m) return false;
  const dr = m[0]; if (!/r:embed="[^"]+"/.test(dr)) return false;
  // 그림마다 새 연결을 만들어서 넣음 (양식 속 그림 여러 개가 같은 파일을 같이 쓰고 있어도 안전)
  const nid = 'rIdRp' + (nm === '단선도' ? 'Sld' : 'Map'), file = `media/rp_${nm === '단선도' ? 'sld' : 'map'}.png`;
  let rels = zip.file('word/_rels/document.xml.rels').asText();
  if (!rels.includes(`Id="${nid}"`)) rels = rels.replace('</Relationships>', `<Relationship Id="${nid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${file}"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', rels);
  let ct = zip.file('[Content_Types].xml').asText();
  if (!/Extension="png"/i.test(ct)) { ct = ct.replace(/(<Types[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>'); zip.file('[Content_Types].xml', ct); }
  zip.file('word/' + file, png.buf);
  let nd = dr.replace(/r:embed="[^"]+"/, `r:embed="${nid}"`);
  // 그림 비율 맞추기 (가로 그대로, 세로 조정)
  const cx = +((dr.match(/<wp:extent cx="(\d+)"/) || [])[1] || 0);
  if (cx) { const cy = Math.round(cx * png.h / png.w); nd = nd.replace(/(<wp:extent cx="\d+" cy=")\d+/, `$1${cy}`).replace(/(<a:ext cx="\d+" cy=")\d+/, `$1${cy}`); }
  x = x.replace(dr, nd); zip.file('word/document.xml', x);
  return true;
}
async function rpWord() {
  const D = rpData(); if (!D.off.length) { rpOpen(); return; }
  if (typeof PizZip === 'undefined' || typeof docxtemplater === 'undefined') { alert('lib 폴더(문서 만들기 도구)가 없어요. 압축을 풀 때 lib 폴더도 같이 있어야 해요.'); return; }
  const mine = await rpTplGet(), buf = mine ? b64ToBuf(mine.b64) : b64ToBuf(RP_TPL_B64);
  let zip, doc;
  try {
    zip = new PizZip(buf);
    doc = new docxtemplater(zip, {paragraphLoop: true, linebreaks: true, nullGetter: () => ''});
    doc.render(rpTags(D));
  } catch (e) {
    const er = (e.properties && e.properties.errors || []).map(x => x.properties && (x.properties.explanation || x.message)).filter(Boolean);
    alert('양식을 채우지 못했어요.\n' + (er.length ? er.slice(0, 5).join('\n') : e.message) + '\n\n{ } 표시가 짝이 맞는지 확인하세요. ([표시 목록] 참고)'); return;
  }
  const z = doc.getZip();
  for (const [nm, kind] of [['정전지도', 'map'], ['단선도', 'sld']]) { try { rpPutImage(z, await rpPng(kind), nm); } catch (e) { console.warn(nm + ' 그림 넣기 실패', e); } }
  const name = D.off.map(label).join('_').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  download(z.generate({type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}), `계획정전_${name}_${stamp()}.docx`);
  toast(`계획정전 보고서(Word)를 받았어요${mine ? ` · 양식: ${mine.name}` : ' · 기본 양식'}. 1페이지 계획 내용은 Word에서 직접 쓰세요.`, false);
}
// AI(Word·PPT)에게 줄 자료
function rpAiText(D) {
  const T = rpTags(D), row = a => '| ' + a.join(' | ') + ' |';
  return [`# 계획정전 자료 (${T.작성일})`, '', '## 정전 범위', `- 내리는 차단기: ${T.정전차단기}`, `- 위치: ${T.정전경로}`, `- 영향 동: ${T.영향동}`,
    `- 영향 규모: 배전반 ${T.배전반수} · 분전반 ${T.분전반수} · 회로 ${T.회로수} · 중요 부하 ${T.중요부하수}`, '',
    '## 동별 영향', row(['동', '배전반', '분전반·MCC', '회로', '중요 부하', '비상 계통 회로']), row(Array(6).fill('---')), ...T.동별.map(r => row([r.동, r.배전반, r.분전반, r.회로, r.중요, r.비상])), '',
    `## 중요 부하 (${T.중요부하수})`, row(['No', '분류', '동', '분전반', '명칭', '정격', '비고']), row(Array(7).fill('---')), ...T.중요부하.map(r => row([r.번호, r.분류, r.동, r.반, r.명칭, r.정격, r.비고])), '',
    `## 협조 팀`, T.협조팀목록 || '(없음)', '', '## 확인 사항', ...T.확인사항.map(c => '- ' + c.내용), '',
    '※ 작업명·일시·작업 내용·책임자는 비워 두었어요. 이 자료로 계획정전 보고서를 만들어 주세요.'].join('\n');
}
async function rpCopy(t) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
}
async function rpMenu() {
  const D = rpData();
  if (!D.off.length) { rpOpen(); return; }
  const mine = await rpTplGet();
  uiModal(`<h3>📄 계획정전 보고서</h3>
    <p>정전 범위: <b>${esc(D.off.map(label).join(', '))}</b> · 회로 ${D.N.length}개 · 중요 부하 <b>${D.imp.length}</b>개</p>
    <div class="rpBig"><button data-rpa="word" class="pri">📝 Word로 받기<small>1페이지 계획서 틀(직접 작성) + 2페이지 중요 부하 목록</small></button></div>
    <div class="rpRow"><span class="muted">양식:</span> <b>${mine ? esc(mine.name) : '기본 양식'}</b>
      <button data-rpa="tplset">양식 바꾸기 (.docx)</button>${mine ? '<button data-rpa="tplreset">기본 양식으로</button>' : ''}
      <button data-rpa="tplget">📥 기본 양식 받기 (꾸미기용)</button><button data-rpa="tags">📖 표시 목록</button></div>
    <div class="rpRow"><span class="muted">AI·발표용:</span><button data-rpa="ai">📋 AI용 자료 복사</button><button data-rpa="map">🗺 정전 지도 그림</button><button data-rpa="png">🖼 단선도 그림</button><button data-rpa="csv">📊 영향 목록 엑셀</button><button data-rpa="view">👁 화면으로 보기</button></div>
    <div class="mdlA"><button data-mdl="x">닫기</button></div>`);
}
function rpTagsView() {
  uiModal(`<h3>📖 양식에 넣는 표시</h3><p>Word 양식에 아래 표시를 그대로 쓰면 앱이 채워요. <b>그 밖의 내용은 자유롭게</b> 꾸미세요 (AI Word에 "표시는 그대로 두고 꾸며줘").</p>
    <div class="mdlS"><table class="tb"><thead><tr><th>표시</th><th>들어가는 내용</th></tr></thead><tbody>${RP_TAGS.map(([a, b]) => `<tr><td><code>${esc(a)}</code></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>
    <div class="mdlA"><button data-rpa="copytags">표시 목록 복사</button><button data-mdl="x">닫기</button></div>`, true);
}
document.addEventListener('click', async e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('[data-rp]')) { rpMenu(); return; }
  const a = t.closest('[data-rpa]'); if (!a) return;
  const v = a.dataset.rpa, D = rpData();
  if (v === 'word') { uiModalClose(); rpWord(); }
  else if (v === 'view') { uiModalClose(); rpOpen(); }
  else if (v === 'ai') { await rpCopy(rpAiText(D)); toast('AI용 자료를 복사했어요. AI Word·PPT에 붙여 넣고 "이 자료로 계획정전 보고서 만들어줘"라고 하세요. 단선도 그림도 같이 넣으면 좋아요.', false); }
  else if (v === 'map') { const p = await rpPng('map'); download(new Blob([p.buf], {type: 'image/png'}), `계획정전_정전지도_${stamp()}.png`); }
  else if (v === 'png') { const p = await rpPng('sld'); download(new Blob([p.buf], {type: 'image/png'}), `계획정전_단선도_${stamp()}.png`); }
  else if (v === 'csv') download(new Blob([rpCsv(D)], {type: 'text/csv'}), `계획정전_영향목록_${stamp()}.csv`);
  else if (v === 'tplget') download(new Blob([b64ToBuf(RP_TPL_B64)], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}), '계획정전_기본양식.docx');
  else if (v === 'tags') rpTagsView();
  else if (v === 'copytags') { await rpCopy(RP_TAGS.map(r => r.join('  — ')).join('\n')); toast('표시 목록을 복사했어요.', false); }
  else if (v === 'tplreset') { try { await DB.del('kv', 'rpTpl'); } catch (e2) {} rpMenu(); toast('기본 양식으로 돌렸어요.', false); }
  else if (v === 'tplset') {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.docx';
    i.onchange = async () => { const f = i.files[0]; if (!f) return; const u = new Uint8Array(await f.arrayBuffer());
      try { new docxtemplater(new PizZip(u), {paragraphLoop: true, linebreaks: true}); } catch (e3) { alert('이 파일을 양식으로 쓸 수 없어요.\n' + ((e3.properties && e3.properties.errors || []).map(x => x.properties && x.properties.explanation).filter(Boolean).slice(0, 5).join('\n') || e3.message)); return; }
      await DB.put('kv', 'rpTpl', {name: f.name, at: Date.now(), b64: bufToB64(u)}); rpMenu(); toast(`양식 "${f.name}"을 등록했어요. 이 PC 브라우저에 보관돼요.`, false); };
    i.click();
  }
});
(function () { const s = document.createElement('style');
  s.textContent = `#mdl .rpBig button{width:100%;padding:12px;border-radius:10px;border:0;background:#262f7d;color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
#mdl .rpBig small{font-weight:normal;font-size:11.5px;color:#c7d2fe}
#mdl .rpRow{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:10px;font-size:12.5px}
#mdl .rpRow button{padding:5px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font-size:12px}
#mdl code{background:#f1f5f9;padding:1px 4px;border-radius:4px;font-size:11.5px}`;
  document.head.appendChild(s); })();
