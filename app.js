"use strict";
/* ==========================================================================
   TAVOLO — schede personaggio, manuali e sessioni
   File unico, nessuna build. Funziona da GitHub Pages o in locale.
   ========================================================================== */
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var uid=function(p){return (p||'id')+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var clamp=function(n,a,b){return Math.max(a,Math.min(b,n))};
var nowISO=function(){return new Date().toISOString()};
var hhmm=function(d){return new Date(d).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})};
function debounce(fn,ms){var t;return function(){var a=arguments;clearTimeout(t);
  t=setTimeout(function(){fn.apply(null,a)},ms||500)}}
function toast(m,ms){var e=document.createElement('div');e.className='toast';e.textContent=m;
  $('#layers').appendChild(e);setTimeout(function(){e.remove()},ms||2200)}

/* ------------------------------------------------------------- IndexedDB */
var IDB=(function(){
  var dbp;
  function open(){ return dbp||(dbp=new Promise(function(res,rej){
    var r=indexedDB.open('tavolo',1);
    r.onupgradeneeded=function(){var d=r.result;
      if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if(!d.objectStoreNames.contains('files')) d.createObjectStore('files')};
    r.onsuccess=function(){res(r.result)}; r.onerror=function(){rej(r.error)};
  })) }
  function tx(store,mode,fn){ return open().then(function(d){ return new Promise(function(res,rej){
    var t=d.transaction(store,mode), out=fn(t.objectStore(store));
    t.oncomplete=function(){res(out&&typeof out==='object'&&'result' in out?out.result:out)};
    t.onerror=function(){rej(t.error)};
  })}) }
  return {
    get:function(s,k){return tx(s,'readonly',function(st){return st.get(k)})},
    set:function(s,k,v){return tx(s,'readwrite',function(st){return st.put(v,k)})},
    del:function(s,k){return tx(s,'readwrite',function(st){return st.delete(k)})},
    keys:function(s){return tx(s,'readonly',function(st){return st.getAllKeys()})}
  };
})();

/* ---------------------------------------------------------------- percorsi */
var P={
  config:'config.json',
  pg:function(id){return 'personaggi/'+id+'.json'},
  manual:function(id){return 'manuali/'+id+'.json'},
  pdf:function(id){return 'manuali/pdf/'+id+'.pdf'},
  tex:function(k,i){return 'temi/texture/'+k+'-'+i+'.jpg'},
  bgimg:'temi/sfondo.jpg',
  sess:function(id){return 'sessioni/'+id+'.json'}
};

/* ---------------------------------------------------------------- storage */
function FolderStore(root){this.root=root;this.folder=true}
FolderStore.prototype._dir=function(path,create){
  var parts=path.split('/').slice(0,-1), h=Promise.resolve(this.root);
  parts.forEach(function(p){h=h.then(function(d){return d.getDirectoryHandle(p,{create:!!create})})});
  return h;
};
FolderStore.prototype._file=function(path,create){
  return this._dir(path,create).then(function(d){
    return d.getFileHandle(path.split('/').pop(),{create:!!create})})};
FolderStore.prototype.readBlob=function(p){
  return this._file(p).then(function(f){return f.getFile()}).catch(function(){return null})};
FolderStore.prototype.readText=function(p){
  return this.readBlob(p).then(function(b){return b?b.text():null})};
FolderStore.prototype.writeBlob=function(p,b){
  return this._file(p,true).then(function(f){return f.createWritable()})
    .then(function(w){return w.write(b).then(function(){return w.close()})})};
FolderStore.prototype.writeText=function(p,t){
  return this.writeBlob(p,new Blob([t],{type:'application/json'}))};
FolderStore.prototype.remove=function(p){
  return this._dir(p).then(function(d){return d.removeEntry(p.split('/').pop())}).catch(function(){})};
FolderStore.prototype.list=function(dir){
  var h=Promise.resolve(this.root);
  dir.split('/').filter(Boolean).forEach(function(p){
    h=h.then(function(d){return d.getDirectoryHandle(p)})});
  return h.then(function(d){
    var out=[], it=d.entries(), base=dir.replace(/\/$/,'');
    function step(){ return it.next().then(function(r){
      if(r.done) return out;
      if(r.value[1].kind==='file') out.push(base+'/'+r.value[0]);
      return step() }) }
    return step();
  }).catch(function(){return []});
};

function LocalStore(){this.folder=false}
LocalStore.prototype.readBlob=function(p){return IDB.get('files',p).then(function(v){
  if(v==null) return null;
  return typeof v==='string'?new Blob([v],{type:'application/json'}):v})};
LocalStore.prototype.readText=function(p){return IDB.get('files',p).then(function(v){
  if(v==null) return null;
  if(typeof v==='string') return v;
  if(typeof v.text==='function') return v.text();
  return null})};
LocalStore.prototype.writeBlob=function(p,b){return IDB.set('files',p,b)};
LocalStore.prototype.writeText=function(p,t){return IDB.set('files',p,t)};
LocalStore.prototype.remove=function(p){return IDB.del('files',p)};
LocalStore.prototype.list=function(dir){return IDB.keys('files').then(function(k){
  var d=dir.replace(/\/$/,'')+'/';
  return k.filter(function(x){return x.indexOf(d)===0&&x.slice(d.length).indexOf('/')<0})})};

var DB={
  store:null, canFolder:typeof window.showDirectoryPicker==='function', pending:null, name:'',
  init:function(){
    var self=this;
    if(!this.canFolder){ this.store=new LocalStore(); return Promise.resolve() }
    return IDB.get('kv','root').then(function(h){
      if(!h){ self.store=new LocalStore(); return }
      return h.queryPermission({mode:'readwrite'}).then(function(p){
        if(p==='granted'){ self.store=new FolderStore(h); self.name=h.name }
        else { self.pending=h; self.store=new LocalStore() }});
    }).catch(function(){ self.store=new LocalStore() });
  },
  resume:function(){
    var self=this; if(!this.pending) return Promise.resolve(false);
    return this.pending.requestPermission({mode:'readwrite'}).then(function(p){
      if(p!=='granted') return false;
      self.store=new FolderStore(self.pending); self.name=self.pending.name; self.pending=null; return true });
  },
  choose:function(){
    var self=this;
    if(!this.canFolder){ spiegaCartella(); return Promise.resolve(false) }
    return window.showDirectoryPicker({mode:'readwrite',id:'tavolo'}).then(function(h){
      return h.requestPermission({mode:'readwrite'}).then(function(){
        return IDB.set('kv','root',h).then(function(){
          self.store=new FolderStore(h); self.name=h.name; self.pending=null; return true })})});
  },
  readJSON:function(p){return this.store.readText(p).then(function(t){
    try{return t?JSON.parse(t):null}catch(e){return null}})},
  writeJSON:function(p,o){return this.store.writeText(p,JSON.stringify(o,null,2))},
  list:function(d){return this.store.list(d)},
  remove:function(p){return this.store.remove(p)},
  readBlob:function(p){return this.store.readBlob(p)},
  writeBlob:function(p,b){return this.store.writeBlob(p,b)}
};

/* ------------------------------------------------------------------- tema */
var MATERIALI={
  marmo:{n:'Marmo bianco',p:'#F4F2EE',p2:'#E9E6E0',l:'#CFCABF',i:'#24221E',d:'#5E594F',f:'#8B857A'},
  calacatta:{n:'Marmo dorato',p:'#F5F0E4',p2:'#EBE3D1',l:'#D3C8AE',i:'#2B2619',d:'#645B45',f:'#918770'},
  nero:{n:'Marmo nero',p:'#242220',p2:'#2E2B29',l:'#4A443E',i:'#F0ECE4',d:'#B5AFA4',f:'#8B857A'},
  rovere:{n:'Rovere',p:'#D9C4A0',p2:'#CBB48C',l:'#AE9670',i:'#2E2413',d:'#5F4E2E',f:'#87724F'},
  noce:{n:'Noce',p:'#5A4028',p2:'#4A3320',l:'#7B6140',i:'#F6EDDC',d:'#D3C1A6',f:'#A99madeup'},
  ebano:{n:'Ebano',p:'#241D22',p2:'#2E252E',l:'#453A46',i:'#EFE7F4',d:'#B9A9C4',f:'#8A7A94'}
};
MATERIALI.noce.f='#A9926F';
var METALLI={
  oro:{n:'Oro',c:['#5C410E','#C9A227','#F7E9A8','#8A6A17','#E6CF7A']},
  ororosa:{n:'Oro rosa',c:['#6B3B2A','#C98D74','#F6DED2','#9A5F49','#E7BCA8']},
  ottone:{n:'Ottone',c:['#4E3A14','#B08D57','#EBD9AC','#7C6229','#D3B87E']},
  argento:{n:'Argento',c:['#4A5058','#9AA3AE','#F0F3F6','#6E767F','#C9D0D7']},
  rame:{n:'Rame',c:['#5A2C12','#B06A3B','#F0C09B','#82461F','#DA9765']},
  ferro:{n:'Ferro brunito',c:['#22262A','#4C545C','#8B959E','#31373D','#69727A']}
};
var S={
  tab:'personaggi', pgs:[], pg:null, manuals:[], sess:null, sessioni:[], secChiuse:{}, tex:{}, texUrl:{}, bgUrl:'',
  cfg:{ mat:'marmo', met:'oro', polish:55, ring:3, orn:100, texop:100, bg:'#15140F',
        hasBg:false, layout:'grid', sfoglio:'ricciolo', foglio:'adattivo', profili:[], lastPg:null,
        dadi:['1d20','1d20 van','2d6','1d8','1d6','1d100'] }
};
function applyTheme(){
  var m=MATERIALI[S.cfg.mat]||MATERIALI.marmo, t=METALLI[S.cfg.met]||METALLI.oro;
  var R=document.documentElement.style;
  ['--m1','--m2','--m3','--m4','--m5'].forEach(function(k,i){R.setProperty(k,t.c[i])});
  R.setProperty('--panel',m.p); R.setProperty('--panel-2',m.p2); R.setProperty('--line',m.l);
  R.setProperty('--ink',m.i); R.setProperty('--ink-dim',m.d); R.setProperty('--ink-faint',m.f);
  R.setProperty('--polish',(S.cfg.polish/100*1.6).toFixed(2));
  R.setProperty('--ring',S.cfg.ring+'px');
  R.setProperty('--orn',(S.cfg.orn/100).toFixed(2));
  R.setProperty('--texop',(S.cfg.texop/100).toFixed(2));
  R.setProperty('--bg',S.cfg.bg);
  R.setProperty('--bgimg',S.bgUrl?'url('+S.bgUrl+')':'none');
  document.querySelector('meta[name=theme-color]').setAttribute('content',S.cfg.bg);
}
function texFor(i){
  var a=S.texUrl[S.cfg.mat]||[];
  if(!a.length) return '';
  return 'background-image:url('+a[i%a.length]+');background-position:'+((i*37)%100)+'% '+((i*53)%100)+'%';
}
var ornCount=0;
function slab(inner,opts){
  opts=opts||{};
  var i=ornCount++;
  var o=opts.plain?'':'<div class="orn">'+
    '<i class="tl"><svg><use href="#cornerOrn"/></svg></i>'+
    '<i class="tr"><svg><use href="#cornerOrn"/></svg></i>'+
    '<i class="bl"><svg><use href="#cornerOrn"/></svg></i>'+
    '<i class="br"><svg><use href="#cornerOrn"/></svg></i></div>';
  return '<div class="slab metal '+(opts.cls||'')+'"'+(opts.attr||'')+'><div class="face">'+
    '<div class="tex" style="'+texFor(i)+'"></div><div class="veil"></div>'+o+
    '<div class="pad">'+inner+'</div></div></div>';
}
function modal(inner,onMount){
  var sc=document.createElement('div'); sc.className='scrim';
  sc.innerHTML='<div class="modal metal"><div class="face"><div class="tex" style="'+texFor(3)+'"></div>'+
    '<div class="veil"></div><div class="pad">'+inner+'</div></div></div>';
  function close(){sc.remove()}
  sc.addEventListener('click',function(e){if(e.target===sc)close()});
  $$('[data-close]',sc).forEach(function(b){b.addEventListener('click',close)});
  $('#layers').appendChild(sc);
  if(onMount) onMount(sc,close);
  return {el:sc,close:close};
}
function ask(title,body,ok){
  return new Promise(function(res){
    var done=false;
    var m=modal('<h2 style="font-size:19px">'+esc(title)+'</h2>'+
      '<p class="faint" style="margin:8px 0 14px;line-height:1.55">'+body+'</p>'+
      '<div class="row"><button class="btn grow" data-no>Annulla</button>'+
      '<button class="mbtn metal grow" data-yes><span>'+esc(ok||'Conferma')+'</span></button></div>',
    function(el,close){
      $('[data-yes]',el).onclick=function(){done=true;close();res(true)};
      $('[data-no]',el).onclick=function(){done=true;close();res(false)};
      el.addEventListener('click',function(e){if(e.target===el&&!done){done=true;res(false)}});
    });
  });
}
function pickFile(accept,multi){
  return new Promise(function(res){
    var i=document.createElement('input'); i.type='file';
    if(accept) i.accept=accept; i.multiple=!!multi;
    i.onchange=function(){res([].slice.call(i.files))}; i.click();
  });
}
function shrink(file,max,q){
  return new Promise(function(res,rej){
    var img=new Image(), url=URL.createObjectURL(file);
    img.onload=function(){
      var s=Math.min(1,max/Math.max(img.width,img.height));
      var c=document.createElement('canvas');
      c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){res(b)},'image/jpeg',q||0.82);
    };
    img.onerror=function(){URL.revokeObjectURL(url);rej(new Error('immagine illeggibile'))};
    img.src=url;
  });
}
function download(name,blob){
  var u=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=u; a.download=name; a.click();
  setTimeout(function(){URL.revokeObjectURL(u)},4000);
}

/* ==========================================================================
   Sistemi di gioco. Ogni sistema descrive le sezioni della scheda e le
   regole di compilazione automatica.
   ========================================================================== */
var ABIL5E=[['acrobazia','Acrobazia','des'],['addestrare','Addestrare animali','sag'],
 ['arcano','Arcano','int'],['atletica','Atletica','forza'],['furtivita','Furtività','des'],
 ['indagare','Indagare','int'],['inganno','Inganno','car'],['intimidire','Intimidire','car'],
 ['intrattenere','Intrattenere','car'],['intuizione','Intuizione','sag'],['medicina','Medicina','sag'],
 ['natura','Natura','int'],['percezione','Percezione','sag'],['persuasione','Persuasione','car'],
 ['rapidita','Rapidità di mano','des'],['religione','Religione','int'],
 ['sopravvivenza','Sopravvivenza','sag'],['storia','Storia','int']];

