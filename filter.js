/* ===== 필터 칩 · 필터 엑셀 (filter.js) 시작 ===== */
(function(){
  var K='ckd_elec2_flt';
  var F={open:false,bld:[],v:[],ty:[],cb:[],em:false,gap:[],chk:false};
  try{Object.assign(F,JSON.parse(localStorage.getItem(K)||'{}'));}catch(e){}
  function saveF(){try{localStorage.setItem(K,JSON.stringify(F));}catch(e){}}

  /* ---------- 값 읽기 ---------- */
  var GAPS={nm:'이름 없음',cbk:'형식 없음',rt:'정격 없음',bd:'동 미지정'};
  function vfmt(s){var v=pV(s);if(!v)return '';return v>=1000?(+(v/1000).toFixed(2))+'kV':v+'V';}
  function vOf(n){try{return vfmt(n.type==='TR'?(n.v2||''):effV(n));}catch(e){return '';}}
  function bOf(n){return effBld(n)||'(미지정)';}
  function tOf(n){return (TYPES[n.type]||{l:n.type}).l;}
  function cOf(n){return n.type==='CB'?(n.cbk||'(미지정)'):'';}
  function isE(n){try{return effSrc(n)==='E';}catch(e){return false;}}
  function gapOk(n,g){
    if(g==='nm')return !n.name&&!n.no;
    if(g==='cbk')return n.type==='CB'&&!n.cbk;
    if(g==='rt')return n.type==='CB'&&!String(n.rating||'').trim();
    if(g==='bd')return !effBld(n);
    return false;}
  var G={
    bld:function(n,a){return a.indexOf(bOf(n))>=0;},
    v:function(n,a){return a.indexOf(vOf(n))>=0;},
    ty:function(n,a){return a.indexOf(tOf(n))>=0;},
    cb:function(n,a){return a.indexOf(cOf(n))>=0;},
    gap:function(n,a){return a.some(function(g){return gapOk(n,g);});}
  };
  function pass(n,skip){
    for(var g in G){if(g===skip||!F[g].length)continue;if(!G[g](n,F[g]))return false;}
    if(skip!=='em'&&F.em&&!isE(n))return false;
    return true;}
  function nOn(){return F.bld.length+F.v.length+F.ty.length+F.cb.length+F.gap.length+(F.em?1:0);}
  function active(){return nOn()>0;}
  function startMode(){return F.bld.length>0||F.v.length>0;}
  function passStart(n){return (!F.bld.length||G.bld(n,F.bld))&&(!F.v.length||G.v(n,F.v));}
  function restOn(){return F.ty.length>0||F.cb.length>0||F.gap.length>0||F.em;}

  /* ---------- 걸린 항목 · 시작점 계산 ---------- */
  function model(){
    var st=startMode(),M=new Set(),show=new Set(),roots=[];
    S.nodes.forEach(function(n){if(pass(n))M.add(n.id);});
    M.forEach(function(id){
      for(var c=byId(id),g=0;c&&g<200&&!show.has(c.id);g++){if(st&&!passStart(c))break;show.add(c.id);c=par(c);}
    });
    (function dfs(pid){kids(pid).forEach(function(n){
      var p=par(n);
      if(st){if(passStart(n)&&!(p&&passStart(p))&&show.has(n.id))roots.push(n);}
      else if(!pid&&show.has(n.id))roots.push(n);
      dfs(n.id);
    });})('');
    return {M:M,show:show,roots:roots,st:st};
  }

  /* ---------- 트리 그리기 ---------- */
  var FO=new Set();
  function rows(){
    var md=model(),rest=restOn(),big=rest&&md.M.size>200,vis={match:md.M,show:md.show},out=[];
    function rr(n,d){
      var h=rowHtml(n,d,vis).replace(/<span class="fz"[^>]*>⤵<\/span>/,'');
      if(rest)h=h.replace(/<span class="tg" data-tg="[^"]*">[▾▸]<\/span>/,'<span class="tg">▾</span>');
      return h;}
    out.push('<div class="sCnt">필터 결과 '+md.M.size+'개'+(md.st?' · 시작점 '+md.roots.length+'곳':'')+(big?' · 부하는 접어서 표시':'')+'</div>');
    function rec(pid,d){var L=0;
      kids(pid).forEach(function(n){
        if(md.st&&!passStart(n))return;
        if(rest&&!md.show.has(n.id))return;
        if(big&&n.type==='LOAD'&&!FO.has(pid)){L++;return;}
        out.push(rr(n,d));
        if(rest||UI.open.has(n.id))rec(n.id,d+1);
      });
      if(L)out.push('<div class="fLd" data-fld="'+esc(pid)+'" style="padding-left:'+(4+d*16)+'px">└ 부하 '+L+'개 펼치기 ▸</div>');
    }
    md.roots.forEach(function(r){
      if(md.st){var P=pathOf(r).slice(0,-1).map(label);
        if(P.length)out.push('<div class="fPath" title="'+esc(P.join(' › '))+'">'+esc((P.length>3?'… › ':'')+P.slice(-3).join(' › '))+' ›</div>');}
      out.push(rr(r,0));
      if(rest||UI.open.has(r.id))rec(r.id,1);
    });
    if(!md.roots.length)out.push('<div class="empty">조건에 맞는 항목이 없어요.</div>');
    return out.join('');
  }
  function cutSearch(){
    var t=$('#tree'),k=0;
    t.querySelectorAll('.srow').forEach(function(r){var x=byId(r.dataset.id);if(x&&pass(x))k++;else r.remove();});
    var c=t.querySelector('.sCnt');if(c)c.textContent='검색 + 필터 결과 '+k+'개';
    if(!k&&!t.querySelector('.empty'))t.insertAdjacentHTML('beforeend','<div class="empty">필터 조건에 맞는 검색 결과가 없어요.</div>');
  }
  var _rt=renderTree;
  renderTree=function(){
    var q=($('#search').value||'').trim();
    if(!active()||q){_rt.apply(this,arguments);if(q&&active())cutSearch();paint();return;}
    renderEditBar();$('#tree').innerHTML=rows();paint();
  };

  /* ---------- 칩 칸 ---------- */
  function opts(g){
    var a=[],seen={};function add(x){if(x&&!seen[x]){seen[x]=1;a.push(x);}}
    if(g==='bld'){var hb={};S.nodes.forEach(function(n){hb[bOf(n)]=1;});(S.blds||[]).forEach(function(b){if(hb[b])add(b);});Object.keys(hb).forEach(add);}
    else if(g==='v'){S.nodes.forEach(function(n){add(vOf(n));});a.sort(function(x,y){return pV(y)-pV(x);});}
    else if(g==='ty'){TYPE_ORDER.forEach(function(k){if(S.nodes.some(function(n){return n.type===k;}))add(TYPES[k].l);});}
    else if(g==='cb'){S.nodes.forEach(function(n){if(n.type==='CB')add(cOf(n));});
      a.sort(function(x,y){var i=CBK.indexOf(x),j=CBK.indexOf(y);return (i<0?99:i)-(j<0?99:j);});}
    F[g].forEach(add);
    return a;}
  function counts(g,fn){var c={};S.nodes.forEach(function(n){if(!pass(n,g))return;fn(n).forEach(function(k){c[k]=(c[k]||0)+1;});});return c;}
  function chip(g,o,lab,c,on,cls){
    return '<span class="fc'+(on?' on':'')+(!c&&!on?' z':'')+(cls?' '+cls:'')+'" data-g="'+g+'" data-o="'+esc(o)+'">'+esc(lab)+'<i>'+(c||0)+'</i></span>';}
  function paint(){
    var P=document.getElementById('fltP'),B=document.getElementById('fltB');if(!P||!B)return;
    var n=nOn();B.textContent='⚲ 필터'+(n?' '+n:'');B.classList.toggle('on',n>0);
    var tv=$('#tree');P.hidden=!F.open||!tv||getComputedStyle(tv).display==='none';
    if(P.hidden)return;
    var sc=P.scrollTop,s='';
    [['bld','동',function(n){return [bOf(n)];}],
     ['v','전압',function(n){var v=vOf(n);return v?[v]:[];}],
     ['ty','종류',function(n){return [tOf(n)];}],
     ['cb','형식',function(n){return n.type==='CB'?[cOf(n)]:[];}]].forEach(function(r){
      var o=opts(r[0]);if(!o.length)return;var c=counts(r[0],r[2]);
      s+='<div class="fg"><b>'+r[1]+'</b>'+o.map(function(x){return chip(r[0],x,x,c[x],F[r[0]].indexOf(x)>=0);}).join('')+'</div>';
    });
    var ce=counts('em',function(n){return isE(n)?['E']:[];}),
        cg=counts('gap',function(n){return Object.keys(GAPS).filter(function(k){return gapOk(n,k);});});
    s+='<div class="fg"><b>기타</b>'+chip('em','E','비상만',ce.E,F.em,'e')+
      Object.keys(GAPS).map(function(k){return chip('gap',k,GAPS[k],cg[k],F.gap.indexOf(k)>=0);}).join('')+'</div>';
    s+='<div class="fa"><label title="엑셀에 점검일·확인·특이사항 빈 칸 추가"><input type="checkbox" id="fChk"'+(F.chk?' checked':'')+'> 점검표 칸</label>'+
      '<span class="sp"></span><button data-fa="xls">📊 엑셀</button><button data-fa="clr">초기화</button></div>';
    P.innerHTML=s;P.scrollTop=sc;
  }

  /* ---------- 엑셀 ---------- */
  function xls(){
    var q=($('#search').value||'').trim().toLowerCase();
    if(!active()&&!q){alert('필터 칩을 고르거나 검색어를 넣은 뒤 눌러 주세요.');return;}
    function hit(n){return (!active()||pass(n))&&(!q||[n.no,n.name,n.model,n.loc,n.note,n.cbk].join(' ').toLowerCase().includes(q));}
    var L=[];(function dfs(pid){kids(pid).forEach(function(n){if(hit(n))L.push(n);dfs(n.id);});})('');
    if(!L.length){alert('내보낼 항목이 없어요.');return;}
    function nv(v){v=String(v==null?'':v).trim();return /^\d+(\.\d+)?$/.test(v)?+v:v;}
    var H=['단계','종류','차단기 형식','번호','명칭','정격(A)','극수','kW','동','전압','전원','설치 위치','소속(바로 위)','상위 경로','비고'];
    if(F.chk)H=H.concat(['점검일','확인(○/×)','특이사항']);
    var R=[H];
    L.forEach(function(n){var P=pathOf(n),p=par(n);
      var v=n.type==='TR'?((effV(n)||'?')+' → '+(n.v2||'?')):vOf(n);
      var r=[P.length,tOf(n),n.cbk||'',n.no||'',n.name||'',nv(n.rating),nv(n.poles),nv(n.kw),effBld(n),v,SRC[effSrc(n)]||'',n.loc||'',p?label(p):'',P.slice(0,-1).map(label).join(' › '),n.note||''];
      if(F.chk)r=r.concat(['','','']);R.push(r);});
    var S2=[['항목','값']];
    [['동',F.bld],['전압',F.v],['종류',F.ty],['형식',F.cb],['빈칸',F.gap.map(function(k){return GAPS[k];})]].forEach(function(x){if(x[1].length)S2.push([x[0],x[1].join(', ')]);});
    if(F.em)S2.push(['전원','비상만']);if(q)S2.push(['검색어',q]);
    S2.push(['출력일',new Date().toLocaleString('ko-KR')]);S2.push(['항목 수',L.length]);
    function grp(t,fn){var c={};L.forEach(function(n){var k=fn(n);if(k)c[k]=(c[k]||0)+1;});var ks=Object.keys(c);if(!ks.length)return;
      S2.push(['','']);S2.push([t,'개수']);ks.sort(function(a,b){return c[b]-c[a];}).forEach(function(k){S2.push([k,c[k]]);});}
    grp('종류별',tOf);grp('차단기 형식별',cOf);grp('동별',bOf);grp('전압별',vOf);
    function cell(v,h){var num=typeof v==='number';return '<Cell'+(h?' ss:StyleID="h"':'')+'><Data ss:Type="'+(num?'Number':'String')+'">'+esc(v)+'</Data></Cell>';}
    function ws(nm,rows,w){return '<Worksheet ss:Name="'+nm+'"><Table>'+w.map(function(x){return '<Column ss:Width="'+x+'"/>';}).join('')+
      rows.map(function(r,i){return '<Row>'+r.map(function(c){return cell(c,i===0);}).join('')+'</Row>';}).join('')+
      '</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>';}
    var x='<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
      '<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E0E7FF" ss:Pattern="Solid"/></Style></Styles>'+
      ws('목록',R,[36,60,60,70,180,50,40,40,70,90,40,110,140,260,140,70,60,140])+ws('요약',S2,[120,220])+'</Workbook>';
    function pt(a){return a.length?a[0]+(a.length>1?'외'+(a.length-1):''):'';}
    var parts=[pt(F.bld),pt(F.v),pt(F.ty),pt(F.cb),F.em?'비상':'',pt(F.gap.map(function(k){return GAPS[k];})),q]
      .filter(Boolean).map(function(s){return String(s).replace(/[\\\/:*?"<>|\s]/g,'');});
    var d=new Date(),ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
    download(new Blob(['\ufeff'+x],{type:'application/vnd.ms-excel'}),'검색_'+(parts.join('_')||'전체')+'_'+ymd+'.xls');
  }

  /* ---------- 화면 · 이벤트 ---------- */
  var css=document.createElement('style');
  css.textContent=
    '#fltB.on{background:#262f7d;color:#fff;border-color:#262f7d}'+
    '#fltP{border:1px solid #e5e7eb;border-radius:6px;padding:6px;margin:4px 0;background:#f8fafc;font-size:12px;max-height:40vh;overflow:auto}'+
    '#fltP .fg{display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin-bottom:5px}'+
    '#fltP .fg>b{width:32px;flex:none;color:#475569}'+
    '#fltP .fc{cursor:pointer;border:1px solid #cbd5e1;border-radius:10px;padding:0 7px;background:#fff;user-select:none;white-space:nowrap}'+
    '#fltP .fc i{font-style:normal;color:#64748b;font-size:10px;margin-left:3px}'+
    '#fltP .fc.on{background:#262f7d;border-color:#262f7d;color:#fff}#fltP .fc.on i{color:#c7d2fe}'+
    '#fltP .fc.e.on{background:#dc2626;border-color:#dc2626}#fltP .fc.z{opacity:.4}'+
    '#fltP .fa{display:flex;gap:6px;align-items:center;border-top:1px dashed #cbd5e1;padding-top:5px}#fltP .fa .sp{flex:1}'+
    '#tree .fPath{font-size:11px;color:#94a3b8;padding:6px 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '#tree .fLd{font-size:11px;color:#0f766e;cursor:pointer;padding:1px 0}#tree .fLd:hover{text-decoration:underline}'+
    '#tree .trow.dim .nm,#tree .trow.dim .no{color:#94a3b8}';
  document.head.appendChild(css);

  var srch=$('#search'),top=srch&&srch.parentElement;
  if(top&&!document.getElementById('fltB')){
    var b=document.createElement('button');b.id='fltB';b.title='동·전압·종류·형식으로 거르기';srch.after(b);
    var p=document.createElement('div');p.id='fltP';p.hidden=true;top.after(p);
  }
  $('#fltB').addEventListener('click',function(){F.open=!F.open;saveF();paint();});
  $('#fltP').addEventListener('click',function(e){
    var a=e.target.closest('[data-fa]');
    if(a){if(a.dataset.fa==='xls')return xls();
      F.bld=[];F.v=[];F.ty=[];F.cb=[];F.gap=[];F.em=false;FO.clear();saveF();renderTree();return;}
    var c=e.target.closest('.fc');if(!c)return;
    var g=c.dataset.g,o=c.dataset.o;
    if(g==='em')F.em=!F.em;else{var i=F[g].indexOf(o);if(i>=0)F[g].splice(i,1);else F[g].push(o);}
    FO.clear();saveF();
    if((g==='bld'||g==='v')&&startMode()&&!restOn()){var md=model();
      if(md.roots.length<=30){md.roots.forEach(function(r){UI.open.add(r.id);});saveUI();}}
    renderTree();
  });
  $('#fltP').addEventListener('change',function(e){if(e.target.id==='fChk'){F.chk=e.target.checked;saveF();}});
  $('#tree').addEventListener('click',function(e){
    var d=e.target.closest('[data-fld]');if(!d)return;
    e.stopPropagation();FO.add(d.dataset.fld);renderTree();
  },true);
  var lt=document.getElementById('lTabs');if(lt)lt.addEventListener('click',function(){setTimeout(paint,0);});

  try{renderTree();}catch(e){}
})();
/* ===== 필터 칩 · 필터 엑셀 (filter.js) 끝 ===== */
