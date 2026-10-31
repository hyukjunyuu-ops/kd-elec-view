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
  const ob = FP.black; FP.black = false; let svg = ''; try { svg = sdSvg(sdLayout(), true); } finally { FP.black = ob; }
  svg = svg.replace(/ width="\d+" height="\d+"/, ' width="100%"');
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
  <div class="dia" style="margin-top:8px">${svg}</div><div class="note">회색 = 정전되는 범위 (한전 ~ 배전반까지 그림. 그 아래 분전반·부하는 아래 표)</div>
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
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-rp]')) rpOpen(); });