var SLOT_PIENI={1:[2],2:[3],3:[4,2],4:[4,3],5:[4,3,2],6:[4,3,3],7:[4,3,3,1],8:[4,3,3,2],
 9:[4,3,3,3,1],10:[4,3,3,3,2],11:[4,3,3,3,2,1],12:[4,3,3,3,2,1],13:[4,3,3,3,2,1,1],
 14:[4,3,3,3,2,1,1],15:[4,3,3,3,2,1,1,1],16:[4,3,3,3,2,1,1,1],17:[4,3,3,3,2,1,1,1,1],
 18:[4,3,3,3,3,1,1,1,1],19:[4,3,3,3,3,2,1,1,1],20:[4,3,3,3,3,2,2,1,1]};

var CLASSI={
 bardo:{n:'Bardo',dv:8,inc:'pieno',carat:'car',ts:['des','car'],abil:3,
  arm:'Armature leggere, spade corte, balestre a mano, stocchi, spade lunghe, tre strumenti musicali',
  f:[
   ['Ispirazione bardica',1,'both','Con un\u2019azione bonus dai a un alleato un dado che potrà sommare a una prova, a un tiro per colpire o a un tiro salvezza. Gli usi tornano con il riposo lungo. Il dado cresce con il livello.'],
   ['Canto di riposo',2,'2014','Alla fine di un riposo breve, chi ti ascolta e recupera punti ferita ne recupera altri 1d6. Il dado cresce ai livelli 9, 13 e 17.'],
   ['Versatilità',2,'both','Aggiungi metà del bonus di competenza, arrotondato per difetto, a tutte le prove di caratteristica che non lo includono già.'],
   ['Collegio bardico',3,'both','Scegli la tua sottoclasse: concede competenze e privilegi che caratterizzano il tuo stile.'],
   ['Maestria',3,'2024','Scegli due abilità in cui sei competente: in quelle il bonus di competenza raddoppia. Ne aggiungi altre due al 9\u00b0 livello.'],
   ['Fonte di ispirazione',5,'both','Recuperi tutti gli usi di Ispirazione bardica anche con un riposo breve.'],
   ['Contro incantesimi',6,'2014','Come azione, tu e gli alleati vicini ottenete vantaggio ai tiri salvezza contro spavento e ammaliamento.'],
   ['Contro incantesimi',7,'2024','Come reazione, annulli o riduci gli effetti di spavento e ammaliamento su di te o su un alleato vicino.'],
   ['Segreti magici',10,'both','Impari incantesimi scelti liberamente fuori dalla lista da bardo: contano come incantesimi da bardo per te.'],
   ['Ispirazione superiore',20,'both','Se all\u2019inizio di un combattimento hai meno di due usi di Ispirazione bardica, torni ad averne due.']
  ]},
 chierico:{n:'Chierico',dv:8,inc:'pieno',carat:'sag',ts:['sag','car'],abil:2,
  arm:'Armature leggere e medie, scudi, armi semplici',
  f:[
   ['Incantesimi',1,'both','Prepari ogni giorno un numero di incantesimi pari al modificatore di Saggezza più il tuo livello.'],
   ['Dominio divino',1,'both','Scegli il dominio della tua divinità: concede incantesimi sempre preparati e privilegi.'],
   ['Incanalare divinità',2,'both','Un potere che spendi e recuperi con il riposo. Include sempre Scacciare non morti.'],
   ['Distruggere non morti',5,'both','I non morti deboli che fallirebbero il tiro contro Scacciare vengono ridotti in cenere.'],
   ['Intervento divino',10,'both','Invochi l\u2019aiuto della tua divinità: il Game Master decide come si manifesta.']
  ]},
 guerriero:{n:'Guerriero',dv:10,inc:'nessuno',carat:'forza',ts:['forza','cos'],abil:2,
  arm:'Tutte le armature, scudi, tutte le armi',
  f:[
   ['Stile di combattimento',1,'both','Scegli una specializzazione: arciere, difesa, duello, combattere con due armi, protezione o armi grandi.'],
   ['Recuperare energie',1,'both','Con un\u2019azione bonus recuperi 1d10 + il tuo livello in punti ferita. Torna con il riposo breve.'],
   ['Azione impetuosa',2,'both','Nel tuo turno puoi compiere un\u2019azione aggiuntiva. Torna con il riposo breve.'],
   ['Archetipo marziale',3,'both','La tua sottoclasse: campione, maestro di battaglia, cavaliere arcano e altre.'],
   ['Maestria nelle armi',1,'2024','Alcune armi ottengono una proprietà speciale quando le usi: sanguinare, spingere, rallentare e simili.'],
   ['Attacco extra',5,'both','Quando esegui l\u2019azione di attacco, attacchi due volte. Diventano tre all\u201911\u00b0 e quattro al 20\u00b0.'],
   ['Indomito',9,'both','Puoi ripetere un tiro salvezza fallito. Gli usi aumentano al 13\u00b0 e al 17\u00b0 livello.']
  ]},
 ladro:{n:'Ladro',dv:8,inc:'nessuno',carat:'des',ts:['des','int'],abil:4,
  arm:'Armature leggere, armi semplici, balestre a mano, spade corte, stocchi, arnesi da scasso',
  f:[
   ['Attacco furtivo',1,'both','Una volta per turno infliggi danni extra a un bersaglio se hai vantaggio o se un alleato lo sta impegnando. I dadi crescono di uno ogni due livelli.'],
   ['Gergo ladresco',1,'both','Un codice che permette di nascondere un messaggio dentro una conversazione ordinaria.'],
   ['Azione astuta',2,'both','Ogni turno puoi Scattare, Disimpegnarti o Nasconderti come azione bonus.'],
   ['Archetipo ladresco',3,'both','La sottoclasse: assassino, ladro, mistificatore arcano e altre.'],
   ['Schivata prodigiosa',5,'both','Come reazione, dimezzi i danni di un attacco che ti colpisce e che puoi vedere.'],
   ['Elusione',7,'both','Quando un effetto ti concede un tiro salvezza per dimezzare i danni, superandolo non ne subisci affatto.'],
   ['Talento affidabile',11,'both','Nelle prove in cui sei competente, ogni risultato del dado inferiore a 10 conta come 10.']
  ]},
 mago:{n:'Mago',dv:6,inc:'pieno',carat:'int',ts:['int','sag'],abil:2,
  arm:'Bastoni, pugnali, dardi, fionde, balestre leggere',
  f:[
   ['Libro degli incantesimi',1,'both','Il tuo libro contiene gli incantesimi che conosci. Ogni livello ne aggiungi due, e puoi copiarne altri trovati in giro.'],
   ['Recupero arcano',1,'both','Con un riposo breve recuperi slot per un totale di livelli pari a metà del tuo livello da mago.'],
   ['Tradizione arcana',2,'both','La tua scuola di magia: evocazione, illusione, negromanzia e le altre.'],
   ['Maestria negli incantesimi',18,'both','Scegli un incantesimo di 1\u00b0 e uno di 2\u00b0 livello: puoi lanciarli a volontà al loro livello base.'],
   ['Incantesimi leggendari',20,'both','Scegli due incantesimi di 3\u00b0 livello o inferiore: li lanci una volta ciascuno senza spendere slot.']
  ]},
 barbaro:{n:'Barbaro',dv:12,inc:'nessuno',carat:'forza',ts:['forza','cos'],abil:2,
  arm:'Armature leggere e medie, scudi, armi semplici e da guerra',
  f:[
   ['Ira',1,'both','In ira ottieni vantaggio alle prove di Forza, danni extra in mischia e resistenza ai danni contundenti, perforanti e taglienti.'],
   ['Difesa senza armatura',1,'both','Senza armatura la tua Classe Armatura è 10 più il modificatore di Destrezza più quello di Costituzione.'],
   ['Attacco irruento',2,'both','Puoi attaccare con vantaggio accettando che gli altri lo abbiano contro di te fino al tuo turno successivo.'],
   ['Percezione del pericolo',2,'both','Vantaggio ai tiri salvezza su Destrezza contro effetti che puoi vedere.'],
   ['Cammino primordiale',3,'both','La sottoclasse: berserker, guerriero totemico e le altre.'],
   ['Movimento veloce',5,'both','La tua velocità aumenta di 3 metri se non indossi armature pesanti.'],
   ['Ira implacabile',11,'both','Quando in ira scenderesti a 0 punti ferita, con un tiro salvezza su Costituzione resti in piedi con 1.']
  ]}
};
var USI_ISPIRAZIONE={1:'d6',5:'d8',10:'d10',15:'d12'};
var SPECIE=['Umano','Elfo','Nano','Halfling','Gnomo','Mezzelfo','Mezzorco','Tiefling','Dragonide','Aasimar','Goliath','Orco'];
var BACKGROUND=['Accolito','Artigiano','Ciarlatano','Criminale','Eremita','Intrattenitore','Marinaio','Nobile','Soldato','Popolano','Saggio','Forestiero'];

/* ---- calcolo automatico D&D ---- */
function compBonus(liv){ return 2+Math.floor((clamp(liv,1,20)-1)/4) }
function modOf(v){ return Math.floor((Number(v||10)-10)/2) }
function dadoIspirazione(liv){
  var d='d6'; Object.keys(USI_ISPIRAZIONE).forEach(function(k){ if(liv>=+k) d=USI_ISPIRAZIONE[k] });
  return d;
}
function slotPatto(liv){
  if(typeof SLOT_PATTO==='undefined') return [];
  var p=SLOT_PATTO[liv]; if(!p) return [];
  var out=[]; for(var i=0;i<p[1];i++) out.push(i===p[1]-1?p[0]:0);
  return out;
}
function autoDnD(pg){
  var v=pg.values, cl=CLASSI[v.classe]||CLASSI.bardo, liv=clamp(Number(v.liv||1),1,20);
  var ed=pg.sys==='dnd24'?'2024':pg.sys==='dnd14'?'2014':'mix';
  var comp=compBonus(liv);
  var cos=modOf(v.cos);
  var pfMax=cl.dv+(liv-1)*(Math.floor(cl.dv/2)+1)+cos*liv;
  var out={
    comp:comp,
    pfMax:Math.max(1,pfMax),
    iniz:modOf(v.des),
    cd:8+comp+modOf(v[cl.carat]),
    atkInc:comp+modOf(v[cl.carat]),
    percPass:10+modOf(v.sag)+((v.abil&&v.abil.percezione?v.abil.percezione:0)?comp:0),
    slot: cl.inc==='pieno' ? (SLOT_PIENI[liv]||[])
        : cl.inc==='mezzo' ? (typeof SLOT_MEZZI!=='undefined'?(SLOT_MEZZI[liv]||[]):[])
        : cl.inc==='patto' ? slotPatto(liv) : [],
    patto: cl.inc==='patto',
    dv: liv+'d'+cl.dv,
    tsComp: cl.ts,
    arm: cl.arm,
    ispirazione: v.classe==='bardo' ? dadoIspirazione(liv) : null,
    priv: cl.f.filter(function(f){
        if(f[1]>liv) return false;
        if(ed==='mix') return true;
        return f[2]==='both'||f[2]===ed;
      }).map(function(f){ return {n:f[0],liv:f[1],ed:f[2],t:f[3]} })
      .sort(function(a,b){return a.liv-b.liv})
  };
  return out;
}

/* ---- Fabula Ultima ---- */
var FU_CLASSI=['Arcanista','Cavaliere Oscuro','Cacciatore','Domatore','Elementalista','Fortificatore',
 'Furfante','Guardiano','Mutaforma','Oratore','Sacerdote','Spadaccino','Spiritista','Tessitore','Tiratore','Tuttofare','Viandante'];
var FU_STATUS=['Lento','Confuso','Debole','Scosso','Furente','Avvelenato'];
var FU_EMOZ=[['Ammirazione','Inferiorità'],['Lealtà','Sfiducia'],['Affetto','Odio']];
function autoFU(pg){
  var v=pg.values, liv=clamp(Number(v.liv||5),5,50);
  var vig=Number(v.vigore||8), vol=Number(v.volonta||8), des=Number(v.destrezza||8), intu=Number(v.intuito||8);
  var pv=vig*5+liv+Number(v.pvExtra||0), pm=vol*5+liv+Number(v.pmExtra||0);
  return {pv:pv,pm:pm,crisi:Math.floor(pv/2),pi:6+Number(v.piExtra||0),
    dif:des+Number(v.difExtra||0),difM:intu+Number(v.difMExtra||0)};
}

/* ---- 7th Sea ---- */
var S7_TRATTI=[['vigore','Vigore'],['prontezza','Prontezza'],['risolutezza','Risolutezza'],
 ['ingegno','Ingegno'],['panache','Panache']];
var S7_ABIL=[['mira','Mira'],['atletica','Atletica'],['rissa','Rissa'],['convincere','Convincere'],
 ['empatia','Empatia'],['nascondersi','Nascondersi'],['intimidire','Intimidire'],['notare','Notare'],
 ['spettacolo','Spettacolo'],['cavalcare','Cavalcare'],['navigare','Navigare'],['erudizione','Erudizione'],
 ['tentare','Tentare'],['furto','Furto'],['tattica','Tattica'],['armi','Armi']];
var S7_NAZIONI=['Avalon','Castiglia','Eisen','Montaigne','Sarmatia','Ussura','Vestenmennavenjar','Vodacce','Inismore','Highland Marches'];

/* ---- Not the End ---- */
var NTE_POSIZIONI=['Archetipo','Qualità','Qualità','Qualità','Abilità','Abilità','Abilità','Abilità'];

var SISTEMI={
 dnd14:{n:'D&D 5e (2014)',fam:'dnd'},
 dnd24:{n:'D&D 2024',fam:'dnd'},
 dndmix:{n:'D&D unificato',fam:'dnd'},
 nte:{n:'Not the End',fam:'nte'},
 s7:{n:'7th Sea',fam:'s7'},
 fu:{n:'Fabula Ultima',fam:'fu'}
};
function nuovoPG(sys,nome){
  var v={};
  if(SISTEMI[sys]&&SISTEMI[sys].fam==='custom') v={};else
  if(SISTEMI[sys].fam==='dnd'){
    v={classe:'bardo',liv:1,specie:'Umano',background:'Popolano',
       forza:10,des:10,cos:10,int:10,sag:10,car:10,abil:{},ts:{},pf:{cur:null},
       ca:10,vel:9,pfTemp:0,ispirazioneUsi:0,slotUsati:{},atk:[],equip:'',incant:[]};
  }else if(SISTEMI[sys].fam==='fu'){
    v={liv:5,classi:[],destrezza:8,intuito:8,vigore:8,volonta:8,
       identita:'',tema:'',origine:'',pvCur:null,pmCur:null,piCur:null,
       fabula:3,zenit:0,px:0,status:{},legami:[],abilita:[],orologi:[],equip:[],
       difMod:0,difMMod:0,iniMod:0,pvExtra:0,pmExtra:0,piExtra:0};
  }else if(SISTEMI[sys].fam==='s7'){
    v={nazione:'Montaigne',concetto:'',tratti:{},abil:{},eroismo:3,ferite:0,drammatiche:0,
       vantaggi:[],storie:[],arcani:{virtu:'',ossessione:''}};
    S7_TRATTI.forEach(function(t){v.tratti[t[0]]=2});
    S7_ABIL.forEach(function(a){v.abil[a[0]]=0});
  }else{
    v={frase:'',hex:['','','','','','','',''],cicatrici:[],lezioni:[],sventure:[],
       tokenPos:0,tokenNeg:0,note:''};
  }
  return {id:uid('pg'),sys:sys,name:nome||'Senza nome',portrait:null,shape:'rect',
          values:v,notes:'',createdAt:nowISO(),updatedAt:nowISO()};
}

