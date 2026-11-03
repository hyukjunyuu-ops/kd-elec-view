/* =========================================================
   home.js — 홈: 매일 열어보는 화면
   ① 오늘 순찰 (진행 · 남은 전기실)
   ② 확인할 것: 기준 초과(온도·습도·전압·역률) · 평소와 다름(최근 2주 중간값 ±20%) · 미조치 외관 이상 [조치 완료]
   ③ 배전반 상태: 순찰 계측 최근 값 + 2주 미니 그래프 · 누르면 30일 그래프
   ④ 전기실 온·습도 (7일)
   ⑤ 계통 조사 진행 (동별) · 최근 본 반
   조치 완료 기록은 S.cfg.ptAck → 계통 동기화로 3명이 같이 봐요
   ========================================================= */

const HM = {open: '', k: 'kW', dev: 20};
const hmNum = v => v !== '' && v != null && !isNaN(+v);
const hmMed = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y), n = s.length; return !n ? NaN : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const hmDate = (d, k) => { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + k); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const hmMD = d => d.slice(5).replace('-', '/');
const hmAck = () => (S.cfg.ptAck = S.cfg.ptAck || {});

// 전기실마다 하루 마지막 기록 (날짜순)
function hmDaily() {
  const by = {};
  (typeof ptAll === 'function' ? ptAll() : []).forEach(r => { const R = by[r.room] = by[r.room] || {}; if (!R[r.d] || R[r.d].ts < r.ts) R[r.d] = r; });
  const out = {}; Object.keys(by).forEach(k => { out[k] = Object.keys(by[k]).sort().map(d => ({d, r: by[k][d]})); });
  return out;
}
// 배전반 하나의 날짜별 값
const hmPanel = (A, n) => A.map(({d, r}) => { const p = (r.P || []).find(x => x.n === n); return p ? {d, V: p.V, A: p.A, kW: p.kW, PF: p.PF, nv: p.nv} : null; }).filter(Boolean);

function hmIssues(c, RD) {
  const L = c.lim, out = [], today = ptToday(), recent = hmDate(today, -2), ack = hmAck();
  c.rooms.forEach(rm => {
    const A = RD[rm.id] || [], last = A[A.length - 1]; if (!last || last.d < recent) return;
    const r = last.r, nm = rm.name.replace(/ 전기실$/, ''), when = last.d === today ? '' : ` (${hmMD(last.d)})`;
    const rise = k => { const v = A.slice(-3).map(x => +x.r[k]); return v.length === 3 && v.every(Number.isFinite) && v[0] < v[1] && v[1] < v[2] ? ' · 3일째 상승' : ''; };
    if (hmNum(r.t) && +r.t >= L.tHi) out.push({lv: 2, t: `${nm} 전기실 온도 ${r.t}℃${when}`, s: `기준 ${L.tHi}℃${rise('t')}`, room: rm.id});
    if (hmNum(r.h) && +r.h >= L.hHi) out.push({lv: 2, t: `${nm} 전기실 습도 ${r.h}%${when}`, s: `기준 ${L.hHi}%${rise('h')}`, room: rm.id});
    (r.P || []).forEach(p => {
      const nv = pV(p.nv), kv = nv >= 1000 && +p.V < 100;
      if (hmNum(p.V) && nv && Math.abs(ptVolt(p.V, nv) - nv) / nv * 100 > L.vTol) out.push({lv: 2, t: `${p.n} 전압 ${p.V}${kv ? 'kV' : 'V'}${when}`, s: `정격 ${p.nv} ±${L.vTol}%`, room: rm.id});
      if (hmNum(p.PF) && +p.PF > 0 && +p.PF < L.pfLo) out.push({lv: 1, t: `${p.n} 역률 ${p.PF}${when}`, s: `기준 ${L.pfLo}`, room: rm.id});
      // 평소와 다름: 그날 전 14일 중간값과 비교 (3번 이상 쌓였을 때만)
      const H = hmPanel(A.filter(x => x.d < last.d && x.d >= hmDate(last.d, -14)), p.n);
      for (const [k, u, w] of [['A', 'A', '전류'], ['kW', 'kW', '전력']]) {
        if (!hmNum(p[k])) continue;
        const med = hmMed(H.map(x => hmNum(x[k]) ? +x[k] : NaN)), n = H.filter(x => hmNum(x[k])).length;
        if (n >= 3 && med > 0) { const pc = (+p[k] - med) / med * 100; if (Math.abs(pc) >= HM.dev) { out.push({lv: 1, t: `${p.n} ${w} ${p[k]}${u}${when}`, s: `평소 ${Math.round(med * 10) / 10}${u}보다 ${pc > 0 ? '+' : ''}${Math.round(pc)}%`, room: rm.id}); break; } }
      }
    });
  });
  // 외관 점검 '이상' — [조치 완료] 할 때까지 (최근 35일)
  (typeof ptAll === 'function' ? ptAll() : []).forEach(r => Object.entries(r.items || {}).forEach(([k, v]) => {
    if (v !== 'bad') return; const key = r.id + '|' + k; if (ack[key]) return;
    out.push({lv: 0, t: `${hmMD(r.d)} ${String(r.rn || '').replace(/ 전기실$/, '')} ${k} 이상`, s: [(r.im || {})[k], r.who].filter(Boolean).join(' · '), ack: key, room: r.room});
  }));
  return out.sort((a, b) => b.lv - a.lv);
}

