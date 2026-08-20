"use strict";
/* ================================================ sessione di Fabula Ultima */
var FU_AZIONI=[
 ['Attaccare','azione','Un attacco con un\u2019arma equipaggiata. Esegui un Test di Precisione: se il risultato raggiunge o supera la Difesa del bersaglio, colpisci e infliggi danni pari al Risultato Alto più il valore dell\u2019arma.'],
 ['Incantesimo','azione','Lanci un incantesimo che conosci, spendendo i Punti Mente richiesti. Se ha un bersaglio ostile serve un Test di Magia contro la Difesa magica.'],
 ['Abilità','azione','Usi un\u2019Abilità di Classe che richiede un\u2019azione. Molte hanno un costo in Punti Mente o in Punti Fabula.'],
 ['Oggetto','azione','Usi un oggetto consumabile dall\u2019inventario, spendendo Punti Inventario.'],
 ['Guardia','azione','Fino al tuo turno successivo puoi opporti agli attacchi: se qualcuno ti bersaglia, esegui un Test contrapposto per ridurne l\u2019effetto.'],
 ['Studiare','azione','Osservi un nemico: con un Test di [INS+INS] scopri le sue caratteristiche, resistenze e vulnerabilità. Più alto il risultato, più informazioni ottieni.'],
 ['Obiettivo','azione','Compi un\u2019azione che serve alla scena e non al combattimento: raggiungere una leva, salvare qualcuno, chiudere un portale.'],
 ['Equipaggiamento','libera','Cambi le armi o le armature equipaggiate. Non consuma la tua azione.'],
 ['Muoversi','libera','Ti sposti dove ha senso nella scena. Fabula Ultima non usa griglie né distanze precise.']
];
var FU_DIFF=[['7','facile'],['10','normale'],['13','difficile'],['16','molto difficile']];
function fuSess(){ return S.sess && S.sess.sys==='fu' }
function fuPartecipanti(){
  var s=S.sess;
  return (s.k||[]).map(function(k){ return k });
}
/* pannello che sostituisce l'iniziativa quando la sessione è di Fabula Ultima */
function fuPannelloConflitto(){
  var s=S.sess;
  var eroi=s.k.filter(function(k){return k.lato!=='nemico'});
  var nemici=s.k.filter(function(k){return k.lato==='nemico'});
  function riga(k){
    var crisi=k.pfmax&&k.pf!=null&&k.pf<=Math.floor(k.pfmax/2);
    return '<div class="line"'+(k.agito?' style="opacity:.5"':'')+'>'+
      '<button class="pill" data-fuagito="'+k.id+'" style="min-width:30px">'+(k.agito?'●':'○')+'</button>'+
      '<span class="grow">'+esc(k.n)+
      (crisi?' <span class="pill" style="color:#C2506A;box-shadow:inset 0 0 0 1px #C2506A">crisi</span>':'')+
      (k.stati&&k.stati.length?'<div class="faint" style="font-size:11px">'+esc(k.stati.join(', '))+'</div>':'')+
      '</span>'+
      '<button class="btn sm" data-fudanno="'+k.id+'">danno</button>'+
      '<span style="font-family:var(--mono);font-weight:700;min-width:52px;text-align:center">'+
      (k.pf==null?'–':k.pf)+(k.pfmax?'/'+k.pfmax:'')+'</span>'+
      '<button class="btn sm" data-fustato="'+k.id+'">stati</button>'+
      '<button class="btn sm danger" data-delk="'+k.id+'">✕</button></div>';
  }
  var tuttiAgito=s.k.length&&s.k.every(function(k){return k.agito});
  return slab('<div class="row" style="margin-bottom:9px">'+
    '<div class="eyebrow grow">Conflitto · turno '+(s.round||1)+'</div>'+
    '<button class="btn sm" data-act="fuIniziativa">Iniziativa</button>'+
    '<button class="btn sm" data-act="aggcomb">＋</button></div>'+
    (s.iniziativa?'<div class="line" style="box-shadow:inset 0 0 0 2px var(--m2)">'+
      '<span class="grow">'+esc(s.iniziativa)+'</span></div>':'')+
    (eroi.length?'<div class="eyebrow" style="margin:9px 0 6px">Eroi</div>'+eroi.map(riga).join(''):'')+
    (nemici.length?'<div class="eyebrow" style="margin:11px 0 6px">Avversari</div>'+nemici.map(riga).join(''):'')+
    (!s.k.length?'<p class="faint">Aggiungi eroi e avversari, poi decidi chi comincia.</p>':'')+
    (s.k.length?'<div class="row" style="margin-top:10px">'+
      '<button class="btn grow" data-act="fuNuovoTurno">'+(tuttiAgito?'Nuovo turno':'Azzera i segni')+'</button>'+
      '<button class="mbtn metal grow" data-act="attacca"><span>Attacca</span></button></div>':'')+
    '<p class="faint" style="margin:9px 0 0">In un conflitto gli Eroi e gli avversari si alternano: '+
    'ogni personaggio agisce una volta per turno, e il pallino segna chi ha già agito.</p>');
}
ACT.fuIniziativa=function(){
  var s=S.sess;
  modal('<h2 style="font-size:19px">Chi comincia</h2>'+
    '<p class="faint" style="margin:8px 0 11px">Un Test di [DES+INS] contrapposto fra il gruppo e gli avversari: '+
    'chi vince decide se agire per primo o per secondo.</p>'+
    '<div class="grid g2" style="margin-bottom:11px">'+
    '<label><span class="lab">Eroi: totale</span><input id="ie" type="number" inputmode="numeric"></label>'+
    '<label><span class="lab">Avversari: totale</span><input id="ia" type="number" inputmode="numeric"></label>'+
    '</div><div id="ir" style="margin-bottom:11px"></div>'+
    '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="mbtn metal grow" id="io"><span>Confronta</span></button></div>',
  function(el,close){
    $('#io',el).onclick=function(){
      var e=Number($('#ie',el).value||0), a=Number($('#ia',el).value||0);
      var vince=e>=a?'Gli Eroi':'Gli avversari';
      s.iniziativa=vince+' hanno vinto l\u2019iniziativa ('+e+' contro '+a+')';
      s.log.unshift({t:nowISO(),txt:s.iniziativa});
      saveSess();
      $('#ir',el).innerHTML='<div class="line" style="box-shadow:inset 0 0 0 2px var(--m2)">'+
        '<span class="grow">'+esc(s.iniziativa)+'</span></div>';
      render();
    };
  });
};
ACT.fuNuovoTurno=function(){
  var s=S.sess, tutti=s.k.length&&s.k.every(function(k){return k.agito});
  s.k.forEach(function(k){ k.agito=false });
  if(tutti){ s.round=(s.round||1)+1; s.log.unshift({t:nowISO(),txt:'Turno '+s.round}) }
  saveSess(); render();
};
/* ---------------------------- attacco di Fabula Ultima ------------------ */
function attaccoFU(){
  var pg=S.pg;
  if(!pg||SISTEMI[pg.sys].fam!=='fu') return toast('Apri prima una scheda di Fabula Ultima');
  var v=pg.values;
  var armi=(v.equip||[]).filter(function(o){return o&&o.n});
  modal('<h2 style="font-size:19px">Attacco</h2>'+
    '<p class="faint" style="margin:8px 0 11px">Test di Precisione: due caratteristiche più il bonus dell\u2019arma. '+
    'Se raggiungi la Difesa del bersaglio colpisci, e i danni sono il Risultato Alto più il valore dell\u2019arma.</p>'+
    '<div class="grid g2" style="margin-bottom:10px">'+
    ['a','b'].map(function(k,i){
      return '<label><span class="lab">Caratteristica '+(i+1)+'</span><select id="ka'+i+'">'+
        FU_CARAT.map(function(c){
          return '<option value="'+c[0]+'"'+((i===0&&c[0]==='destrezza')||(i===1&&c[0]==='vigore')?' selected':'')+
          '>'+c[1]+' (d'+fuTaglia(pg,c[0])+')</option>'}).join('')+'</select></label>'}).join('')+
    '<label><span class="lab">Bonus di Precisione</span><input id="kp" type="number" inputmode="numeric" value="0"></label>'+
    '<label><span class="lab">Danni base dell\u2019arma</span><input id="kd" type="number" inputmode="numeric" value="5"></label>'+
    '<label><span class="lab">Difesa del bersaglio</span><input id="kt" type="number" inputmode="numeric" placeholder="opzionale"></label>'+
    '<label><span class="lab">Affinità del bersaglio</span><select id="kf">'+
    ['nessuna','resistenza','vulnerabilità','immunità','assorbimento'].map(function(x){
      return '<option>'+x+'</option>'}).join('')+'</select></label>'+
    '</div>'+
    (armi.length?'<div class="eyebrow" style="margin-bottom:6px">Dal tuo equipaggiamento</div>'+
      '<div class="row wrap" style="margin-bottom:11px">'+armi.map(function(o,i){
        return '<button class="btn sm" data-fuarma="'+i+'">'+esc(o.n)+'</button>'}).join('')+'</div>':'')+
    '<div id="kr" style="margin-bottom:12px"></div>'+
    '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
    '<button class="mbtn metal grow" id="ko"><span>Tira</span></button></div>',
  function(el,close){
    $$('[data-fuarma]',el).forEach(function(b){ b.onclick=function(){
      var o=armi[+b.dataset.fuarma];
      var m=String(o.t||'').match(/(\d+)/);
      if(m) $('#kd',el).value=m[1];
      toast('Arma: '+o.n);
    }});
    $('#ko',el).onclick=function(){
      var sel=el.querySelectorAll('select');
      var ca=sel[0].value, cb=sel[1].value, aff=$('#kf',el).value;
      var ta=fuTaglia(pg,ca), tb=fuTaglia(pg,cb);
      var prec=Number($('#kp',el).value||0), base=Number($('#kd',el).value||0);
      var dif=Number($('#kt',el).value||0);
      var da=1+Math.floor(Math.random()*ta), db=1+Math.floor(Math.random()*tb);
      var tot=da+db+prec, hr=Math.max(da,db);
      var crit=da===db&&da>=6, fumble=da===1&&db===1;
      var danni=hr+base;
      if(aff==='resistenza') danni=Math.floor(danni/2);
      if(aff==='vulnerabilità') danni=danni*2;
      if(aff==='immunità'||aff==='assorbimento') danni=0;
      var colpito = fumble?false : (crit?true : (dif?tot>=dif:null));
      $('#kr',el).innerHTML='<div class="line" style="box-shadow:inset 0 0 0 2px '+
        (fumble?'#C2506A':crit?'var(--m2)':'var(--line)')+'">'+
        '<span class="v" style="font-size:20px">'+tot+'</span>'+
        '<span class="grow"><span class="die">'+da+'</span> <span class="die">'+db+'</span>'+
        (prec?' <span class="die">+'+prec+'</span>':'')+
        '<div class="faint" style="font-size:11px">Risultato Alto '+hr+
        (crit?' · successo critico':fumble?' · fallimento critico':'')+
        (colpito===true?' · colpisci':colpito===false?' · manchi':'')+'</div></span></div>'+
        (colpito!==false?'<div class="line" style="margin-top:7px"><span class="v" style="font-size:20px">'+danni+'</span>'+
          '<span class="grow">danni'+(aff!=='nessuna'?' · '+aff:'')+
          '<div class="faint" style="font-size:11px">Risultato Alto '+hr+' più '+base+' dell\u2019arma'+
          (crit?', e un successo critico raddoppia se l\u2019arma lo prevede':'')+'</div></span>'+
          (S.sess?'<button class="btn sm" data-fuapplica="'+danni+'">applica</button>':'')+'</div>':'');
      if(S.sess){ S.sess.log.unshift({t:nowISO(),
        txt:'Precisione '+tot+(colpito===false?' · mancato':' · '+danni+' danni')}); saveSess() }
      $$('[data-fuapplica]',el).forEach(function(b){ b.onclick=function(){
        close(); fuApplicaDanno(Number(b.dataset.fuapplica));
      }});
    };
  });
}
function fuApplicaDanno(danni){
  var s=S.sess;
  if(!s||!s.k.length) return toast('Nessun bersaglio nella sessione');
  modal('<h2 style="font-size:19px">A chi?</h2>'+
    '<p class="faint" style="margin:8px 0 11px">'+danni+' danni</p>'+
    s.k.map(function(k){
      return '<div class="line"><span class="grow">'+esc(k.n)+'</span>'+
        '<span class="pill">'+(k.pf==null?'–':k.pf)+'</span>'+
        '<button class="btn sm" data-futarget="'+k.id+'">colpisci</button></div>'}).join('')+
    '<button class="btn" style="width:100%;margin-top:11px" data-close>Annulla</button>',
  function(el,close){
    $$('[data-futarget]',el).forEach(function(b){ b.onclick=function(){
      s.k.forEach(function(k){ if(k.id===b.dataset.futarget){
        k.pf=Number(k.pf||0)-danni;
        s.log.unshift({t:nowISO(),txt:k.n+': −'+danni+' PV → '+k.pf+
          (k.pfmax&&k.pf<=Math.floor(k.pfmax/2)?' (in crisi)':'')+(k.pf<=0?' · sconfitto':'')});
      }});
      saveSess(); close(); render();
    }});
  });
}
/* stati sui combattenti */
ACT.fuStatoSu=function(id){
  var k=null; S.sess.k.forEach(function(x){ if(x.id===id) k=x });
  if(!k) return;
  k.stati=k.stati||[];
  modal('<h2 style="font-size:19px">'+esc(k.n)+'</h2>'+
    '<div class="row wrap" style="margin:11px 0">'+FU_STATI.map(function(st){
      var on=k.stati.indexOf(st[0])>=0;
      return '<button class="btn sm" data-fust="'+esc(st[0])+'"'+
        (on?' style="box-shadow:inset 0 0 0 2px #C2506A;color:#C2506A"':'')+'>'+
        (on?'● ':'○ ')+esc(st[0])+'</button>'}).join('')+'</div>'+
    '<button class="btn" style="width:100%" data-close>Fatto</button>',
  function(el,close){
    $$('[data-fust]',el).forEach(function(b){ b.onclick=function(){
      var n=b.dataset.fust, i=k.stati.indexOf(n);
      if(i>=0) k.stati.splice(i,1); else k.stati.push(n);
      b.style.boxShadow=k.stati.indexOf(n)>=0?'inset 0 0 0 2px #C2506A':'';
      b.style.color=k.stati.indexOf(n)>=0?'#C2506A':'';
      b.textContent=(k.stati.indexOf(n)>=0?'● ':'○ ')+n;
      S.sess.log.unshift({t:nowISO(),txt:k.n+': '+(k.stati.indexOf(n)>=0?'ora è ':'non è più ')+n});
      saveSess(); 
    }});
    el.addEventListener('click',function(ev){ if(ev.target===el) render() });
  });
};
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-fuagito],[data-fustato],[data-fudanno],[data-prstato]');
  if(!t||!S.sess) return;
  var d=t.dataset;
  if(d.fuagito!==undefined){
    S.sess.k.forEach(function(k){ if(k.id===d.fuagito) k.agito=!k.agito });
    saveSess(); render(); return;
  }
  if(d.fustato!==undefined){ ACT.fuStatoSu(d.fustato); return }
  if(d.prstato!==undefined){ ACT.statoProfiloSu(d.prstato); return }
  if(d.fudanno!==undefined){
    var k=null; S.sess.k.forEach(function(x){ if(x.id===d.fudanno) k=x });
    modal('<h2 style="font-size:19px">'+esc(k.n)+'</h2>'+
      '<div class="grid g2" style="margin:11px 0">'+
      '<label><span class="lab">Danni</span><input id="dq" type="number" inputmode="numeric" value="10"></label>'+
      '<label><span class="lab">PV massimi</span><input id="dm" type="number" inputmode="numeric" value="'+(k.pfmax||'')+'"></label>'+
      '</div><div class="row" style="gap:7px">'+
      '<button class="btn grow" id="dcura">Cura</button>'+
      '<button class="mbtn metal grow" id="dcol"><span>Infliggi</span></button></div>'+
      '<button class="btn" style="width:100%;margin-top:10px" data-close>Chiudi</button>',
    function(el,close){
      function applica(segno){
        var q=Number($('#dq',el).value||0);
        k.pfmax=Number($('#dm',el).value||0)||k.pfmax;
        k.pf=Number(k.pf||0)+segno*q;
        if(k.pfmax&&k.pf>k.pfmax) k.pf=k.pfmax;
        S.sess.log.unshift({t:nowISO(),txt:k.n+': '+(segno<0?'−':'+')+q+' PV → '+k.pf+
          (k.pfmax&&k.pf<=Math.floor(k.pfmax/2)&&k.pf>0?' (in crisi)':'')+(k.pf<=0?' · sconfitto':'')});
        saveSess(); close(); render();
      }
      $('#dcol',el).onclick=function(){ applica(-1) };
      $('#dcura',el).onclick=function(){ applica(1) };
    });
    return;
  }
},false);