/* ========================================================== persistenza PG */
function saveCfg(){ return DB.writeJSON(P.config,S.cfg) }
var saveCfgSoon=debounce(saveCfg,400);
function savePG(pg){
  pg.updatedAt=nowISO();
  return DB.writeJSON(P.pg(pg.id),pg).then(function(){
    var i=-1; S.pgs.forEach(function(m,k){ if(m.id===pg.id) i=k });
    var meta={id:pg.id,sys:pg.sys,name:pg.name,portrait:pg.portrait,shape:pg.shape,
      updatedAt:pg.updatedAt,sub:sottotitolo(pg)};
    if(i>=0) S.pgs[i]=meta; else S.pgs.unshift(meta);
  });
}
var savePGSoon=debounce(function(){ if(S.pg) savePG(S.pg) },700);
function sottotitolo(pg){
  if(!SISTEMI[pg.sys]) return 'sistema non disponibile';
  var v=pg.values, s=SISTEMI[pg.sys].n;
  if(SISTEMI[pg.sys].fam==='custom') return s;
  if(SISTEMI[pg.sys].fam==='dnd') return s+' · '+(CLASSI[v.classe]?CLASSI[v.classe].n:'')+' '+(v.liv||1)+
    (v.sotto?' · '+v.sotto:'');
  if(SISTEMI[pg.sys].fam==='fu') return s+' · livello '+(v.liv||5);
  if(SISTEMI[pg.sys].fam==='s7') return s+' · '+(v.nazione||'');
  return s;
}
function loadAll(){
  return DB.readJSON(P.config).then(function(c){
    if(c) Object.keys(c).forEach(function(k){S.cfg[k]=c[k]});
    return DB.list('personaggi');
  }).then(function(ps){
    return Promise.all(ps.map(function(p){return DB.readJSON(p)}));
  }).then(function(list){
    S.pgs=list.filter(Boolean).map(function(c){
      return {id:c.id,sys:c.sys,name:c.name,portrait:c.portrait,shape:c.shape,
              updatedAt:c.updatedAt,sub:sottotitolo(c)}});
    S.pgs.sort(function(a,b){return String(b.updatedAt).localeCompare(String(a.updatedAt))});
    return DB.list('manuali');
  }).then(function(ms){
    return Promise.all(ms.filter(function(p){return /\.json$/.test(p)}).map(function(p){return DB.readJSON(p)}));
  }).then(function(list){
    S.manuals=list.filter(Boolean);
    return loadTextures();
  });
}
function loadTextures(){
  var jobs=[];
  Object.keys(MATERIALI).forEach(function(k){
    S.texUrl[k]=[];
    [0,1,2].forEach(function(i){
      jobs.push(DB.readBlob(P.tex(k,i)).then(function(b){
        if(b) S.texUrl[k][i]=URL.createObjectURL(b) }).catch(function(){}));
    });
  });
  if(S.cfg.hasBg) jobs.push(DB.readBlob(P.bgimg).then(function(b){
    if(b) S.bgUrl=URL.createObjectURL(b) }).catch(function(){}));
  return Promise.all(jobs).then(function(){
    Object.keys(S.texUrl).forEach(function(k){
      S.texUrl[k]=S.texUrl[k].filter(Boolean) });
  });
}

/* ================================================================= render */
var TABS=[['personaggi','✧','Personaggi'],['scheda','❧','Scheda'],['sessione','⚔','Sessioni'],
          ['compendio','☰','Compendio'],['manuali','▤','Manuali'],['aspetto','◈','Aspetto']];
function render(){
  $('#tabs').innerHTML=TABS.map(function(t){
    return '<button data-tab="'+t[0]+'" aria-selected="'+(S.tab===t[0])+'">'+
      '<span class="g">'+t[1]+'</span>'+t[2]+'</button>'}).join('');
  $('#storeLabel').textContent=DB.store&&DB.store.folder?('/'+DB.name):'archivio locale';
  ornCount=0;
  var y=window.scrollY;
  var v={personaggi:viewPG,scheda:viewScheda,sessione:viewSess,manuali:viewManuali,
         compendio:viewCompendio,aspetto:viewAspetto}[S.tab];
  $('#view').innerHTML=v?v():'';
  diceBar();
  if(renderTop){ renderTop=false; window.scrollTo(0,0) }
  else window.scrollTo(0,y);
}
var renderTop=false;
function renderFromTop(){ renderTop=true; render() }
function diceBar(){
  var b=$('.dicebar'), show=S.tab==='scheda'||S.tab==='sessione';
  if(!show){ if(b) b.remove(); document.body.classList.remove('hasdice'); return }
  if(!b){ b=document.createElement('div'); b.className='dicebar'; $('#layers').appendChild(b) }
  var extra=S.pg?dadiSistema(S.pg.sys):[];
  b.innerHTML=extra.concat(S.cfg.dadi).map(function(d){
    return '<button class="dchip" data-quick="'+esc(d)+'">'+esc(d)+'</button>'}).join('')+
    '<button class="dchip" data-act="dadolibero">＋ formula</button>';
}
function dadiSistema(sys){
  var f=SISTEMI[sys]?SISTEMI[sys].fam:'';
  if(f==='s7') return [];
  if(f==='fu') return ['d8+d8','d10+d8'];
  if(f==='nte') return [];
  return [];
}

/* ------------------------------------------------------------- libreria */
function viewPG(){
  var head=slab('<div class="row"><div class="grow"><div class="eyebrow">Libreria</div>'+
    '<div class="faint">'+S.pgs.length+' personagg'+(S.pgs.length===1?'io':'i')+'</div></div>'+
    '<div class="row" style="gap:5px">'+
    '<button class="btn sm" data-lay="grid" aria-pressed="'+(S.cfg.layout==='grid')+'">Icone</button>'+
    '<button class="btn sm" data-lay="list" aria-pressed="'+(S.cfg.layout==='list')+'">Elenco</button>'+
    '</div></div>'+
    '<div class="row" style="margin-top:11px"><button class="mbtn metal grow" data-act="nuovopg">'+
    '<span>Nuovo personaggio</span></button></div>');
  if(!S.pgs.length) return head+slab('<div class="empty"><span class="g">✧</span>'+
    'Nessun personaggio.<br>Creane uno: nome, classe e livello bastano.</div>',{plain:true});
  if(S.cfg.layout==='grid'){
    return head+'<div class="lgrid">'+S.pgs.map(function(p,i){
      return '<button class="slab metal" style="margin:0" data-open="'+p.id+'"><div class="face">'+
        '<div class="tex" style="'+texFor(i+2)+'"></div><div class="veil"></div>'+
        '<div class="pad" style="padding:11px">'+ritratto(p,'ph')+
        '<div class="nm"><b>'+esc(p.name)+'</b><i>'+esc(p.sub||'')+'</i></div>'+
        '</div></div></button>'}).join('')+'</div>';
  }
  return head+S.pgs.map(function(p,i){
    return '<button class="slab metal" data-open="'+p.id+'"><div class="face">'+
      '<div class="tex" style="'+texFor(i+2)+'"></div><div class="veil"></div>'+
      '<div class="pad" style="padding:10px"><div class="lrow">'+ritratto(p,'th')+
      '<div class="grow"><b style="font-family:var(--display);font-size:19px;font-weight:600;display:block;line-height:1.15">'+
      esc(p.name)+'</b><i style="font-style:normal;font-size:12px;color:var(--ink-faint)">'+esc(p.sub||'')+'</i></div>'+
      '<span class="pill">apri</span></div></div></div></button>'}).join('');
}
function ritratto(p,cls){
  var circ=p.shape==='circle'?' circ':'';
  return '<div class="'+cls+' metal'+circ+'"><div class="in2">'+
    (p.portrait?'<img src="'+p.portrait+'" alt="">':'<span class="ini">'+esc((p.name||'?').charAt(0).toUpperCase())+'</span>')+
    '</div></div>';
}

/* --------------------------------------------------------------- scheda */
function viewScheda(){
  if(!S.pg) return slab('<div class="empty"><span class="g">❧</span>Nessuna scheda aperta.</div>'+
    '<button class="mbtn metal" style="width:100%" data-tabgo="personaggi"><span>Vai alla libreria</span></button>');
  var pg=S.pg, fam=SISTEMI[pg.sys].fam;
  var head=slab('<div class="row">'+ritratto(pg,'th')+
    '<div class="grow"><input data-name value="'+esc(pg.name)+'" style="background:transparent;border:0;padding:0;'+
    'font-family:var(--display);font-size:21px;font-weight:700">'+
    '<div class="faint">'+esc(sottotitolo(pg))+'</div></div>'+
    '<button class="btn sm" data-act="ritratto">Foto</button>'+
    '<button class="btn sm" data-act="menupg">⋯</button></div>');
  var body;
  if(fam==='custom'&&typeof sheetCustom==='function') body=sheetCustom(pg);
  else if(fam==='dnd'&&S.cfg.foglio==='cartaceo'&&typeof sheetCarta==='function') body=sheetCarta(pg);
  else body={dnd:sheetDnD,fu:sheetFU,s7:sheetS7,nte:sheetNTE}[fam](pg);
  var note=slab('<details class="sec"><summary>Appunti</summary>'+
    '<textarea data-notes rows="5" placeholder="Tutto quello che non entra nei campi.">'+esc(pg.notes||'')+'</textarea></details>');
  return head+body+note;
}
function sec(title,inner,open){
  var closed = S.secChiuse[title]!==undefined ? S.secChiuse[title] : (open===false);
  return '<details class="sec" data-sec="'+esc(title)+'"'+(closed?'':' open')+
    '><summary>'+esc(title)+'</summary>'+inner+'</details>';
}
function statBox(id,label,val,mod){
  return '<div class="stat"><div class="lab">'+esc(label)+'</div>'+
    '<input type="number" inputmode="numeric" data-v="'+id+'" value="'+(val==null?10:val)+'">'+
    '<button class="mod metal" data-roll="1d20'+(mod>=0?'+':'')+mod+'" data-rl="'+esc(label)+'">'+
    (mod>=0?'+':'')+mod+'</button></div>';
}
function lineRow(label,valTxt,rollExpr,detId,detTxt,tag){
  return '<div class="line" data-det="'+(detId||'')+'">'+
    (rollExpr?'<button class="v" data-roll="'+esc(rollExpr)+'" data-rl="'+esc(label)+'">'+esc(valTxt)+'</button>'
             :'<span class="v">'+esc(valTxt)+'</span>')+
    '<span class="grow">'+esc(label)+'</span>'+
    (tag?'<span class="pill">'+esc(tag)+'</span>':'')+'</div>'+
    (detTxt?'<div class="det" id="'+detId+'"><div class="body">'+esc(detTxt)+'</div></div>':'');
}