// 미니 그래프
function hmSpark(vals, w, h, col, hi) {
  const v = vals.map(x => hmNum(x) ? +x : NaN), ok = v.filter(Number.isFinite);
  if (ok.length < 2) return `<span class="hmNo">${ok.length ? '쌓이는 중' : '—'}</span>`;
  const mn = Math.min(...ok), mx = Math.max(...ok), sp = mx - mn || 1, X = i => 2 + i * (w - 4) / Math.max(1, v.length - 1), Y = x => h - 3 - (x - mn) / sp * (h - 6);
  const pts = v.map((x, i) => Number.isFinite(x) ? `${X(i).toFixed(1)},${Y(x).toFixed(1)}` : null).filter(Boolean);
  const li = v.length - 1 - [...v].reverse().findIndex(Number.isFinite);
  return `<svg class="hmSp" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`
    + v.map((x, i) => Number.isFinite(x) && hi != null && x >= hi ? `<circle cx="${X(i)}" cy="${Y(x)}" r="2.4" fill="#dc2626"/>` : '').join('')
    + `<circle cx="${X(li)}" cy="${Y(v[li])}" r="2.6" fill="${col}"/></svg>`;
}
// 30일 그래프
function hmChart(S30, k, pfLo) {
  const W = 640, H = 170, l = 44, r = 12, t = 12, b = 26, v = S30.map(x => hmNum(x[k]) ? +x[k] : NaN), ok = v.filter(Number.isFinite);
  if (ok.length < 2) return '<div class="hmNo" style="padding:18px">30일 동안 기록이 2번 이상 쌓이면 그래프가 나와요.</div>';
  let mn = Math.min(...ok), mx = Math.max(...ok); if (k === 'PF') { mn = Math.min(mn, pfLo - .02); mx = Math.max(mx, 1); }
  const pad = (mx - mn) * .12 || 1; mn -= pad; mx += pad;
  const X = i => l + i * (W - l - r) / Math.max(1, v.length - 1), Y = x => t + (mx - x) / (mx - mn) * (H - t - b), f = x => Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100;
  const pts = v.map((x, i) => Number.isFinite(x) ? [X(i), Y(x), x, S30[i].d] : null).filter(Boolean);
  return `<svg class="hmCh" viewBox="0 0 ${W} ${H}" width="100%">${[0, .5, 1].map(a => { const y = t + a * (H - t - b), val = mx - a * (mx - mn); return `<line x1="${l}" x2="${W - r}" y1="${y}" y2="${y}" stroke="#eef0f4"/><text x="${l - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${f(val)}</text>`; }).join('')}
    ${k === 'PF' ? `<line x1="${l}" x2="${W - r}" y1="${Y(pfLo)}" y2="${Y(pfLo)}" stroke="#f97316" stroke-dasharray="5 4"/><text x="${W - r}" y="${Y(pfLo) - 4}" text-anchor="end" font-size="10" fill="#f97316">기준 ${pfLo}</text>` : ''}
    <polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="#262f7d" stroke-width="2.2" stroke-linejoin="round"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#fff" stroke="#262f7d" stroke-width="2"><title>${hmMD(p[3])} · ${p[2]}${k === 'PF' ? '' : k}</title></circle>`).join('')}
    <text x="${l}" y="${H - 6}" font-size="10" fill="#94a3b8">${hmMD(S30[0].d)}</text><text x="${W - r}" y="${H - 6}" text-anchor="end" font-size="10" fill="#94a3b8">${hmMD(S30[S30.length - 1].d)}</text></svg>`;
}

// 계통 조사 진행 (동별)
function hmSurvey() {
  const by = {};
  S.nodes.forEach(n => {
    if (isSlot(n)) return; const b = bk(n); if (!b) return; const o = by[b] = by[b] || {c: 0, nm: 0, rt: 0, ty: 0, p: 0, loc: 0};
    if ((n.type === 'LOAD' || n.type === 'CB') && !kids(n.id).length && !ckSpare(n)) { o.c++; if (!ckNoLabel(n)) o.nm++; if (n.rating) o.rt++; if (typeof pvKind !== 'function' || pvKind(n) !== 'U') o.ty++; }
    if (typeof PL_P === 'function' && PL_P(n.type)) { o.p++; if (typeof plOnF === 'function' && plOnF(n)) o.loc++; }
  });
  return Object.entries(by).filter(([, o]) => o.c + o.p).map(([b, o]) => ({b, o, pc: o.c ? Math.round((o.nm + o.rt + o.ty) / (3 * o.c) * 100) : 0})).sort((a, c) => (c.o.c + c.o.p) - (a.o.c + a.o.p)).slice(0, 8);
}

homeView = function () {
  const d = new Date(), wd = '일월화수목금토'[d.getDay()], c = ptCfg(), RD = hmDaily(), today = ptToday();
  // ① 오늘 순찰
  const R = c.rooms.map(rm => ({rm, r: ptTodayOf(rm.id)})), done = R.filter(x => x.r).length, left = R.filter(x => !x.r);
  // ② 확인할 것
  const I = hmIssues(c, RD);
  // ③ 배전반 상태
  const rows = c.rooms.flatMap(rm => (rm.panels || []).map(p => {
    const A = RD[rm.id] || [], S14 = hmPanel(A.filter(x => x.d >= hmDate(today, -13)), p.n), all = hmPanel(A, p.n), L = all[all.length - 1];
    const k = S14.some(x => hmNum(x.kW)) ? 'kW' : 'A', prev = all.slice(0, -1).slice(-14), med = L && hmNum(L[k]) ? hmMed(prev.map(x => hmNum(x[k]) ? +x[k] : NaN)) : NaN;
    const ch = L && Number.isFinite(med) && med > 0 && prev.filter(x => hmNum(x[k])).length >= 3 ? Math.round((+L[k] - med) / med * 100) : null;
    return {rm, p, L, S14, k, ch, key: rm.id + '|' + p.n, all};
  }));
  // ④ 온·습도
  const th = c.rooms.map(rm => { const A = (RD[rm.id] || []).filter(x => x.d >= hmDate(today, -6)), L = A[A.length - 1]; return {rm, A, L}; });
  const sv = hmSurvey(), rec = thRecent().map(byId).filter(Boolean).slice(0, 6);
  const bkDays = typeof BK !== 'undefined' && BK.t ? Math.floor((Date.now() - BK.t) / 864e5) : -1, sy = document.getElementById('syncSt');
  const nm = rm => esc(rm.name.replace(/ 전기실$/, ''));
  const f = v => hmNum(v) ? esc(v) : '<span class="hmNo">—</span>';

  return `<div class="thHome hm"><div class="thHh"><div class="mu">${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})</div><h1>오늘 현황</h1></div>
    <a class="hmPt" data-t2="pat"><b>${thIc('pat', 16)} 오늘 순찰</b><span class="hmBar">${R.map(x => `<i class="${x.r ? (x.r.bad || []).length ? 'wn' : 'ok' : ''}"></i>`).join('')}</span><b class="n">${done}/${R.length}</b>
      <span class="hmLeft">${left.length ? '남은 곳: ' + left.map(x => `<span data-hmroom="${esc(x.rm.id)}">${nm(x.rm)}</span>`).join('') : '✔ 오늘 순찰 끝'}</span></a>

    <div class="thC hmI"><div class="thCh"><b>⚠ 확인할 것${I.length ? ` <span class="hmCnt">${I.length}</span>` : ''}</b><span class="sp"></span><span class="mu">기준 초과 · 평소와 다름(최근 2주 중간값 ±${HM.dev}%) · 미조치 이상</span></div>
      ${I.length ? I.slice(0, 12).map(x => `<div class="hmIt lv${x.lv}"><span class="dot"></span><div class="s"><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ''}</div>${x.ack ? `<button data-hmack="${esc(x.ack)}">조치 완료</button>` : x.room ? `<button data-hmroom="${esc(x.room)}" class="ln">기록 보기</button>` : ''}</div>`).join('')
        + (I.length > 12 ? `<div class="mu" style="padding:6px 4px">… 그 밖에 ${I.length - 12}건</div>` : '')
        : `<div class="hmOk">✔ 확인할 것 없음 <span class="mu">— 최근 순찰 값이 모두 기준 안이고 미조치 이상도 없어요</span></div>`}</div>

    <div class="thC"><div class="thCh"><b>배전반 상태</b><span class="mu" style="margin-left:6px">순찰 계측 · 최근 값</span><span class="sp"></span><span class="mu">행을 누르면 30일 그래프</span></div>
      ${rows.length ? `<table class="hmT"><thead><tr><th>반</th><th>전기실</th><th>V</th><th>A</th><th>kW</th><th>PF</th><th>최근 2주</th><th>변화</th></tr></thead><tbody>${rows.map(x => {
        const L = x.L || {}, old = x.L && x.L.d < hmDate(today, -2), pfBad = hmNum(L.PF) && +L.PF > 0 && +L.PF < c.lim.pfLo;
        return `<tr data-hmrow="${esc(x.key)}" class="${HM.open === x.key ? 'on' : ''}"><td><b>${esc(x.p.n)}</b></td><td>${nm(x.rm)}${old ? ` <span class="hmNo">${hmMD(x.L.d)}</span>` : ''}</td><td>${f(L.V)}</td><td>${f(L.A)}</td><td>${f(L.kW)}</td><td${pfBad ? ' class="bad"' : ''}>${f(L.PF)}</td>
          <td>${hmSpark(x.S14.map(y => y[x.k]), 96, 22, '#262f7d')} <span class="hmNo">${x.k}</span></td><td class="${x.ch == null ? '' : Math.abs(x.ch) >= HM.dev ? 'bad' : ''}">${x.ch == null ? '<span class="hmNo">—</span>' : (x.ch > 0 ? '▲' : x.ch < 0 ? '▼' : '') + Math.abs(x.ch) + '%'}</td></tr>`
          + (HM.open === x.key ? `<tr class="hmX"><td colspan="8"><div class="hmXb"><span class="seg">${['kW', 'A', 'PF', 'V'].map(k => `<button data-hmk="${k}" class="${HM.k === k ? 'on' : ''}">${k}</button>`).join('')}</span><span class="mu">최근 30일 · 하루 마지막 순찰 값</span></div>${hmChart(x.all.filter(y => y.d >= hmDate(today, -29)), HM.k, c.lim.pfLo)}</td></tr>` : '');
      }).join('')}</tbody></table>` : `<div class="mu" style="padding:12px 4px">순찰 설정에서 전기실마다 계측할 배전반을 넣으면 여기 나와요. <a data-t2="pat">순찰 설정 열기</a></div>`}</div>

    <div class="thC"><div class="thCh"><b>전기실 온·습도</b><span class="mu" style="margin-left:6px">최근 7일</span></div>
      <div class="hmTh">${th.map(({rm, A, L}) => { const hot = L && hmNum(L.r.t) && +L.r.t >= c.lim.tHi;
        return `<div class="hmTc${hot ? ' hot' : ''}" data-hmroom="${esc(rm.id)}"><b>${nm(rm)}</b><div class="v">${L && hmNum(L.r.t) ? `<em>${esc(L.r.t)}℃</em>` : '<span class="hmNo">최근 7일 기록 없음</span>'}${L && hmNum(L.r.h) ? ` <small>${esc(L.r.h)}%</small>` : ''}</div>${L ? hmSpark(A.map(x => x.r.t), 110, 22, hot ? '#dc2626' : '#0f766e', c.lim.tHi) : ''}</div>`; }).join('')}</div></div>

    <div class="thTwo"><div class="thC"><div class="thCh"><b>계통 조사 진행</b><span class="sp"></span><span class="mu">회로 이름·정격·형식 입력률</span></div>
      ${sv.length ? sv.map(({b, o, pc}) => `<div class="hmSv"><b>${esc(b)}</b><span class="hmSb"><i style="width:${pc}%;background:${pc >= 90 ? 'var(--ok)' : pc >= 60 ? '#3b82f6' : '#f59e0b'}"></i></span><em>${pc}%</em>
        <small>회로 ${o.c} · 이름 ${o.c ? Math.round(o.nm / o.c * 100) : 0}% · 정격 ${o.c ? Math.round(o.rt / o.c * 100) : 0}% · 형식 ${o.c ? Math.round(o.ty / o.c * 100) : 0}% · 반 위치 ${o.loc}/${o.p}</small></div>`).join('') : '<div class="mu" style="padding:12px 0">아직 계통 데이터가 없어요.</div>'}</div>
      <div class="thC"><div class="thCh"><b>최근 본 반</b></div>
        ${rec.length ? rec.map(n => { const K = typeof pvKindOf === 'function' ? pvKindOf(n) : {l: n.type, c: '#475569'};
          return `<div class="thLi" data-hgo="${esc(n.id)}"><span class="thTy" style="color:${K.c};background:${K.c}18">${esc(K.l)}</span><div class="s"><b>${esc(label(n))}</b><small>${esc(bk(n))} · 회로 ${kids(n.id).filter(k => !isSlot(k)).length}</small></div></div>`; }).join('')
          : '<div class="mu" style="padding:12px 0">트리에서 반을 고르면 여기 쌓여요.</div>'}</div></div>
    <div class="hmFt">${sy && sy.textContent ? esc(sy.textContent) + ' · ' : ''}<a data-bk="1">백업 ${bkDays < 0 ? '받은 적 없음' : bkDays ? bkDays + '일 전' : '오늘'}</a>${c.url ? '' : ' · 순찰 기록이 이 PC에만 있어요 (구글 시트 연결 전)'}</div></div>`;
};

document.addEventListener('click', e => {
  const t = e.target; if (!t.closest || !t.closest('.hm')) return;
  const a = t.closest('[data-hmack]');
  if (a) { e.preventDefault(); e.stopPropagation(); const m = prompt('조치 내용 (선택 · 비워도 돼요)', ''); if (m === null) return;
    hmAck()[a.dataset.hmack] = {by: (typeof ptWho === 'function' && ptWho()) || (typeof syWho === 'function' && syWho()) || '', at: Date.now(), m: m.trim()}; save(); renderView(); toast('조치 완료로 기록했어요.', false); return; }
  const rm = t.closest('[data-hmroom]'); if (rm) { e.preventDefault(); e.stopPropagation(); if (typeof ptOpenRoom === 'function') { ptOpenRoom(rm.dataset.hmroom); renderAll(); } return; }
  const k = t.closest('[data-hmk]'); if (k) { HM.k = k.dataset.hmk; renderView(); return; }
  const r = t.closest('[data-hmrow]'); if (r) { HM.open = HM.open === r.dataset.hmrow ? '' : r.dataset.hmrow; renderView(); }
}, true);

(function () {
  const s = document.createElement('style');
  s.textContent = `
