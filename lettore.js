"use strict";
/* ====================================================== lettore dei manuali */
openManual=function(id){
  var man=null; S.manuals.forEach(function(m){ if(m.id===id) man=m });
  if(!man) return;
  var m=modal('<h2 style="font-size:19px">'+esc(man.name)+'</h2>'+
    '<p class="faint" style="margin:9px 0"><span class="busy"></span> Apro il manuale…</p>');
  loadPdfJs().then(function(){ return DB.readBlob(P.pdf(id)) }).then(function(b){
    if(!b) throw new Error('PDF non trovato nella cartella.');
    return b.arrayBuffer();
  }).then(function(buf){
    return window.pdfjsLib.getDocument({data:buf}).promise;
  }).then(function(pdf){
    m.close();
    RD.pdf=pdf; RD.man=man; RD.cache={}; RD.pg=man.lastPage||1;
    if(RD.pg%2===0) RD.pg--;
    lettore();
  }).catch(function(e){
    m.close();
    modal('<h2 style="font-size:19px">Non si apre</h2>'+
      '<p class="faint" style="margin:9px 0 14px">'+esc(e.message)+'</p>'+
      '<button class="btn" style="width:100%" data-close>Chiudi</button>');
  });
};
function lettore(){
  var man=RD.man;
  var el=document.createElement('div');
  el.className='lettore';
  el.innerHTML=
   '<div class="ltop"><button class="lb metal" id="lx" aria-label="Chiudi"><span>✕</span></button>'+
   '<div style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
   esc(man.name)+'</b><span class="faint" style="font-size:12px" id="llab"></span></div>'+
   '<button class="lmode" data-sf="ricciolo" aria-pressed="'+(S.cfg.sfoglio==='ricciolo')+'">Ricciolo</button>'+
   '<button class="lmode" data-sf="semplice" aria-pressed="'+(S.cfg.sfoglio==='semplice')+'">Semplice</button></div>'+
   '<div class="lstage"><div class="lbook" id="lbk"><canvas id="lcv"></canvas></div>'+
   '<div class="leggio">'+leggioSVG()+'</div></div>'+
   '<div class="lbar"><button class="lb metal" id="lp"><span>‹</span></button>'+
   '<input type="range" id="lr" min="1" max="'+Math.max(1,RD.pdf.numPages-1)+'" step="2" value="'+RD.pg+'">'+
   '<button class="lb metal" id="ln"><span>›</span></button></div>';
  $('#layers').appendChild(el);
  var bk=$('#lbk',el), cv=$('#lcv',el);
  RD.cv=cv; RD.ctx=cv.getContext('2d',{alpha:false}); RD.el=el; RD.hi=2;
  function label(){ var l=$('#llab',el);
    if(l) l.textContent='pagine '+RD.pg+'–'+(RD.pg+1)+' di '+RD.pdf.numPages }
  RD.label=label;
  function size(){
    var r=bk.getBoundingClientRect();
    RD.W=Math.round(r.width); RD.H=Math.round(r.height); RD.PW=RD.W/2;
    RD.dpr=Math.min(window.devicePixelRatio||1,RD.hi);
    cv.width=Math.round(RD.W*RD.dpr); cv.height=Math.round(RD.H*RD.dpr);
    RD.ctx.setTransform(RD.dpr,0,0,RD.dpr,0,0);
    RD.cache={}; paint(1); label();
  }
  RD.size=size;
  setTimeout(size,50);
  window.addEventListener('resize',size);
  $('#ln',el).onclick=function(){ turnPage(1) };
  $('#lp',el).onclick=function(){ turnPage(-1) };
  $('#lr',el).oninput=function(){
    if(RD.busy){ this.value=RD.pg; return }
    var v=parseInt(this.value,10); if(v%2===0) v--; RD.pg=Math.max(1,v); paint(1); label();
  };
  $$('[data-sf]',el).forEach(function(b){ b.onclick=function(){
    S.cfg.sfoglio=b.dataset.sf; saveCfgSoon();
    $$('[data-sf]',el).forEach(function(o){ o.setAttribute('aria-pressed',o===b) });
    paint(1);
  }});
  $('#lx',el).onclick=function(){
    window.removeEventListener('resize',size);
    RD.man.lastPage=RD.pg; DB.writeJSON(P.manual(RD.man.id),RD.man);
    RD.pdf=null; el.remove();
  };
  /* gesto con throttling a frame */
  var drag=null, want=null, ticking=false;
  function frame(){
    ticking=false;
    if(want!=null){ paint(want); want=null }
  }
  bk.addEventListener('pointerdown',function(e){
    if(RD.busy) return;
    var r=bk.getBoundingClientRect(), x=e.clientX-r.left;
    if(x<RD.W*0.5) return;
    drag={}; RD.hi=1.35; bk.setPointerCapture(e.pointerId);
  });
  bk.addEventListener('pointermove',function(e){
    if(!drag) return;
    var r=bk.getBoundingClientRect();
    drag.t=clamp((e.clientX-r.left-RD.PW)/RD.PW,0,1);
    want=drag.t;
    if(!ticking){ ticking=true; requestAnimationFrame(frame) }
  });
  bk.addEventListener('pointerup',function(){
    if(!drag) return;
    var t=drag.t==null?1:drag.t; drag=null; RD.hi=2;
    settle(t,t<0.5);
  });
  bk.addEventListener('pointercancel',function(){ if(drag){ var t=drag.t||1; drag=null; RD.hi=2; settle(t,false) } });
}
function leggioSVG(){
  return '<svg viewBox="0 0 600 34" preserveAspectRatio="none" aria-hidden="true">'+
    '<path d="M0 4 L600 4 L560 16 L40 16 Z" fill="url(#mg)" opacity=".9"/>'+
    '<rect x="40" y="16" width="520" height="3" fill="url(#mg)" opacity=".55"/>'+
    '<path d="M280 19 L320 19 L316 30 L284 30 Z" fill="url(#mg)" opacity=".7"/>'+
    '<rect x="220" y="30" width="160" height="4" rx="2" fill="url(#mg)" opacity=".85"/>'+
    '</svg>';
}
/* --------------------------------- disegno più leggero e senza scatti --- */
paint=function(t){
  if(!RD.ctx||!RD.pdf) return;
  RD.lastT=t;
  var ctx=RD.ctx, W=RD.W, H=RD.H, PW=RD.PW;
  ctx.fillStyle='#0E0D0B'; ctx.fillRect(0,0,W,H);
  var L=pageCanvas(RD.pg), Rr=pageCanvas(t<1?RD.pg+3:RD.pg+1);
  if(L) ctx.drawImage(L,0,0,PW,H);
  if(Rr) ctx.drawImage(Rr,PW,0,PW,H);
  if(t>=1) return;
  var front=pageCanvas(RD.pg+1), back=pageCanvas(RD.pg+2)||front;
  if(!front) return;
  if(S.cfg.sfoglio==='semplice'){
    var w=PW*Math.abs(t*2-1), src=t>0.5?front:back, x=t>0.5?PW:PW-w;
    if(w>1){ ctx.drawImage(src,x,0,w,H);
      ctx.fillStyle='rgba(20,15,8,'+(0.22*(1-Math.abs(t*2-1))).toFixed(3)+')'; ctx.fillRect(x,0,w,H) }
    return;
  }
  var foldX=PW+PW*t, R=Math.max(10,Math.min(PW*0.42,78)*(0.3+0.7*t));
  var step=3, sdpr=RD.dpr;
  for(var u=0;u<=PW;u+=step){
    var th=u/R, x, src2, sxs, shade;
    if(th<=Math.PI){
      x=foldX+R*Math.sin(th);
      if(th<=Math.PI/2){ src2=front; sxs=PW-u; shade=0.32*(1-Math.cos(th)) }
      else { src2=back; sxs=u; shade=0.18+0.20*(1+Math.cos(th)) }
    }else{
      x=foldX-(u-Math.PI*R); src2=back; sxs=u; shade=0.15;
    }
    if(x<-4||x>W+4) continue;
    var wd=Math.abs(Math.cos(th))*step+1.2;
    ctx.drawImage(src2,Math.round(sxs*sdpr),0,Math.max(1,Math.round(step*sdpr)),src2.height,x,0,wd,H);
    if(shade>0.01){ ctx.fillStyle='rgba(46,34,18,'+Math.min(.55,shade).toFixed(3)+')'; ctx.fillRect(x,0,wd,H) }
  }
};
pageCanvas=function(n){
  if(!RD.pdf||n<1||n>RD.pdf.numPages) return null;
  var key=n+'@'+Math.round(RD.PW)+'x'+RD.dpr;
  if(RD.cache[key]) return RD.cache[key];
  var c=document.createElement('canvas');
  c.width=Math.max(2,Math.round(RD.PW*RD.dpr)); c.height=Math.max(2,Math.round(RD.H*RD.dpr));
  var x=c.getContext('2d'); x.fillStyle='#EDE4D3'; x.fillRect(0,0,c.width,c.height);
  RD.cache[key]=c;
  RD.pdf.getPage(n).then(function(p){
    var vp=p.getViewport({scale:1});
    var sc=Math.min(c.width/vp.width,c.height/vp.height);
    var v2=p.getViewport({scale:sc});
    x.save(); x.translate((c.width-v2.width)/2,(c.height-v2.height)/2);
    return p.render({canvasContext:x,viewport:v2}).promise.then(function(){
      x.restore();
      if(RD.ctx) paint(RD.lastT==null?1:RD.lastT);
      /* pagine vicine pronte in anticipo */
      [n+2,n+3,n-2,n-1].forEach(function(k){
        if(k>=1&&RD.pdf&&k<=RD.pdf.numPages) setTimeout(function(){ pageCanvas(k) },40);
      });
    });
  }).catch(function(){});
  return c;
};