function sheetDnD(pg){
  var v=pg.values, A=autoDnD(pg), out='';
  if(v.pf.cur==null) v.pf.cur=A.pfMax;
  var opts=function(list,cur,keyed){
    return list.map(function(o){
      var val=keyed?o[0]:o, lab=keyed?o[1]:o;
      return '<option value="'+esc(val)+'"'+(String(cur)===String(val)?' selected':'')+'>'+esc(lab)+'</option>'}).join('')};
  out+=slab(sec('Identità','<div class="grid g2">'+
    '<label><span class="lab">Classe</span><select data-v="classe">'+
      opts(Object.keys(CLASSI).map(function(k){return [k,CLASSI[k].n]}),v.classe,true)+'</select></label>'+
    '<label><span class="lab">Livello</span><input type="number" inputmode="numeric" min="1" max="20" data-v="liv" value="'+(v.liv||1)+'"></label>'+
    '<label><span class="lab">Specie</span><select data-v="specie">'+opts(SPECIE,v.specie)+'</select></label>'+
    '<label><span class="lab">Background</span><select data-v="background">'+opts(BACKGROUND,v.background)+'</select></label>'+
    (typeof SOTTOCLASSI!=='undefined'&&SOTTOCLASSI[v.classe]&&Number(v.liv||1)>=SOTTOCLASSI[v.classe].liv
      ? '<label style="grid-column:1/-1"><span class="lab">'+esc(SOTTOCLASSI[v.classe].n)+'</span>'+
        '<select data-v="sotto"><option value="">— scegli —</option>'+
        SOTTOCLASSI[v.classe].l.map(function(x){
          return '<option'+(v.sotto===x.n?' selected':'')+'>'+esc(x.n)+(x.srd?'':' ·')+'</option>'}).join('')+
        '</select></label>' : '')+
    '</div><p class="faint" style="margin:9px 0 0">Competenze da classe: '+esc(A.arm)+'</p>'));

  out+=slab(sec('Caratteristiche','<div class="grid g3">'+
    [['forza','Forza'],['des','Destrezza'],['cos','Costituzione'],['int','Intelligenza'],['sag','Saggezza'],['car','Carisma']]
    .map(function(c){return statBox(c[0],c[1],v[c[0]],modOf(v[c[0]]))}).join('')+'</div>'));

  out+=slab(sec('Valori di gioco','<div class="grid g3">'+
    autoCell('Competenza','+'+A.comp)+
    '<div class="stat"><div class="lab">Classe armatura</div><input type="number" inputmode="numeric" data-v="ca" value="'+(v.ca||10)+'"></div>'+
    '<div class="stat"><div class="lab">Iniziativa</div><div style="font-family:var(--mono);font-size:21px;font-weight:700">'+
      (A.iniz>=0?'+':'')+A.iniz+'</div><button class="mod metal" data-roll="1d20'+(A.iniz>=0?'+':'')+A.iniz+'" data-rl="Iniziativa">tira</button></div>'+
    autoCell('CD incantesimi',A.cd)+
    autoCell('Attacco magico',(A.atkInc>=0?'+':'')+A.atkInc)+
    autoCell('Percezione passiva',A.percPass)+
    '</div>'));

  var pct=A.pfMax?clamp(v.pf.cur/A.pfMax*100,0,100):0;
  out+=slab(sec('Punti ferita',
    '<div class="trk"><div class="row" style="gap:6px">'+
    '<button class="btn sm" data-pf="-1">−</button>'+
    '<input class="grow" type="number" inputmode="numeric" data-pfcur value="'+v.pf.cur+'" style="text-align:center;font-family:var(--mono);font-weight:700;font-size:18px">'+
    '<span class="faint">/ '+A.pfMax+'</span>'+
    '<button class="btn sm" data-pf="1">＋</button></div>'+
    '<div class="bar"><i style="width:'+pct+'%"></i></div>'+
    '<p class="faint" style="margin:8px 0 0">Massimo calcolato con la media dei dadi vita: '+A.dv+' più Costituzione. '+
    'Se al tavolo tiri i dadi, scrivi il tuo valore negli appunti.</p>'+
    '<div class="row" style="margin-top:9px"><label class="grow"><span class="lab">PF temporanei</span>'+
    '<input type="number" inputmode="numeric" data-v="pfTemp" value="'+(v.pfTemp||0)+'"></label>'+
    '<label class="grow"><span class="lab">Dadi vita</span><input data-v="dvUsati" value="'+esc(v.dvUsati||A.dv)+'"></label></div></div>'));

  out+=slab(sec('Tiri salvezza',
    [['forza','Forza'],['des','Destrezza'],['cos','Costituzione'],['int','Intelligenza'],['sag','Saggezza'],['car','Carisma']]
    .map(function(c){
      var comp=A.tsComp.indexOf(c[0])>=0, tot=modOf(v[c[0]])+(comp?A.comp:0);
      return '<div class="line"><span class="pill" style="min-width:26px;text-align:center">'+(comp?'●':'○')+'</span>'+
        '<span class="grow">'+c[1]+'</span>'+
        '<button class="v" data-roll="1d20'+(tot>=0?'+':'')+tot+'" data-rl="TS '+c[1]+'">'+(tot>=0?'+':'')+tot+'</button></div>'
    }).join('')+'<p class="faint" style="margin:6px 0 0">I pallini pieni sono le competenze che la classe assegna da regolamento.</p>'));

  out+=slab(sec('Abilità',ABIL5E.map(function(a){
    var st=(v.abil&&v.abil[a[0]])||0;
    var tot=modOf(v[a[2]])+(st===2?A.comp*2:st===1?A.comp:0);
    return '<div class="line"><button class="pill" data-abil="'+a[0]+'" style="min-width:30px;text-align:center">'+
      (st===2?'●●':st===1?'●':'○')+'</button>'+
      '<span class="grow">'+a[1]+' <span class="faint" style="font-size:11px">'+a[2]+'</span></span>'+
      '<button class="v" data-roll="1d20'+(tot>=0?'+':'')+tot+'" data-rl="'+a[1]+'">'+(tot>=0?'+':'')+tot+'</button></div>'
  }).join('')+'<p class="faint" style="margin:6px 0 0">Tocca il pallino: vuoto, competente, esperto.</p>'));

  var tuttiPriv=A.priv.slice();
  if(typeof privSotto==='function') tuttiPriv=tuttiPriv.concat(privSotto(pg));
  tuttiPriv.sort(function(a,b){return a.liv-b.liv});
  var privHtml=tuttiPriv.map(function(f,i){
    var tag=f.sotto?(f.vuoto?'da scrivere':f.bozza?'bozza':'sottoclasse')
                   :(pg.sys==='dndmix'&&f.ed!=='both'?f.ed:'');
    var riga='<div class="line" data-det="pv'+i+'">'+
      '<span class="v">'+f.liv+'</span><span class="grow">'+esc(f.n)+'</span>'+
      (tag?'<span class="pill">'+esc(tag)+'</span>':'')+'</div>'+
      '<div class="det" id="pv'+i+'"><div class="body">'+esc(f.t)+
      (f.chiave?'<div class="row" style="margin-top:9px;gap:7px">'+
        '<button class="btn sm" data-act="scriviSotto" data-chiave="'+esc(f.chiave)+'">'+
        (f.vuoto?'Scrivi il testo':f.bozza?'Correggi la bozza':'Modifica')+'</button>'+
        (modoStudio()&&f.vuoto?'<button class="btn sm" data-act="completaSottoclassi">Dal manuale</button>':'')+
        '</div>':'')+
      '</div></div>';
    return riga}).join('');
  out+=slab(sec('Privilegi',
    '<div class="eyebrow" style="margin-bottom:7px">'+A.priv.length+' di classe'+
    (v.sotto?' · '+esc(v.sotto):'')+(A.ispirazione?' · ispirazione '+A.ispirazione:'')+'</div>'+privHtml));

  if(A.slot.length){
    out+=slab(sec('Slot incantesimo','<div class="grid g3">'+A.slot.map(function(n,i){
      var used=(v.slotUsati&&v.slotUsati[i+1])||0;
      return '<div class="stat"><div class="lab">'+(i+1)+'\u00b0</div>'+
        '<div class="pips" style="justify-content:center">'+
        Array.apply(null,Array(n)).map(function(_,k){
          return '<button class="pip metal'+(k<used?' on':'')+'" data-slot="'+(i+1)+'" data-n="'+(k+1)+'">'+
            (k<used?'<span class="metal"></span>':'')+'</button>'}).join('')+'</div></div>'
    }).join('')+'</div><p class="faint" style="margin:8px 0 0">Tocca un pallino per segnare lo slot speso. Il numero di slot è calcolato dal livello.</p>'));
  }

  out+=slab(sec('Attacchi',
    '<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">Armi</div>'+
    '<button class="mbtn metal sm" data-act="pickarma"><span>＋ dal compendio</span></button></div>'+
    listaEditabile('atk',v.atk||[],[['nome','Arma'],['bonus','Tiro'],['danni','Danni']],'1d20+{bonus}')));
  out+=slab(sec('Incantesimi',
    '<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">'+((v.incant||[]).length)+' conosciuti</div>'+
    '<button class="mbtn metal sm" data-act="pickinc"><span>＋ dal compendio</span></button></div>'+
    ((v.incant||[]).length ? v.incant.map(function(sp,i){
      return '<div class="line" data-det="inc'+i+'">'+
        '<span class="v">'+(sp.liv==0?'T':sp.liv)+'</span>'+
        '<span class="grow">'+esc(sp.nome)+'<span class="faint" style="font-size:11px"> '+esc(sp.scuola||'')+'</span></span>'+
        '<button class="btn sm danger" data-delrow="incant" data-i="'+i+'">✕</button></div>'+
        '<div class="det" id="inc'+i+'"><div class="body">'+
        (sp.tempo?'<b>'+esc(sp.tempo)+'</b> · '+esc(sp.gittata||'')+' · '+esc(sp.durata||'')+'<br>':'')+
        esc(sp.note||'')+'</div></div>'}).join('')
     : '<p class="faint">Nessun incantesimo. Aprendo il compendio li trovi in ordine alfabetico con l\u2019effetto già scritto.</p>')));
  out+=slab(sec('Equipaggiamento','<textarea data-v="equip" rows="4">'+esc(v.equip||'')+'</textarea>',false));
  return out;
}
function autoCell(label,val){
  return '<div class="stat"><div class="lab">'+esc(label)+'</div>'+
    '<div style="font-family:var(--mono);font-size:21px;font-weight:700">'+esc(String(val))+'</div>'+
    '<div class="pill" style="margin-top:3px">auto</div></div>';
}
function listaEditabile(key,rows,cols,rollTpl){
  return '<div data-list="'+key+'">'+rows.map(function(r,i){
    return '<div class="line newin" style="flex-wrap:wrap">'+cols.map(function(c,ci){
      return '<input data-cell="'+key+'" data-i="'+i+'" data-c="'+c[0]+'" placeholder="'+esc(c[1])+'" value="'+esc(r[c[0]]||'')+'"'+
        ' style="flex:'+(ci===0?'2 1 45%':'1 1 22%')+';min-width:70px">'}).join('')+
      (rollTpl?'<button class="btn sm" data-rollrow="'+key+'" data-i="'+i+'" data-tpl="'+esc(rollTpl)+'">tira</button>':'')+
      '<button class="btn sm danger" data-delrow="'+key+'" data-i="'+i+'">✕</button></div>'}).join('')+
    '</div><button class="btn sm" data-addrow="'+key+'" style="margin-top:6px">＋ riga</button>';
}

/* --------------------------------------------------------- Fabula Ultima */
function sheetFU(pg){
  var v=pg.values, A=autoFU(pg), out='';
  if(v.pvCur==null) v.pvCur=A.pv;
  if(v.pmCur==null) v.pmCur=A.pm;
  var tag=[6,8,10,12];
  out+=slab(sec('Identità','<div class="grid g2">'+
    '<label><span class="lab">Livello totale</span><input type="number" inputmode="numeric" data-v="liv" value="'+(v.liv||5)+'"></label>'+
    '<label><span class="lab">Punti Fabula</span><input type="number" inputmode="numeric" data-v="fabula" value="'+(v.fabula||0)+'"></label>'+
    '</div><div class="eyebrow" style="margin:11px 0 6px">Classi</div>'+
    listaEditabile('classi',v.classi||[],[['n','Classe'],['liv','Livelli']],null)));

  out+=slab(sec('Caratteristiche','<div class="grid g2">'+
    [['destrezza','Destrezza'],['intuito','Intuito'],['vigore','Vigore'],['volonta','Volontà']]
    .map(function(c){
      return '<div class="stat"><div class="lab">'+c[1]+'</div>'+
        '<div class="row" style="justify-content:center;gap:4px;margin-top:3px">'+
        tag.map(function(t){return '<button class="pill" data-fu="'+c[0]+'" data-t="'+t+'"'+
          (Number(v[c[0]])===t?' style="box-shadow:inset 0 0 0 2px var(--m2);color:var(--ink)"':'')+
          '>d'+t+'</button>'}).join('')+'</div>'+
        '<button class="mod metal" style="margin-top:6px" data-roll="1d'+(v[c[0]]||8)+'+1d'+(v[c[0]]||8)+'" data-rl="'+c[1]+'">tira</button></div>'
    }).join('')+'</div><p class="faint" style="margin:9px 0 0">Un Test tira due caratteristiche: usa la barra dei dadi per combinarle, per esempio d10+d8.</p>'));

  var pvp=A.pv?clamp(v.pvCur/A.pv*100,0,100):0, pmp=A.pm?clamp(v.pmCur/A.pm*100,0,100):0;
  out+=slab(sec('Punti e difese',
    '<div class="trk"><div class="row" style="gap:6px"><span class="lab" style="width:34px;margin:0">PV</span>'+
    '<button class="btn sm" data-fupv="-1">−</button>'+
    '<input class="grow" type="number" inputmode="numeric" data-fucur="pvCur" value="'+v.pvCur+'" style="text-align:center;font-family:var(--mono);font-weight:700">'+
    '<span class="faint">/ '+A.pv+'</span><button class="btn sm" data-fupv="1">＋</button></div>'+
    '<div class="bar"><i style="width:'+pvp+'%"></i></div></div>'+
    '<div class="trk" style="margin-top:10px"><div class="row" style="gap:6px"><span class="lab" style="width:34px;margin:0">PM</span>'+
    '<button class="btn sm" data-fupm="-1">−</button>'+
    '<input class="grow" type="number" inputmode="numeric" data-fucur="pmCur" value="'+v.pmCur+'" style="text-align:center;font-family:var(--mono);font-weight:700">'+
    '<span class="faint">/ '+A.pm+'</span><button class="btn sm" data-fupm="1">＋</button></div>'+
    '<div class="bar"><i style="width:'+pmp+'%"></i></div></div>'+
    '<div class="grid g3" style="margin-top:11px">'+
    autoCell('Crisi',A.crisi)+autoCell('Difesa',A.dif)+autoCell('Difesa magica',A.difM)+
    '</div><p class="faint" style="margin:8px 0 0">PV pari a Vigore per cinque più il livello, PM pari a Volontà per cinque più il livello. '+
    'I bonus di classe si aggiungono qui sotto.</p>'+
    '<div class="grid g3" style="margin-top:8px">'+
    ['pvExtra:PV extra','pmExtra:PM extra','piExtra:PI extra'].map(function(x){var a=x.split(':');
      return '<label><span class="lab">'+a[1]+'</span><input type="number" inputmode="numeric" data-v="'+a[0]+'" value="'+(v[a[0]]||0)+'"></label>'}).join('')+
    '</div>'));

  out+=slab(sec('Status',
    '<div class="row wrap">'+FU_STATUS.map(function(s){
      var on=v.status&&v.status[s];
      return '<button class="pill" data-status="'+esc(s)+'"'+(on?' style="box-shadow:inset 0 0 0 2px var(--m2);color:var(--ink)"':'')+'>'+
        (on?'● ':'○ ')+s+'</button>'}).join('')+'</div>'));

  out+=slab(sec('Legami',listaEditabile('legami',v.legami||[],
    [['n','Chi'],['e','Emozioni'],['f','Forza']],null)+
    '<p class="faint" style="margin:8px 0 0">Emozioni positive: ammirazione, lealtà, affetto. Negative: inferiorità, sfiducia, odio. '+
    'La forza va da 1 a 3.</p>'));
  out+=slab(sec('Abilità e incantesimi',listaEditabile('abilita',v.abilita||[],
    [['n','Nome'],['la','LA'],['t','Effetto']],null),false));
  out+=slab(sec('Equipaggiamento','<textarea data-v="equip" rows="4">'+esc(v.equip||'')+'</textarea>',false));
  return out;
}