.hm .hmPt{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--ln);border-radius:16px;padding:12px 16px;margin-bottom:14px;color:inherit;text-decoration:none;cursor:pointer}
.hm .hmPt b{display:inline-flex;align-items:center;gap:6px;font-size:14px}.hm .hmPt b.n{font-size:18px}
.hm .hmBar{display:flex;gap:3px}.hm .hmBar i{width:22px;height:10px;border-radius:3px;background:#e5e7eb}.hm .hmBar i.ok{background:#16a34a}.hm .hmBar i.wn{background:#f59e0b}
.hm .hmLeft{font-size:12.5px;color:var(--mu)}.hm .hmLeft span{display:inline-block;margin:0 3px;padding:1px 8px;border-radius:999px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;cursor:pointer}
.hm .thC{margin-bottom:14px}.hm .hmCnt{background:#dc2626;color:#fff;border-radius:999px;padding:0 8px;font-size:12px;margin-left:4px}
.hm .hmIt{display:flex;align-items:center;gap:10px;padding:8px 6px;border-top:1px solid var(--ln)}.hm .hmIt:first-of-type{border-top:0}
.hm .hmIt .dot{width:10px;height:10px;border-radius:50%;flex:none;background:#cbd5e1}.hm .hmIt.lv2 .dot{background:#dc2626}.hm .hmIt.lv1 .dot{background:#f59e0b}.hm .hmIt.lv0 .dot{background:#94a3b8}
.hm .hmIt .s{flex:1;min-width:0}.hm .hmIt b{font-size:13.5px}.hm .hmIt.lv2 b{color:#b91c1c}.hm .hmIt small{display:block;color:var(--mu);font-size:12px}
.hm .hmIt button{padding:4px 11px;border-radius:8px;border:1px solid #262f7d;background:#262f7d;color:#fff;font-size:12px;cursor:pointer;flex:none}.hm .hmIt button.ln{background:#fff;color:#262f7d;border-color:#c7d2fe}
.hm .hmOk{padding:10px 4px;color:#067647;font-weight:700}
.hm .hmT{width:100%;border-collapse:collapse;font-size:13px}.hm .hmT th{text-align:left;color:var(--mu);font-weight:600;font-size:12px;padding:6px 8px;border-bottom:1px solid var(--ln)}
.hm .hmT td{padding:6px 8px;border-bottom:1px solid #f1f3f7;white-space:nowrap}.hm .hmT tr[data-hmrow]{cursor:pointer}.hm .hmT tr[data-hmrow]:hover,.hm .hmT tr.on{background:#f5f7ff}
.hm .hmT td.bad{color:#c2410c;font-weight:700}.hm .hmT .hmSp{vertical-align:middle}.hm .hmNo{color:#a0a7b4;font-size:11.5px}
.hm .hmX td{background:#fafbff;padding:8px 10px 10px}.hm .hmXb{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.hm .seg button{padding:3px 11px;border:1px solid #d6dbe8;background:#fff;font-size:12px;cursor:pointer}.hm .seg button:first-child{border-radius:7px 0 0 7px}.hm .seg button:last-child{border-radius:0 7px 7px 0}.hm .seg button.on{background:#262f7d;color:#fff;border-color:#262f7d}
.hm .hmCh{display:block;max-width:760px}
.hm .hmTh{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.hm .hmTc{border:1px solid var(--ln);border-radius:12px;padding:8px 10px;cursor:pointer}.hm .hmTc:hover{border-color:#c7d2fe}.hm .hmTc.hot{border-color:#fca5a5;background:#fef2f2}
.hm .hmTc b{font-size:12.5px}.hm .hmTc .v em{font-style:normal;font-size:18px;font-weight:800}.hm .hmTc.hot .v em{color:#dc2626}.hm .hmTc .v small{color:var(--mu)}
.hm .hmSv{display:grid;grid-template-columns:80px 1fr 40px;align-items:center;gap:4px 10px;padding:7px 0;border-top:1px solid var(--ln)}.hm .hmSv:first-of-type{border-top:0}
.hm .hmSv b{font-size:13px}.hm .hmSv em{font-style:normal;font-weight:800;font-size:13px;text-align:right}.hm .hmSv small{grid-column:1/-1;color:var(--mu);font-size:11.5px}
.hm .hmSb{height:8px;background:var(--bg);border-radius:5px;overflow:hidden}.hm .hmSb i{display:block;height:100%}
.hm .hmFt{color:var(--mu);font-size:12px;margin:6px 2px 20px}.hm .hmFt a{cursor:pointer;text-decoration:underline}`;
  document.head.appendChild(s);
})();