ACT.statoProfiloSu=function(id){
  var P=profiloDi(S.sess.sys); if(!P) return;
  var k=null; S.sess.k.forEach(function(x){ if(x.id===id) k=x });
  if(!k) return; k.stati=k.stati||[];
  modal('<h2 style="font-size:19px">'+esc(k.n)+'</h2>'+
    '<div class="row wrap" style="margin:11px 0">'+(P.stati||[]).map(function(st){
      var on=k.stati.indexOf(st[0])>=0;
      return '<button class="btn sm" data-pst="'+esc(st[0])+'"'+
        (on?' style="box-shadow:inset 0 0 0 2px #C2506A;color:#C2506A"':'')+'>'+
        (on?'\u25cf ':'\u25cb ')+esc(st[0])+'</button>'}).join('')+'</div>'+
    '<button class="btn" style="width:100%" data-close>Fatto</button>',
  function(el,close){
    $$('[data-pst]',el).forEach(function(b){ b.onclick=function(){
      var n=b.dataset.pst, i=k.stati.indexOf(n);
      if(i>=0) k.stati.splice(i,1); else k.stati.push(n);
      var acceso=k.stati.indexOf(n)>=0;
      b.style.boxShadow=acceso?'inset 0 0 0 2px #C2506A':'';
      b.style.color=acceso?'#C2506A':'';
      b.textContent=(acceso?'\u25cf ':'\u25cb ')+n;
      S.sess.log.unshift({t:nowISO(),txt:k.n+': '+(acceso?'ora è ':'non è più ')+n});
      saveSess();
    }});
  });
};