/* ------------------------------------------------------------- 7th Sea */
function sheetS7(pg){
  var v=pg.values, out='';
  function dots(key,val,max,attr){
    return '<div class="dots">'+Array.apply(null,Array(max)).map(function(_,i){
      return '<button class="dot'+(i<val?' on':'')+'" data-'+attr+'="'+key+'" data-n="'+(i+1)+'"></button>'}).join('')+'</div>';
  }
  out+=slab(sec('Eroe','<div class="grid g2">'+
    '<label><span class="lab">Nazione</span><select data-v="nazione">'+
      S7_NAZIONI.map(function(n){return '<option'+(v.nazione===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select></label>'+
    '<label><span class="lab">Concetto</span><input data-v="concetto" value="'+esc(v.concetto||'')+'"></label>'+
    '<label><span class="lab">Virtù</span><input data-v2="arcani.virtu" value="'+esc((v.arcani||{}).virtu||'')+'"></label>'+
    '<label><span class="lab">Ossessione</span><input data-v2="arcani.ossessione" value="'+esc((v.arcani||{}).ossessione||'')+'"></label>'+
    '</div>'));

  out+=slab(sec('Tratti',S7_TRATTI.map(function(t){
    var val=(v.tratti||{})[t[0]]||0;
    return '<div class="line"><span class="grow">'+t[1]+'</span>'+dots(t[0],val,5,'tratto')+
      '<span class="v">'+val+'</span></div>'}).join('')));

  out+=slab(sec('Abilità',S7_ABIL.map(function(a){
    var val=(v.abil||{})[a[0]]||0;
    return '<div class="line"><span class="grow">'+a[1]+'</span>'+dots(a[0],val,5,'abils7')+
      '<span class="v">'+val+'</span></div>'}).join('')+
    '<p class="faint" style="margin:8px 0 0">Per tirare, scegli tratto e abilità dal pulsante qui sotto: '+
    'il pool di d10 è la loro somma e le alzate si contano a dieci.</p>'+
    '<button class="mbtn metal" style="margin-top:9px" data-act="pool7"><span>Comporre un tiro</span></button>'));

  out+=slab(sec('Stato','<div class="grid g3">'+
    '<label><span class="lab">Punti eroe</span><input type="number" inputmode="numeric" data-v="eroismo" value="'+(v.eroismo||0)+'"></label>'+
    '<label><span class="lab">Ferite</span><input type="number" inputmode="numeric" data-v="ferite" value="'+(v.ferite||0)+'"></label>'+
    '<label><span class="lab">Drammatiche</span><input type="number" inputmode="numeric" data-v="drammatiche" value="'+(v.drammatiche||0)+'"></label>'+
    '</div>'));
  out+=slab(sec('Vantaggi',listaEditabile('vantaggi',v.vantaggi||[],[['n','Vantaggio'],['c','Costo'],['t','Effetto']],null)));
  out+=slab(sec('Storie',listaEditabile('storie',v.storie||[],[['n','Storia'],['p','Passi'],['r','Ricompensa']],null),false));
  return out;
}

/* ---------------------------------------------------------- Not the End */
function sheetNTE(pg){
  var v=pg.values, out='';
  var pos=[[1,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[1,3]];
  var cells=['','','','','','','','','','','',''];
  out+=slab(sec('Eroe','<label><span class="lab">Una frase che lo descrive</span>'+
    '<input data-v="frase" value="'+esc(v.frase||'')+'" placeholder="Un samurai senza padrone che cerca vendetta"></label>'));

  var hexHtml='<div class="hexgrid">';
  var order=[null,0,null, 1,2,3, 4,5,6, null,7,null];
  order.forEach(function(idx){
    if(idx===null){ hexHtml+='<div></div>'; return }
    var scar=(v.cicatrici||[]).indexOf(idx)>=0;
    hexHtml+='<button class="hex'+(idx===0?' core':'')+(scar?' scar':'')+'" data-hex="'+idx+'">'+
      (esc(v.hex[idx]||'')||'<span class="faint">'+NTE_POSIZIONI[idx]+'</span>')+'</button>';
  });
  hexHtml+='</div>';
  out+=slab(sec('Alveare',hexHtml+
    '<p class="faint" style="margin:9px 0 0">Un archetipo al centro, tre qualità, quattro abilità. '+
    'Tocca un esagono per scriverlo, tienilo premuto per segnarlo come cicatrice.</p>'));

  out+=slab(sec('Sacchetto',
    '<div class="grid g2">'+
    '<label><span class="lab">Tratti messi in gioco</span><input type="number" inputmode="numeric" data-v="tokenPos" value="'+(v.tokenPos||0)+'"></label>'+
    '<label><span class="lab">Difficoltà (token neri)</span><input type="number" inputmode="numeric" data-v="tokenNeg" value="'+(v.tokenNeg||0)+'"></label>'+
    '</div><div class="row" style="margin-top:10px;gap:6px">'+
    [1,2,3,4].map(function(n){return '<button class="mbtn metal grow" data-draw="'+n+'"><span>estrai '+n+'</span></button>'}).join('')+
    '</div><p class="faint" style="margin:9px 0 0">Basta un token bianco per superare la prova. '+
    'Ogni bianco in più aumenta l\u2019effetto, ogni nero porta una complicazione.</p>'));

  out+=slab(sec('Lezioni',listaEditabile('lezioni',v.lezioni||[],[['n','Lezione'],['t','Testo']],null)));
  out+=slab(sec('Sventure',listaEditabile('sventure',v.sventure||[],[['n','Sventura'],['t','Nota']],null),false));
  return out;
}

/* ================================================================= dadi */
function rollDice(expr,scope){
  var e=String(expr||'').trim().toLowerCase();
  e=e.replace(/\{([a-z0-9_]+)\}/gi,function(_,k){var x=(scope||{})[k];return (x==null||x==='')?0:x});
  var adv=/\bvan\b|\bvantaggio\b/.test(e), dis=/\bsvan\b|\bsvantaggio\b/.test(e);
  e=e.replace(/\bsvantaggio\b|\bsvan\b|\bvantaggio\b|\bvan\b/g,'');
  if(adv) e=e.replace(/(^|[^0-9])1?d20/,'$12d20kh1');
  if(dis) e=e.replace(/(^|[^0-9])1?d20/,'$12d20kl1');
  var terms=e.replace(/\s+/g,'').replace(/-/g,'+-').split('+').filter(Boolean);
  var total=0, parts=[], d20=null, n20=0;
  terms.forEach(function(t){
    var sign=1; if(t.charAt(0)==='-'){sign=-1;t=t.slice(1)}
    var m=t.match(/^(\d*)d(\d+)(?:(kh|kl|dh|dl)(\d+))?$/);
    if(m){
      var n=clamp(parseInt(m[1]||'1',10),1,100), faces=clamp(parseInt(m[2],10),2,1000);
      var rolls=[], keep=[];
      for(var i=0;i<n;i++){rolls.push(1+Math.floor(Math.random()*faces));keep.push(true)}
      if(m[3]){
        var k=clamp(parseInt(m[4]||'1',10),0,n);
        var ord=rolls.map(function(v,i){return [v,i]}).sort(function(a,b){return a[0]-b[0]});
        var drop = m[3]==='kh'?ord.slice(0,n-k) : m[3]==='kl'?ord.slice(k)
                 : m[3]==='dl'?ord.slice(0,k) : ord.slice(n-k);
        drop.forEach(function(p){keep[p[1]]=false});
      }
      var sum=0, html=rolls.map(function(v,i){
        if(keep[i]) sum+=v;
        var cls=(!keep[i]?'drop':(v===faces?'max':(v===1?'min':'')));
        return '<span class="die '+cls+'">'+v+'</span>'}).join('');
      if(faces===20){ var kept=rolls.filter(function(_,i){return keep[i]}); d20=kept[0]; n20++ }
      total+=sign*sum;
      parts.push((sign<0?'−':'')+n+'d'+faces+' '+html);
    }else{
      var val=Number(t)||0; total+=sign*val;
      if(val) parts.push('<span class="die">'+(sign<0?'−':'+')+val+'</span>');
    }
  });
  return {total:total,html:parts.join(' '),expr:String(expr),
          crit:n20===1&&d20===20, fumble:n20===1&&d20===1};
}
function showRoll(label,res,extra){
  $$('.toastr').forEach(function(x){x.remove()});
  var e=document.createElement('div');
  e.className='toastr metal';
  e.innerHTML='<div class="in3"><div class="grow"><div class="eyebrow" style="color:var(--m3)">'+esc(label)+
    (res.crit?' · critico':res.fumble?' · fallimento critico':'')+'</div>'+
    '<div class="bk">'+(res.html||'')+'</div>'+(extra||'')+'</div>'+
    '<div class="tot">'+res.total+'</div></div>';
  $('#layers').appendChild(e);
  e.onclick=function(){e.remove()};
  setTimeout(function(){e.remove()},6500);
  if(S.sess){ S.sess.log.unshift({t:nowISO(),txt:label+': '+res.total,d:res.expr}); saveSess();
    if(S.tab==='sessione') render() }
}
function saveSess(){ if(S.sess) DB.writeJSON(P.sess(S.sess.id),S.sess) }
function drawTokens(pos,neg,n){
  var bag=[]; for(var i=0;i<pos;i++) bag.push(1); for(var j=0;j<neg;j++) bag.push(0);
  if(!bag.length) return null;
  var out=[];
  for(var k=0;k<n&&bag.length;k++){
    var i2=Math.floor(Math.random()*bag.length); out.push(bag.splice(i2,1)[0]);
  }
  return out;
}
function pool7(tratto,abil){
  var n=clamp(tratto+abil,1,20), rolls=[];
  for(var i=0;i<n;i++) rolls.push(1+Math.floor(Math.random()*10));
  var sorted=rolls.slice().sort(function(a,b){return b-a});
  var alzate=0, cur=0;
  sorted.forEach(function(v){ cur+=v; if(cur>=10){alzate++;cur=0} });
  return {rolls:rolls,alzate:alzate,resto:cur};
}

/* ============================================================== sessione */
function viewSess(){
  if(!S.sess) return slab('<div class="empty"><span class="g">⚔</span>'+
    'Nessuna sessione aperta.<br>Serve a tenere iniziativa, ferite e cronologia dei tiri.</div>'+
    '<button class="mbtn metal" style="width:100%" data-act="nuovasess"><span>Apri sessione</span></button>');
  var s=S.sess;
  var ord=s.k.slice().sort(function(a,b){return (b.init||0)-(a.init||0)});
  var out=slab('<div class="row"><div class="grow">'+
    '<input data-sesst value="'+esc(s.titolo)+'" style="background:transparent;border:0;padding:0;'+
    'font-family:var(--display);font-size:20px;font-weight:700">'+
    '<div class="faint">'+new Date(s.data).toLocaleDateString('it-IT')+' · round '+s.round+'</div></div>'+
    '<button class="btn sm" data-act="chiudisess">Chiudi</button></div>');
  out+=slab('<div class="row" style="margin-bottom:9px"><div class="eyebrow grow">Iniziativa</div>'+
    '<button class="btn sm" data-act="tiraini">Tira tutti</button>'+
    '<button class="btn sm" data-act="aggcomb">＋</button></div>'+
    (ord.length?ord.map(function(k){
      var act=s.turno===k.id;
      return '<div class="line'+(act?'':'')+'"'+(act?' style="box-shadow:inset 0 0 0 2px var(--m2)"':'')+'>'+
        '<button class="v" data-ini="'+k.id+'">'+(k.init==null?'–':k.init)+'</button>'+
        '<span class="grow">'+esc(k.n)+(k.cond?' <span class="faint">'+esc(k.cond)+'</span>':'')+'</span>'+
        '<button class="btn sm" data-hp="'+k.id+'" data-d="-1">−</button>'+
        '<span style="font-family:var(--mono);font-weight:700;min-width:40px;text-align:center">'+
        (k.pf==null?'–':k.pf)+'</span>'+
        '<button class="btn sm" data-hp="'+k.id+'" data-d="1">＋</button>'+
        '<button class="btn sm danger" data-delk="'+k.id+'">✕</button></div>'
    }).join('')+'<div class="row" style="margin-top:9px">'+
      '<button class="btn grow" data-act="turnoprec">◀</button>'+
      '<button class="mbtn metal grow" data-act="turnosucc"><span>Turno successivo ▶</span></button></div>'
    :'<p class="faint">Nessun combattente.</p>'));
  out+=slab('<div class="eyebrow" style="margin-bottom:8px">Cronologia</div>'+
    (s.log.length?s.log.slice(0,60).map(function(l){
      return '<div style="font-family:var(--mono);font-size:12px;padding:5px 0;border-bottom:1px solid var(--line);color:var(--ink-dim)">'+
        '<span style="color:var(--ink-faint)">'+hhmm(l.t)+'</span> <b style="color:var(--ink);font-weight:400">'+esc(l.txt)+'</b>'+
        (l.d?' <span style="color:var(--ink-faint)">'+esc(l.d)+'</span>':'')+'</div>'}).join('')
     :'<p class="faint">Ogni tiro finisce qui.</p>')+
    '<button class="btn sm" style="margin-top:10px" data-act="esportalog">Esporta cronologia</button>');
  return out;
}

/* ============================================================== manuali */
function viewManuali(){
  var rows=[[],[]];
  S.manuals.forEach(function(m,i){ rows[i%2<1?0:1].push(m) });
  var shelf=function(list){
    return '<div class="plank">'+(list.length?list.map(function(m){
      return '<button class="spine metal" data-man="'+m.id+'" style="height:'+(112+((m.name.length*7)%34))+'px">'+
        '<b style="color:#241B08">'+esc(m.name)+'</b></button>'}).join(''):'')+'</div>';
  };
  var out=slab('<div class="row"><div class="eyebrow grow">Scaffale</div>'+
    '<button class="btn sm" data-act="addpdf">＋ PDF</button></div>'+
    (S.manuals.length?shelf(rows[0])+shelf(rows[1])
      :'<div class="empty"><span class="g">▤</span>Nessun manuale.<br>Carica un PDF: resta nella tua cartella.</div>'));
  if(S.manuals.length) out+=slab('<div class="eyebrow" style="margin-bottom:7px">Manuali</div>'+
    S.manuals.map(function(m){
      return '<div class="line"><span class="grow">'+esc(m.name)+'</span>'+
        '<span class="faint">'+(m.pages||'?')+' pp.</span>'+
        '<button class="btn sm" data-man="'+m.id+'">apri</button>'+
        '<button class="btn sm danger" data-delman="'+m.id+'">✕</button></div>'}).join(''),{plain:true});
  return out;
}
var pdfReady=null;
function loadPdfJs(){
  if(pdfReady) return pdfReady;
  pdfReady=new Promise(function(res,rej){
    if(window.pdfjsLib) return res();
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=function(){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      res();
    };
    s.onerror=function(){ pdfReady=null; rej(new Error('Il lettore PDF non si è caricato. Serve la rete la prima volta.')) };
    document.head.appendChild(s);
  });
  return pdfReady;
}
var RD={pdf:null,man:null,pg:1,cache:{},busy:false,W:0,H:0,PW:0,dpr:1};
function openManual(id){
  var man=null; S.manuals.forEach(function(m){if(m.id===id)man=m});
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
    reader();
  }).catch(function(e){
    m.close();
    modal('<h2 style="font-size:19px">Non si apre</h2><p class="faint" style="margin:9px 0 14px">'+esc(e.message)+'</p>'+
      '<button class="btn" style="width:100%" data-close>Chiudi</button>');
  });
}
function reader(){
  var man=RD.man;
  var m=modal('<div class="row" style="margin-bottom:9px">'+
    '<div class="grow"><b style="font-family:var(--display);font-size:18px">'+esc(man.name)+'</b>'+
    '<div class="faint" id="rlab"></div></div>'+
    '<button class="btn sm" data-close>Chiudi</button></div>'+
    '<div class="bookwrap" id="bw"><canvas id="rcv"></canvas></div>'+
    '<div class="row" style="margin-top:10px">'+
    '<button class="btn" id="rp">‹</button>'+
    '<input type="range" id="rs" min="1" max="'+Math.max(1,RD.pdf.numPages-1)+'" step="2" value="'+RD.pg+'" class="grow">'+
    '<button class="btn" id="rn">›</button></div>'+
    '<div class="row" style="margin-top:9px">'+
    '<button class="btn sm grow" data-sf="ricciolo" aria-pressed="'+(S.cfg.sfoglio==='ricciolo')+'">Ricciolo</button>'+
    '<button class="btn sm grow" data-sf="semplice" aria-pressed="'+(S.cfg.sfoglio==='semplice')+'">Semplice</button></div>',
  function(el,close){
    var bw=$('#bw',el), cv=$('#rcv',el);
    RD.cv=cv; RD.ctx=cv.getContext('2d'); RD.el=el;
    RD.dpr=Math.min(window.devicePixelRatio||1,2);
    function size(){
      var r=bw.getBoundingClientRect();
      RD.W=Math.round(r.width); RD.H=Math.round(r.height); RD.PW=RD.W/2;
      cv.width=Math.round(RD.W*RD.dpr); cv.height=Math.round(RD.H*RD.dpr);
      RD.ctx.setTransform(RD.dpr,0,0,RD.dpr,0,0);
      RD.cache={}; paint(1);
    }
    RD.size=size;
    $('#rn',el).onclick=function(){turnPage(1)};
    $('#rp',el).onclick=function(){turnPage(-1)};
    $('#rs',el).oninput=function(){
      if(RD.busy){this.value=RD.pg;return}
      var v=parseInt(this.value,10); if(v%2===0) v--; RD.pg=Math.max(1,v); paint(1); label();
    };
    $$('[data-sf]',el).forEach(function(b){ b.onclick=function(){
      S.cfg.sfoglio=b.dataset.sf; saveCfgSoon();
      $$('[data-sf]',el).forEach(function(o){o.setAttribute('aria-pressed',o===b)});
    }});
    var drag=null;
    bw.addEventListener('pointerdown',function(e){
      if(S.cfg.sfoglio!=='ricciolo'||RD.busy) return;
      var r=bw.getBoundingClientRect(), x=e.clientX-r.left;
      if(x<RD.W*0.55) return;
      drag={t:1}; bw.setPointerCapture(e.pointerId);
    });
    bw.addEventListener('pointermove',function(e){
      if(!drag) return;
      var r=bw.getBoundingClientRect(), x=e.clientX-r.left;
      drag.t=clamp((x-RD.PW)/RD.PW,0,1); paint(drag.t);
    });
    bw.addEventListener('pointerup',function(){
      if(!drag) return;
      settle(drag.t,drag.t<0.55); drag=null;
    });
    setTimeout(size,60);
    window.addEventListener('resize',size);
    var oldClose=close;
    $$('[data-close]',el).forEach(function(b){ b.onclick=function(){
      window.removeEventListener('resize',size);
      RD.man.lastPage=RD.pg; DB.writeJSON(P.manual(RD.man.id),RD.man);
      oldClose();
    }});
  });
  function label(){ var l=$('#rlab'); if(l) l.textContent='pagine '+RD.pg+'–'+(RD.pg+1)+' di '+RD.pdf.numPages }
  RD.label=label; label();
}
function pageCanvas(n){
  if(n<1||n>RD.pdf.numPages) return null;
  if(RD.cache[n]) return RD.cache[n];
  var c=document.createElement('canvas');
  c.width=Math.max(2,Math.round(RD.PW*RD.dpr)); c.height=Math.max(2,Math.round(RD.H*RD.dpr));
  var x=c.getContext('2d'); x.fillStyle='#EDE4D3'; x.fillRect(0,0,c.width,c.height);
  RD.cache[n]=c;
  RD.pdf.getPage(n).then(function(p){
    var vp=p.getViewport({scale:1});
    var sc=Math.min(c.width/vp.width,c.height/vp.height);
    var v2=p.getViewport({scale:sc});
    var ox=(c.width-v2.width)/2, oy=(c.height-v2.height)/2;
    x.save(); x.translate(ox,oy);
    p.render({canvasContext:x,viewport:v2}).promise.then(function(){ x.restore(); paint(RD.lastT==null?1:RD.lastT) });
  }).catch(function(){});
  return c;
}
function paint(t){
  if(!RD.ctx) return;
  RD.lastT=t;
  if(S.cfg.sfoglio==='semplice') return paintFlat(t);
  var ctx=RD.ctx, W=RD.W, H=RD.H, PW=RD.PW;
  ctx.clearRect(0,0,W,H);
  var L=pageCanvas(RD.pg), Rr=pageCanvas(t<1?RD.pg+3:RD.pg+1);
  if(L) ctx.drawImage(L,0,0,PW,H);
  if(Rr) ctx.drawImage(Rr,PW,0,PW,H);
  if(t>=1) return;
  var front=pageCanvas(RD.pg+1), back=pageCanvas(RD.pg+2);
  if(!front) return;
  var foldX=PW+PW*t, Rrad=Math.max(9,70*(0.35+0.65*t));
  for(var u=0;u<=PW;u+=1){
    var sx=PW-u, th=u/Rrad, x, src, sxs, shade;
    if(th<=Math.PI){
      x=foldX+Rrad*Math.sin(th);
      if(th<=Math.PI/2){ src=front; sxs=sx; shade=0.30*(1-Math.cos(th)) }
      else { src=back||front; sxs=PW-sx; shade=0.16+0.22*(1+Math.cos(th)) }
    }else{ x=foldX-(u-Math.PI*Rrad); src=back||front; sxs=PW-sx; shade=0.14 }
    if(x<-2||x>W+2||!src) continue;
    var wd=Math.max(1,Math.abs(Math.cos(th))+0.6);
    ctx.save(); ctx.beginPath(); ctx.rect(x,0,wd,H); ctx.clip();
    ctx.drawImage(src,Math.round(sxs*RD.dpr),0,Math.max(1,RD.dpr),src.height,x,0,wd,H);
    if(shade>0.005){ ctx.fillStyle='rgba(58,47,34,'+Math.min(.55,shade)+')'; ctx.fillRect(x,0,wd,H) }
    ctx.restore();
  }
}
function paintFlat(t){
  var ctx=RD.ctx, W=RD.W, H=RD.H, PW=RD.PW;
  ctx.clearRect(0,0,W,H);
  var L=pageCanvas(RD.pg), Rr=pageCanvas(t<1?RD.pg+3:RD.pg+1);
  if(L) ctx.drawImage(L,0,0,PW,H);
  if(Rr) ctx.drawImage(Rr,PW,0,PW,H);
  if(t>=1) return;
  var front=pageCanvas(RD.pg+1), back=pageCanvas(RD.pg+2);
  var w=PW*Math.abs(t*2-1);
  var src=t>0.5?front:back;
  if(!src) return;
  var x=t>0.5?PW:PW-w;
  ctx.save(); ctx.globalAlpha=1;
  ctx.drawImage(src,x,0,w,H);
  ctx.fillStyle='rgba(58,47,34,'+(0.20*(1-Math.abs(t*2-1)))+')';
  ctx.fillRect(x,0,w,H); ctx.restore();
}
function settle(from,complete){
  var to=complete?0:1, t0=performance.now(), dur=complete?400:260;
  RD.busy=true;
  (function step(){
    var k=Math.min(1,(performance.now()-t0)/dur), e=1-Math.pow(1-k,3);
    paint(from+(to-from)*e);
    if(k<1) requestAnimationFrame(step);
    else {
      if(complete){ RD.pg=Math.min(RD.pdf.numPages-1,RD.pg+2); }
      RD.busy=false; paint(1);
      var s=$('#rs'); if(s) s.value=RD.pg;
      if(RD.label) RD.label();
    }
  })();
}
function turnPage(dir){
  if(RD.busy) return;
  if(dir>0){ if(RD.pg+2>RD.pdf.numPages) return; settle(1,true) }
  else { RD.pg=Math.max(1,RD.pg-2); paint(1); var s=$('#rs'); if(s) s.value=RD.pg; if(RD.label) RD.label() }
}

/* ================================================================ aspetto */
function viewAspetto(){
  var out=slab('<div class="eyebrow">Materiale dei riquadri</div>'+
    '<div class="row wrap" style="margin-top:8px">'+Object.keys(MATERIALI).map(function(k){
      return '<button class="btn sm" data-set="mat" data-val="'+k+'" aria-pressed="'+(S.cfg.mat===k)+'"'+
        (S.cfg.mat===k?' style="box-shadow:inset 0 0 0 2px var(--m2)"':'')+'>'+MATERIALI[k].n+'</button>'}).join('')+'</div>'+
    '<div class="eyebrow" style="margin-top:13px">Metallo</div>'+
    '<div class="row wrap" style="margin-top:8px">'+Object.keys(METALLI).map(function(k){
      var c=METALLI[k].c;
      return '<button data-set="met" data-val="'+k+'" aria-label="'+METALLI[k].n+'" style="width:38px;height:38px;'+
        'border-radius:50%;background:linear-gradient(128deg,'+c[0]+' 0%,'+c[1]+' 20%,'+c[2]+' 38%,'+c[3]+' 58%,'+c[4]+' 76%,'+c[0]+' 100%);'+
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -1px 0 rgba(0,0,0,.5)'+
        (S.cfg.met===k?',0 0 0 2px var(--ink)':'')+'"></button>'}).join('')+'</div>'+
    slider('polish','Lucidatura',0,100,S.cfg.polish)+
    slider('ring','Cornice',2,10,S.cfg.ring)+
    slider('orn','Intarsi',0,100,S.cfg.orn)+
    slider('texop','Texture',0,100,S.cfg.texop));

  var a=S.texUrl[S.cfg.mat]||[];
  out+=slab('<div class="eyebrow">Texture di '+esc(MATERIALI[S.cfg.mat].n)+'</div>'+
    '<div class="slots3">'+[0,1,2].map(function(i){
      return '<button class="slot" data-tex="'+i+'"'+(a[i]?' style="background-image:url('+a[i]+')"':'')+'>'+
        (a[i]?'<b data-textdel="'+i+'">✕</b>':'vuoto')+'</button>'}).join('')+'</div>'+
    '<p class="faint" style="margin:9px 0 0">Tre immagini per materiale: ogni riquadro ne prende una diversa. '+
    'Vengono ridotte a 1200 px e salvate nella cartella dei dati. Materiali liberi su ambientcg.com o polyhaven.com.</p>');

  out+=slab('<div class="eyebrow">Sfondo</div>'+
    '<div class="row" style="margin-top:8px"><input type="color" data-bgc value="'+esc(S.cfg.bg)+'" style="width:52px;padding:3px">'+
    '<button class="btn sm" data-act="bgimg">Immagine</button>'+
    '<button class="btn sm" data-act="bgclr">Togli</button></div>'+
    '<div class="eyebrow" style="margin-top:13px">Sfogliare i manuali</div>'+
    '<div class="row" style="margin-top:8px">'+
    ['ricciolo:Ricciolo','semplice:Semplice'].map(function(x){var p=x.split(':');
      return '<button class="btn sm grow" data-set="sfoglio" data-val="'+p[0]+'"'+
        (S.cfg.sfoglio===p[0]?' style="box-shadow:inset 0 0 0 2px var(--m2)"':'')+'>'+p[1]+'</button>'}).join('')+'</div>');

  out+=slab('<div class="eyebrow">Profili di personalizzazione</div>'+
    '<div class="row" style="margin-top:8px"><input id="profn" placeholder="Nome del profilo">'+
    '<button class="mbtn metal" data-act="salvaprof"><span>Salva</span></button></div>'+
    (S.cfg.profili.length?S.cfg.profili.map(function(p,i){
      return '<div class="line"><span class="grow">'+esc(p.n)+'</span>'+
        '<button class="btn sm" data-useprof="'+i+'">Usa</button>'+
        '<button class="btn sm danger" data-delprof="'+i+'">✕</button></div>'}).join('')
     :'<p class="faint" style="margin:9px 0 0">Regola materiale e metallo, poi dai un nome alla combinazione.</p>'));

  if(typeof vistaPiattaforma==='function') out+=vistaPiattaforma();
  out+=slab('<div class="eyebrow">Contenuti</div>'+
    '<p class="faint" style="margin:7px 0 10px;line-height:1.55">'+
    (modoStudio()
      ? 'Quello che aggiungi qui — voci di compendio e schede costruite — diventa un pacchetto '+
        'da copiare sul tablet o da pubblicare a un indirizzo.'
      : 'I contenuti preparati sul computer arrivano qui come pacchetto, da file o da un indirizzo.')+'</p>'+
    '<div class="row wrap" style="gap:7px">'+
    (modoStudio()?'<button class="mbtn metal" data-act="esportaPacchetto"><span>Esporta pacchetto</span></button>':'')+
    '<button class="btn" data-act="importaPacchetto">Importa pacchetto</button>'+
    '<button class="btn" data-act="sincro">Sincronizza</button>'+
    '<button class="btn" data-act="schemiUser">Schede costruite</button>'+
    (modoStudio()?'<button class="mbtn metal" data-act="imparaGioco"><span>Impara un gioco da un PDF</span></button>':'')+
    (modoStudio()?'<button class="btn" data-act="iaPannello">Modello locale</button>':'')+
    '</div>'+
    (S.cfg.ultimoPacchetto?'<p class="faint" style="margin:10px 0 0">Ultimo aggiornamento: '+
      esc(S.cfg.ultimoPacchetto.firma)+'</p>':''));
  out+=slab('<div class="eyebrow">Dati</div>'+
    '<p class="faint" style="margin:7px 0 10px">'+
    (DB.store&&DB.store.folder
      ? 'Cartella <b style="color:var(--ink)">'+esc(DB.name)+'</b>. Ogni personaggio è un file leggibile.'
      : (DB.canFolder?'Archivio interno del browser. Scegli una cartella per avere i file veri.'
        :'Questo browser non apre cartelle: i dati restano nell\u2019archivio interno. Esporta ogni tanto.'))+'</p>'+
    '<div class="row wrap"><button class="mbtn metal" data-act="cartella"><span>'+
    (DB.store&&DB.store.folder?'Cambia cartella':'Scegli cartella')+'</span></button>'+
    '<button class="btn" data-act="esporta">Esporta backup</button>'+
    '<button class="btn" data-act="importa">Importa backup</button></div>');
  return out;
}
function slider(key,label,min,max,val){
  return '<div class="row" style="margin-top:11px"><span class="lab" style="width:88px;margin:0">'+label+'</span>'+
    '<input type="range" data-rng="'+key+'" min="'+min+'" max="'+max+'" value="'+val+'" class="grow" style="padding:0;border:0;background:transparent">'+
    '<span class="pill" style="min-width:44px;text-align:center">'+val+'</span></div>';
}

/* ============================================================== ritratto */
function cropPortrait(file,pg){
  var img=new Image(), url=URL.createObjectURL(file);
  img.onload=function(){
    var st={sh:pg.shape||'rect',zoom:1,ox:0,oy:0,base:1};
    var m=modal('<div class="row" style="margin-bottom:6px"><div class="eyebrow grow">Ritaglio</div>'+
      '<button class="btn sm" data-sh="rect">Rettangolo</button>'+
      '<button class="btn sm" data-sh="circle">Cerchio</button></div>'+
      '<div class="stage" id="stg"><canvas id="cc"></canvas></div>'+
      '<div class="row"><span class="lab" style="width:52px;margin:0">Zoom</span>'+
      '<input type="range" id="z" min="100" max="400" value="100" class="grow" style="padding:0;border:0;background:transparent"></div>'+
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-close>Annulla</button>'+
      '<button class="mbtn metal grow" id="okc"><span>Usa</span></button></div>',
    function(el,close){
      var stg=$('#stg',el), cv=$('#cc',el), ctx=cv.getContext('2d');
      var dpr=Math.min(window.devicePixelRatio||1,2.5);
      function box(){ return st.sh==='circle'?{w:250,h:250}:{w:240,h:320} }
      function size(){
        var b=box();
        stg.style.width=b.w+'px'; stg.style.height=b.h+'px';
        stg.style.borderRadius=st.sh==='circle'?'50%':'9px';
        cv.width=b.w*dpr; cv.height=b.h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
        st.base=Math.max(b.w/img.width,b.h/img.height); st.ox=0; st.oy=0;
      }
      function draw(){
        var b=box(), s=st.base*st.zoom, w=img.width*s, h=img.height*s;
        var x=(b.w-w)/2+st.ox, y=(b.h-h)/2+st.oy;
        x=Math.min(0,Math.max(b.w-w,x)); y=Math.min(0,Math.max(b.h-h,y));
        st.ox=x-(b.w-w)/2; st.oy=y-(b.h-h)/2;
        ctx.clearRect(0,0,b.w,b.h); ctx.drawImage(img,x,y,w,h);
      }
      function out(){
        var b=box(), s=st.base*st.zoom, sc=520/b.w;
        var o=document.createElement('canvas');
        o.width=Math.round(b.w*sc); o.height=Math.round(b.h*sc);
        var c2=o.getContext('2d');
        if(st.sh==='circle'){ c2.beginPath(); c2.arc(o.width/2,o.height/2,o.width/2,0,Math.PI*2); c2.clip() }
        var w=img.width*s*sc, h=img.height*s*sc;
        c2.drawImage(img,(o.width-w)/2+st.ox*sc,(o.height-h)/2+st.oy*sc,w,h);
        return o.toDataURL(st.sh==='circle'?'image/png':'image/jpeg',0.86);
      }
      var drag=null;
      stg.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY,ox:st.ox,oy:st.oy};
        stg.setPointerCapture(e.pointerId)});
      stg.addEventListener('pointermove',function(e){ if(!drag)return;
        st.ox=drag.ox+(e.clientX-drag.x); st.oy=drag.oy+(e.clientY-drag.y); draw()});
      stg.addEventListener('pointerup',function(){drag=null});
      $('#z',el).oninput=function(){st.zoom=+this.value/100;draw()};
      $$('[data-sh]',el).forEach(function(b){
        if(b.dataset.sh===st.sh) b.style.boxShadow='inset 0 0 0 2px var(--m2)';
        b.onclick=function(){
          st.sh=b.dataset.sh; st.zoom=1; $('#z',el).value=100;
          $$('[data-sh]',el).forEach(function(o){o.style.boxShadow=o===b?'inset 0 0 0 2px var(--m2)':''});
          size(); draw();
        };
      });
      $('#okc',el).onclick=function(){
        pg.portrait=out(); pg.shape=st.sh;
        URL.revokeObjectURL(url); close();
        savePG(pg).then(render);
      };
      size(); draw();
    });
  };
  img.onerror=function(){ toast('Immagine non leggibile') };
  img.src=url;
}

