/* ===== 하위 계통 엑셀 (트리·Flow 공용) 시작 ===== */
(function(){
  var PNL={PNL:1,UPS:1,MCC:1,MDB:1,SS:1},LD={LOAD:1,CAP:1};
  function X(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function msg(t){try{toast(t,false);}catch(e){alert(t);}}
  function L(n){try{return label(n);}catch(e){return n.name||n.no||'';}}
  function T(n){try{return tlabel(n);}catch(e){return (TYPES[n.type]||{}).l||n.type;}}
  function V(n){try{return n.type==='TR'?(effV(n)||'?')+' → '+(n.v2||'?'):(effV(n)||'');}catch(e){return n.volt||'';}}
  function EM(n){try{return effSrc(n)==='E';}catch(e){return n.src==='E';}}
  function B(n){try{return effBld(n)||'';}catch(e){return n.bld||'';}}
  function SP(n){try{return spec(n)||'';}catch(e){return [n.rating&&n.rating+'A',n.poles&&n.poles+'P',n.model].filter(Boolean).join(' ');}}
  function KW(n){var v=parseFloat(String(n.kw||'').replace(/,/g,''));return isFinite(v)?v:null;}
  function up(n,f){for(var p=n.pid&&byId(n.pid),d=0;p&&d<60;d++,p=p.pid&&byId(p.pid))if(f(p))return p;return null;}

  function collect(ids){
    var S0=new Set(ids.filter(function(id){return id&&byId(id);})),rows=[],seen=new Set();
    var roots=Array.from(S0).filter(function(id){return !up(byId(id),function(p){return S0.has(p.id);});});
    function walk(n,d){if(!n||seen.has(n.id)||d>60)return;seen.add(n.id);rows.push({n:n,d:d});(kids(n.id)||[]).forEach(function(c){walk(c,d+1);});}
    roots.forEach(function(id){walk(byId(id),0);});
    return {roots:roots.map(function(id){return byId(id);}),rows:rows};}

  function cell(v,h){if(h)return '<Cell ss:StyleID="h"><Data ss:Type="String">'+X(v)+'</Data></Cell>';
    return typeof v==='number'?'<Cell><Data ss:Type="Number">'+v+'</Data></Cell>':'<Cell><Data ss:Type="String">'+X(v)+'</Data></Cell>';}
  function rowX(a,h){return '<Row>'+a.map(function(v){return cell(v,h);}).join('')+'</Row>';}
  function sheet(name,head,body,w){
    return '<Worksheet ss:Name="'+X(name)+'"><Table>'+w.map(function(x){return '<Column ss:Width="'+x+'"/>';}).join('')+
      rowX(head,1)+body.map(function(r){return rowX(r);}).join('')+
      '</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>';}

  function run(ids,title){
    var C=collect(ids);if(!C.rows.length){msg('내보낼 트리 항목이 없어요. 아이콘을 🔗로 트리에 연결해 주세요.');return;}
    var loads=[],nP=0,nL=0,nE=0,sum=0,cnt={};
    C.rows.forEach(function(r){var n=r.n,t=T(n);cnt[t]=(cnt[t]||0)+1;if(PNL[n.type])nP++;
      if(!LD[n.type])return;nL++;var k=KW(n);if(k!=null)sum+=k;if(EM(n))nE++;
      var p=up(n,function(x){return PNL[x.type];}),cb=n.pid&&byId(n.pid);if(cb&&cb.type!=='CB')cb=null;
      loads.push([p?L(p):'',cb?(cb.no||''):(n.no||''),cb?SP(cb):'',n.name||'',t,k==null?'':k,V(n),EM(n)?'비상':'',B(n),n.loc||'',n.note||'']);});
    var full=C.rows.map(function(r){var n=r.n,p=n.pid&&byId(n.pid),k=KW(n);
      return [r.d,new Array(r.d+1).join('　')+L(n),T(n),n.no||'',n.name||'',SP(n),V(n),EM(n)?'비상':'',k==null?'':k,B(n),n.loc||'',p?L(p):'',n.note||''];});
    var d=new Date(),ds=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
    var path=C.roots.map(function(n){try{return pathOf(n).map(function(x){return L(x);}).join(' › ');}catch(e){return L(n);}}).join(' / ');
    var sm=[['기준',title],['기준 경로',path],['출력일',d.toLocaleString()],['전체 항목',C.rows.length],['분전반·MCC·UPS',nP],['부하',nL],['비상 부하',nE],['부하 합계 kW',Math.round(sum*100)/100],['',''],['종류별','개수']]
      .concat(Object.keys(cnt).map(function(k){return [k,cnt[k]];}));
    var x='<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
      '<Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#262F7D" ss:Pattern="Solid"/></Style></Styles>'+
      sheet('부하 목록',['소속 분전반','회로번호','차단기','부하명','종류','kW','전압','비상','동','위치','비고'],loads,[110,60,110,160,60,50,60,40,70,110,140])+
      sheet('전체 계통',['단계','계통','종류','번호','명칭','사양','전압','전원','kW','동','위치','상위','비고'],full,[35,230,60,60,140,110,70,40,50,70,110,130,140])+
      sheet('요약',['항목','값'],sm,[110,360])+'</Workbook>';
    var a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([x],{type:'application/vnd.ms-excel'}));
    a.download='하위계통_'+String(title||'선택').replace(/[\\\/:*?"<>|\s]+/g,'_')+'_'+ds+'.xls';
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
    msg('📊 하위 엑셀 저장 · 항목 '+C.rows.length+' · 부하 '+nL);
  }

  var BTN='border:1px solid #16a34a;background:#f0fdf4;color:#166534;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer';
  function inject(){
    var f=document.getElementById('form');
    if(f&&typeof UI!=='undefined'&&UI.sel&&byId(UI.sel)&&!f.querySelector('[data-subx]')){
      var p=f.querySelector('.path');
      if(p)p.insertAdjacentHTML('afterend','<div style="margin:4px 0 8px"><button type="button" data-subx="tree" style="'+BTN+'">📊 하위 엑셀</button> <span class="muted" style="font-size:11px">이 항목 아래 전부</span></div>');}
    var o=document.getElementById('flImp'),bar=o&&o.querySelector('.fiB');
    if(bar&&!bar.querySelector('[data-subx]'))bar.insertAdjacentHTML('beforeend','<button type="button" data-subx="flow" style="'+BTN+'">📊 하위 엑셀</button>');
  }
  new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});

  window.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-subx]');if(!b)return;
    e.preventDefault();e.stopPropagation();
    if(b.getAttribute('data-subx')==='tree'){var n=byId(UI.sel);if(n)run([n.id],L(n));return;}
    var ids=[].slice.call(document.querySelectorAll('#flImp [data-fimp]')).map(function(r){return r.getAttribute('data-fimp');});
    var i=typeof FL!=='undefined'&&FL.sel&&flI(FL.sel);
    if(i&&i.nid&&byId(i.nid))ids.unshift(i.nid);
    run(ids,i?(typeof flNm==='function'?flNm(i):(i.name||i.t)):'Flow');
  },true);
  setTimeout(inject,500);
})();
/* ===== 하위 계통 엑셀 (트리·Flow 공용) 끝 ===== */