/* ================================================================ azioni */
var ACT={
  cartella:function(){
    DB.choose().then(function(ok){ if(!ok) return;
      return saveCfg().then(loadAll).then(function(){applyTheme();render();toast('Cartella collegata')});
    }).catch(function(e){ if(e && e.name!=='AbortError') toast('Non riesco ad aprire la cartella') });
  },
  nuovopg:function(){
    modal('<h2 style="font-size:19px">Nuovo personaggio</h2>'+
      '<label style="display:block;margin:12px 0"><span class="lab">Nome</span><input id="nn" placeholder="Come si chiama"></label>'+
      '<label style="display:block;margin-bottom:14px"><span class="lab">Sistema</span><select id="ns">'+
      Object.keys(SISTEMI).map(function(k){return '<option value="'+k+'">'+SISTEMI[k].n+'</option>'}).join('')+
      '</select></label><div class="row"><button class="btn grow" data-close>Annulla</button>'+
      '<button class="mbtn metal grow" id="okn"><span>Crea</span></button></div>',
    function(el,close){
      $('#nn',el).focus();
      $('#okn',el).onclick=function(){
        var pg=nuovoPG($('#ns',el).value,$('#nn',el).value.trim()||'Senza nome');
        savePG(pg).then(function(){ S.pg=pg; S.cfg.lastPg=pg.id; saveCfgSoon();
          close(); S.tab='scheda'; render() });
      };
    });
  },
  ritratto:function(){ pickFile('image/*').then(function(f){ if(f[0]) cropPortrait(f[0],S.pg) }) },
  menupg:function(){
    var pg=S.pg;
    modal('<h2 style="font-size:19px">'+esc(pg.name)+'</h2><div style="margin:12px 0">'+
      '<button class="btn" style="width:100%;margin-bottom:8px" id="dup">Duplica</button>'+
      '<button class="btn" style="width:100%;margin-bottom:8px" id="exp">Esporta scheda</button>'+
      '<button class="btn danger" style="width:100%" id="del">Elimina</button></div>'+
      '<button class="btn" style="width:100%" data-close>Chiudi</button>',
    function(el,close){
      $('#dup',el).onclick=function(){
        var n=JSON.parse(JSON.stringify(pg)); n.id=uid('pg'); n.name=pg.name+' (copia)';
        savePG(n).then(function(){close();render();toast('Duplicata')});
      };
      $('#exp',el).onclick=function(){
        download(pg.name.replace(/\W+/g,'_')+'.json',new Blob([JSON.stringify(pg,null,2)],{type:'application/json'}));
        close();
      };
      $('#del',el).onclick=function(){
        close();
        ask('Elimina personaggio','<b>'+esc(pg.name)+'</b> viene cancellato dalla cartella.','Elimina').then(function(y){
          if(!y) return;
          DB.remove(P.pg(pg.id)).then(function(){
            S.pgs=S.pgs.filter(function(x){return x.id!==pg.id});
            S.pg=null; S.tab='personaggi'; render();
          });
        });
      };
    });
  },
  dadolibero:function(){
    modal('<h2 style="font-size:19px">Formula</h2>'+
      '<p class="faint" style="margin:8px 0">Esempi: 2d6+3 · 4d6dl1 · 1d20 van · 1d10+1d8</p>'+
      '<input id="df" placeholder="1d20+5" style="margin-bottom:12px">'+
      '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
      '<button class="mbtn metal grow" id="okd"><span>Tira</span></button></div>',
    function(el,close){
      $('#df',el).focus();
      function go(){ var v=$('#df',el).value.trim(); if(!v) return; showRoll(v,rollDice(v)); close() }
      $('#okd',el).onclick=go;
      $('#df',el).onkeydown=function(e){ if(e.key==='Enter') go() };
    });
  },
  pool7:function(){
    var v=S.pg.values;
    modal('<h2 style="font-size:19px">Comporre un tiro</h2>'+
      '<div class="grid g2" style="margin:12px 0">'+
      '<label><span class="lab">Tratto</span><select id="t7">'+S7_TRATTI.map(function(t){
        return '<option value="'+t[0]+'">'+t[1]+' ('+((v.tratti||{})[t[0]]||0)+')</option>'}).join('')+'</select></label>'+
      '<label><span class="lab">Abilità</span><select id="a7">'+S7_ABIL.map(function(a){
        return '<option value="'+a[0]+'">'+a[1]+' ('+((v.abil||{})[a[0]]||0)+')</option>'}).join('')+'</select></label>'+
      '</div><div class="row"><button class="btn grow" data-close>Chiudi</button>'+
      '<button class="mbtn metal grow" id="ok7"><span>Tira</span></button></div>',
    function(el,close){
      $('#ok7',el).onclick=function(){
        var t=$('#t7',el).value, a=$('#a7',el).value;
        var r=pool7((v.tratti||{})[t]||0,(v.abil||{})[a]||0);
        close();
        showRoll('Tiro di '+t+' e '+a,
          {total:r.alzate,html:r.rolls.map(function(x){return '<span class="die">'+x+'</span>'}).join(''),expr:r.rolls.length+'d10'},
          '<div style="margin-top:4px;color:var(--m3)">alzate · resto '+r.resto+'</div>');
      };
    });
  },
  nuovasess:function(){
    if(S.sess){ S.sess.aperta=false; saveSess() }
    S.sess={id:uid('ses'),titolo:'Sessione del '+new Date().toLocaleDateString('it-IT'),
      data:nowISO(),aperta:true,round:1,turno:null,k:[],log:[]};
    saveSess(); render();
  },
  chiudisess:function(){ if(S.sess){S.sess.aperta=false;saveSess()} S.sess=null; render() },
  aggcomb:function(){
    modal('<h2 style="font-size:19px">Aggiungi</h2>'+
      '<div class="row wrap" style="margin:11px 0">'+S.pgs.map(function(p){
        return '<button class="btn sm" data-addpg="'+p.id+'">'+esc(p.name)+'</button>'}).join('')+'</div><hr class="sep">'+
      '<div class="grid g2" style="margin-bottom:11px">'+
      '<label><span class="lab">Nome</span><input id="kn" placeholder="Goblin"></label>'+
      '<label><span class="lab">Quanti</span><input id="kq" type="number" value="1"></label>'+
      '<label><span class="lab">Punti ferita</span><input id="kh" type="number"></label>'+
      '<label><span class="lab">Bonus iniziativa</span><input id="kb" type="number" value="0"></label>'+
      '<label style="grid-column:1/-1"><span class="lab">Da che parte sta</span><select id="kl">'+
      '<option value="nemico">Avversario</option><option value="eroe">Eroe o alleato</option></select></label></div>'+
      '<div class="row"><button class="btn grow" data-close>Chiudi</button>'+
      '<button class="mbtn metal grow" id="okk"><span>Aggiungi</span></button></div>',
    function(el,close){
      $$('[data-addpg]',el).forEach(function(b){ b.onclick=function(){
        DB.readJSON(P.pg(b.dataset.addpg)).then(function(pg){
          var pf=null,ini=0;
          if(SISTEMI[pg.sys].fam==='dnd'){ var A=autoDnD(pg); pf=pg.values.pf.cur==null?A.pfMax:pg.values.pf.cur; ini=A.iniz }
          var pfmax=null;
          if(SISTEMI[pg.sys].fam==='fu'){ var F=autoFU(pg); pfmax=F.pv;
            pf=pg.values.pvCur==null?F.pv:pg.values.pvCur }
          if(SISTEMI[pg.sys].fam==='dnd'){ pfmax=autoDnD(pg).pfMax; if(pf==null) pf=pfmax }
          S.sess.k.push({id:uid('k'),n:pg.name,pf:pf,pfmax:pfmax,lato:'eroe',
            stati:[],agito:false,ini:ini,init:null});
          saveSess(); close(); render();
        });
      }});
      $('#okk',el).onclick=function(){
        var n=$('#kn',el).value.trim()||'Nemico', q=clamp(Number($('#kq',el).value||1),1,30);
        var lato=$('#kl',el)?$('#kl',el).value:'nemico';
        var pfIn=$('#kh',el).value===''?null:Number($('#kh',el).value);
        for(var i=0;i<q;i++) S.sess.k.push({id:uid('k'),n:q>1?n+' '+(i+1):n,
          pf:pfIn,pfmax:pfIn,lato:lato,stati:[],agito:false,
          ini:Number($('#kb',el).value||0),init:null});
        saveSess(); close(); render();
      };
    });
  },
  tiraini:function(){
    S.sess.k.forEach(function(k){ k.init=rollDice('1d20+'+(k.ini||0)).total });
    var first=S.sess.k.slice().sort(function(a,b){return b.init-a.init})[0];
    S.sess.turno=first?first.id:null; S.sess.round=1;
    S.sess.log.unshift({t:nowISO(),txt:'Iniziativa tirata'});
    saveSess(); render();
  },
  turnosucc:function(){ stepTurno(1) }, turnoprec:function(){ stepTurno(-1) },
  esportalog:function(){
    var s=S.sess;
    var txt='# '+s.titolo+'\n'+new Date(s.data).toLocaleString('it-IT')+'\n\n'+
      s.log.slice().reverse().map(function(l){return '- '+hhmm(l.t)+' '+l.txt+(l.d?' ('+l.d+')':'')}).join('\n');
    download(s.titolo.replace(/\W+/g,'_')+'.md',new Blob([txt],{type:'text/markdown'}));
  },
  addpdf:function(){
    pickFile('application/pdf').then(function(fs){
      if(!fs[0]) return;
      var f=fs[0], id=uid('man');
      var m=modal('<h2 style="font-size:19px">Carico il manuale</h2>'+
        '<p class="faint" style="margin:9px 0"><span class="busy"></span> '+esc(f.name)+'</p>');
      DB.writeBlob(P.pdf(id),f).then(function(){ return loadPdfJs() })
      .then(function(){ return f.arrayBuffer() })
      .then(function(buf){ return window.pdfjsLib.getDocument({data:buf}).promise })
      .then(function(pdf){
        var rec={id:id,name:f.name.replace(/\.pdf$/i,''),pages:pdf.numPages,added:nowISO(),lastPage:1};
        return DB.writeJSON(P.manual(id),rec).then(function(){ S.manuals.push(rec) });
      }).then(function(){ m.close(); render(); toast('Manuale aggiunto') })
      .catch(function(e){
        var rec={id:id,name:f.name.replace(/\.pdf$/i,''),pages:null,added:nowISO(),lastPage:1};
        DB.writeJSON(P.manual(id),rec).then(function(){ S.manuals.push(rec); m.close(); render();
          toast('Salvato, ma il lettore non si è caricato') });
      });
    });
  },
  bgimg:function(){
    pickFile('image/*').then(function(fs){ if(!fs[0]) return;
      shrink(fs[0],1800,0.84).then(function(b){
        return DB.writeBlob(P.bgimg,b).then(function(){
          if(S.bgUrl) URL.revokeObjectURL(S.bgUrl);
          S.bgUrl=URL.createObjectURL(b); S.cfg.hasBg=true; saveCfg(); applyTheme();
        });
      });
    });
  },
  bgclr:function(){ S.bgUrl=''; S.cfg.hasBg=false; DB.remove(P.bgimg); saveCfg(); applyTheme() },
  salvaprof:function(){
    var n=$('#profn').value.trim(); if(!n){ $('#profn').focus(); return }
    var keep={}; ['mat','met','polish','ring','orn','texop','bg'].forEach(function(k){keep[k]=S.cfg[k]});
    S.cfg.profili.push({n:n,s:keep}); saveCfg(); render(); toast('Profilo salvato');
  },
  esporta:function(){
    var pack={v:1,quando:nowISO(),cfg:S.cfg,pgs:[],manuali:S.manuals};
    Promise.all(S.pgs.map(function(p){return DB.readJSON(P.pg(p.id))})).then(function(all){
      pack.pgs=all.filter(Boolean);
      download('tavolo-'+new Date().toISOString().slice(0,10)+'.json',
        new Blob([JSON.stringify(pack)],{type:'application/json'}));
    });
  },
  importa:function(){
    pickFile('application/json').then(function(fs){
      if(!fs[0]) return;
      ask('Importa backup','Le schede con lo stesso identificativo vengono sovrascritte.','Importa').then(function(y){
        if(!y) return;
        fs[0].text().then(function(t){
          var pack=JSON.parse(t);
          var jobs=(pack.pgs||[]).map(function(p){return DB.writeJSON(P.pg(p.id),p)});
          if(pack.cfg) { S.cfg=pack.cfg; jobs.push(saveCfg()) }
          return Promise.all(jobs);
        }).then(loadAll).then(function(){applyTheme();render();toast('Importato')})
        .catch(function(){toast('File non valido')});
      });
    });
  }
};
function stepTurno(dir){
  var s=S.sess, ord=s.k.slice().sort(function(a,b){return (b.init||0)-(a.init||0)});
  if(!ord.length) return;
  var i=-1; ord.forEach(function(k,n){ if(k.id===s.turno) i=n });
  i = i<0 ? 0 : i+dir;
  if(i>=ord.length){ i=0; s.round++ }
  if(i<0){ i=ord.length-1; s.round=Math.max(1,s.round-1) }
  s.turno=ord[i].id;
  s.log.unshift({t:nowISO(),txt:'Round '+s.round+' · tocca a '+ord[i].n});
  saveSess(); render();
}

/* ============================================================== interazioni */
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-tab],[data-tabgo],[data-open],[data-lay],[data-act],[data-roll],[data-quick],'+
    '[data-abil],[data-slot],[data-pf],[data-fu],[data-fupv],[data-fupm],[data-status],[data-hex],[data-draw],'+
    '[data-tratto],[data-abils7],[data-addrow],[data-delrow],[data-rollrow],[data-det],[data-set],[data-tex],'+
    '[data-textdel],[data-useprof],[data-delprof],[data-man],[data-delman],[data-hp],[data-ini],[data-delk],[data-addpg]');
  if(!t) return;
  var d=t.dataset, pg=S.pg, v=pg?pg.values:null;

  if(d.tab){ S.tab=d.tab; renderFromTop(); return }
  if(d.tabgo){ S.tab=d.tabgo; renderFromTop(); return }
  if(d.lay){ S.cfg.layout=d.lay; saveCfgSoon(); render(); return }
  if(d.open){
    DB.readJSON(P.pg(d.open)).then(function(c){
      if(!c) return toast('Scheda non trovata');
      S.pg=c; S.cfg.lastPg=c.id; saveCfgSoon(); S.tab='scheda'; renderFromTop();
    });
    return;
  }
  if(d.roll!==undefined){ showRoll(d.rl||'Tiro',rollDice(d.roll)); return }
  if(d.quick!==undefined){ showRoll(d.quick,rollDice(d.quick)); return }
  if(d.det){
    var el=document.getElementById(d.det);
    if(el) el.classList.toggle('open');
    return;
  }
  if(d.abil){ v.abil=v.abil||{}; v.abil[d.abil]=((v.abil[d.abil]||0)+1)%3; savePGSoon(); render(); return }
  if(d.slot){
    v.slotUsati=v.slotUsati||{};
    var cur=v.slotUsati[d.slot]||0, n=Number(d.n);
    v.slotUsati[d.slot]= cur===n ? n-1 : n;
    savePGSoon(); render(); return;
  }
  if(d.pf){ v.pf.cur=Number(v.pf.cur||0)+Number(d.pf); savePGSoon(); render(); return }
  if(d.fu){ v[d.fu]=Number(d.t); savePGSoon(); render(); return }
  if(d.fupv){ v.pvCur=Number(v.pvCur||0)+Number(d.fupv); savePGSoon(); render(); return }
  if(d.fupm){ v.pmCur=Number(v.pmCur||0)+Number(d.fupm); savePGSoon(); render(); return }
  if(d.status){ v.status=v.status||{}; v.status[d.status]=!v.status[d.status]; savePGSoon(); render(); return }
  if(d.hex){
    var i=Number(d.hex);
    modal('<h2 style="font-size:19px">'+NTE_POSIZIONI[i]+'</h2>'+
      '<input id="hx" value="'+esc(v.hex[i]||'')+'" style="margin:12px 0" placeholder="Scrivi il tratto">'+
      '<label class="row" style="margin-bottom:12px"><input type="checkbox" id="sc" style="width:20px;height:20px" '+
      ((v.cicatrici||[]).indexOf(i)>=0?'checked':'')+'><span class="grow">È una cicatrice</span></label>'+
      '<div class="row"><button class="btn grow" data-close>Annulla</button>'+
      '<button class="mbtn metal grow" id="okh"><span>Salva</span></button></div>',
    function(el2,close){
      $('#hx',el2).focus();
      $('#okh',el2).onclick=function(){
        v.hex[i]=$('#hx',el2).value;
        v.cicatrici=(v.cicatrici||[]).filter(function(x){return x!==i});
        if($('#sc',el2).checked) v.cicatrici.push(i);
        savePGSoon(); close(); render();
      };
    });
    return;
  }
  if(d.draw){
    var res=drawTokens(Number(v.tokenPos||0),Number(v.tokenNeg||0),Number(d.draw));
    if(!res) return toast('Il sacchetto è vuoto');
    var bianchi=res.filter(function(x){return x===1}).length;
    showRoll('Estrazione',{total:bianchi,expr:res.length+' token',
      html:res.map(function(x){return '<span class="die '+(x?'max':'min')+'">'+(x?'○':'●')+'</span>'}).join('')},
      '<div style="margin-top:4px;color:'+(bianchi?'var(--m3)':'#E38699')+'">'+
      (bianchi?'riesci · '+(res.length-bianchi)+' complicazioni':'fallisci')+'</div>');
    return;
  }
  if(d.tratto){ v.tratti=v.tratti||{};
    v.tratti[d.tratto]= v.tratti[d.tratto]===Number(d.n)?Number(d.n)-1:Number(d.n); savePGSoon(); render(); return }
  if(d.abils7){ v.abil=v.abil||{};
    v.abil[d.abils7]= v.abil[d.abils7]===Number(d.n)?Number(d.n)-1:Number(d.n); savePGSoon(); render(); return }
  if(d.addrow){ v[d.addrow]=(v[d.addrow]||[]).concat([{}]); savePGSoon(); render(); return }
  if(d.delrow){ v[d.delrow].splice(Number(d.i),1); savePGSoon(); render(); return }
  if(d.rollrow){
    var row=(v[d.rollrow]||[])[Number(d.i)]||{};
    var expr=d.tpl.replace(/\{(\w+)\}/g,function(_,k){return row[k]||0});
    showRoll(row.nome||'Tiro',rollDice(expr)); return;
  }
  if(d.set){ S.cfg[d.set]=isNaN(d.val)?d.val:d.val; saveCfgSoon(); applyTheme(); render(); return }
  if(d.textdel!==undefined){
    e.stopPropagation();
    DB.remove(P.tex(S.cfg.mat,Number(d.textdel))).then(loadTextures).then(function(){applyTheme();render()});
    return;
  }
  if(d.tex!==undefined){
    pickFile('image/*').then(function(fs){ if(!fs[0]) return;
      shrink(fs[0],1200,0.82).then(function(b){
        return DB.writeBlob(P.tex(S.cfg.mat,Number(d.tex)),b);
      }).then(loadTextures).then(function(){applyTheme();render();toast('Texture salvata')})
      .catch(function(){toast('Immagine non valida')});
    });
    return;
  }
  if(d.useprof!==undefined){
    var p=S.cfg.profili[Number(d.useprof)];
    Object.keys(p.s).forEach(function(k){S.cfg[k]=p.s[k]});
    saveCfg(); applyTheme(); render(); return;
  }
  if(d.delprof!==undefined){ S.cfg.profili.splice(Number(d.delprof),1); saveCfg(); render(); return }
  if(d.man){ openManual(d.man); return }
  if(d.delman){
    ask('Elimina manuale','Il PDF viene rimosso dalla cartella dell\u2019app.','Elimina').then(function(y){
      if(!y) return;
      Promise.all([DB.remove(P.manual(d.delman)),DB.remove(P.pdf(d.delman))]).then(function(){
        S.manuals=S.manuals.filter(function(m){return m.id!==d.delman}); render();
      });
    });
    return;
  }
  if(d.hp){
    S.sess.k.forEach(function(k){ if(k.id===d.hp){
      k.pf=Number(k.pf||0)+Number(d.d);
      S.sess.log.unshift({t:nowISO(),txt:k.n+': '+(d.d>0?'+':'')+d.d+' PF → '+k.pf});
    }});
    saveSess(); render(); return;
  }
  if(d.ini){
    S.sess.k.forEach(function(k){ if(k.id===d.ini){
      var r=rollDice('1d20+'+(k.ini||0)); k.init=r.total;
      S.sess.log.unshift({t:nowISO(),txt:'Iniziativa '+k.n+': '+r.total});
    }});
    saveSess(); render(); return;
  }
  if(d.delk){ S.sess.k=S.sess.k.filter(function(k){return k.id!==d.delk}); saveSess(); render(); return }
  if(d.act && ACT[d.act]) ACT[d.act](t);
},false);

document.addEventListener('input',function(e){
  var el=e.target, d=el.dataset, pg=S.pg;
  if(d.rng){ S.cfg[d.rng]=Number(el.value); applyTheme();
    var p=el.parentNode.querySelector('.pill'); if(p) p.textContent=el.value;
    saveCfgSoon(); return }
  if(d.bgc!==undefined){ S.cfg.bg=el.value; applyTheme(); saveCfgSoon(); return }
  if(d.sesst!==undefined && S.sess){ S.sess.titolo=el.value; saveSess(); return }
  if(!pg) return;
  var v=pg.values;
  if(d.name!==undefined){ pg.name=el.value; savePGSoon(); return }
  if(d.notes!==undefined){ pg.notes=el.value; savePGSoon(); return }
  if(d.v!==undefined){
    v[d.v]= el.type==='number' ? (el.value===''?'':Number(el.value)) : el.value;
    if(d.v==='classe') v.sotto='';
    savePGSoon();
    if(['classe','liv','sotto','forza','des','cos','int','sag','car','destrezza','intuito','vigore','volonta',
        'pvExtra','pmExtra','piExtra'].indexOf(d.v)>=0){ clearTimeout(el._r);
      el._r=setTimeout(function(){ render() },520) }
    return;
  }
  if(d.v2!==undefined){
    var parts=d.v2.split('.'); v[parts[0]]=v[parts[0]]||{}; v[parts[0]][parts[1]]=el.value; savePGSoon(); return;
  }
  if(d.cell!==undefined){
    var arr=v[d.cell]||[]; arr[Number(d.i)]=arr[Number(d.i)]||{};
    arr[Number(d.i)][d.c]=el.value; v[d.cell]=arr; savePGSoon(); return;
  }
  if(d.pfcur!==undefined){ v.pf.cur=Number(el.value||0); savePGSoon(); return }
  if(d.fucur!==undefined){ v[d.fucur]=Number(el.value||0); savePGSoon(); return }
  if(d.trc!==undefined||d.trm!==undefined){
    var id2=d.trc||d.trm, t2=v[id2]||{cur:0,max:0};
    if(d.trc!==undefined) t2.cur=Number(el.value||0); else t2.max=Number(el.value||0);
    v[id2]=t2; savePGSoon(); return;
  }
  if(d.forzastudio!==undefined){ S.cfg.forzaStudio=el.checked; saveCfg(); render(); return }
},false);

/* -------------------------------------------------------------- avvio */
$('#btnDice').onclick=function(){ ACT.dadolibero() };
$('#btnFolder').onclick=function(){
  if(DB.pending){ DB.resume().then(function(ok){
    if(ok) return loadAll().then(function(){applyTheme();render();toast('Cartella ricollegata')});
    ACT.cartella();
  }); return }
  ACT.cartella();
};
document.addEventListener('keydown',function(e){
  if(e.target.matches&&e.target.matches('input,textarea,select')) return;
  if(e.key==='Escape'){ $$('.scrim,.toastr').forEach(function(x){x.remove()}) }
  if(e.key==='ArrowRight'&&RD.pdf&&$('#bw')) turnPage(1);
  if(e.key==='ArrowLeft'&&RD.pdf&&$('#bw')) turnPage(-1);
});
function spiegaCartella(){
  var ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  modal('<h2 style="font-size:19px">Cartella non disponibile</h2>'+
    '<p class="faint" style="margin:9px 0;line-height:1.6">'+
    (ios? 'Safari non permette a nessun sito di scrivere in una cartella del dispositivo: '+
          'la funzione esiste solo in Chrome ed Edge su computer. Non è un limite dell\u2019app.'
        : 'Questo browser non supporta la scelta di una cartella. Chrome ed Edge su computer sì.')+
    '</p><p class="faint" style="margin:0 0 12px;line-height:1.6">'+
    'I tuoi dati sono comunque salvati e restano fra un\u2019apertura e l\u2019altra. '+
    'Per portarli via o metterli al sicuro usa <b style="color:var(--ink)">Esporta backup</b>: '+
    'ottieni un file che puoi salvare in File, su iCloud o mandarti via mail.</p>'+
    (ios?'<p class="faint" style="margin:0 0 14px;line-height:1.6">'+
      'Consiglio: aggiungi l\u2019app alla schermata Home. Le app aggiunte alla Home hanno '+
      'archiviazione più stabile di una scheda del browser.</p>':'')+
    '<div class="row"><button class="btn grow" data-close>Ho capito</button>'+
    '<button class="mbtn metal grow" data-act="esporta"><span>Esporta ora</span></button></div>');
}
function chiediPersistenza(){
  if(navigator.storage&&navigator.storage.persist){
    navigator.storage.persisted().then(function(ok){
      if(!ok) navigator.storage.persist().catch(function(){});
    }).catch(function(){});
  }
}
(function boot(){
  chiediPersistenza();
  DB.init().then(loadAll).then(function(){
    if(S.cfg.lastPg) return DB.readJSON(P.pg(S.cfg.lastPg)).then(function(c){ if(c) S.pg=c });
  }).then(function(){
    return DB.list('sessioni').then(function(ps){
      return Promise.all(ps.map(function(p){return DB.readJSON(p)}));
    }).then(function(all){
      var open=all.filter(Boolean).filter(function(s){return s.aperta});
      open.sort(function(a,b){return String(b.data).localeCompare(String(a.data))});
      S.sess=open[0]||null;
    }).catch(function(){});
  }).then(function(){
    applyTheme();
    S.tab=S.pg?'scheda':'personaggi';
    render();
    if(DB.pending) toast('Tocca ❖ per ricollegare la cartella');
  }).catch(function(err){
    $('#view').innerHTML='<div class="slab metal"><div class="face"><div class="pad">'+
      '<h2>Avvio non riuscito</h2><p class="faint">'+esc(err.message)+'</p></div></div></div>';
  });
})();
