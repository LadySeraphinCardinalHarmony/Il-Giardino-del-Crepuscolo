/* Fabula Ultima — dati strutturali. Le regole di gioco (formule, taglie di
   dado, stati) sono meccaniche; i testi delle Abilità stanno nel manuale e
   li inserisci tu una volta, come per le sottoclassi di D&D.
   Fabula Ultima è di Emanuele Galletto, Need Games e Rooster Games. */
var FU_CLASSI_BASE=[
 ['Arcanista','Evochi avatar di antiche entità.',5,0,0],
 ['Artefice','Crei invenzioni e ampli l\u2019inventario.',0,0,2],
 ['Canaglia','Sfrutti ogni occasione e rubi.',0,0,0],
 ['Chimerista','Apprendi incantesimi dalle creature.',0,5,0],
 ['Elementalista','Controlli il potere degli elementi.',0,5,0],
 ['Entropista','Incanali l\u2019energia oscura del Cosmo.',0,5,0],
 ['Furia','Provochi i nemici e colpisci più duro se ferito.',5,0,0],
 ['Guardiano','Proteggi gli alleati e vesti armature pesanti.',5,0,0],
 ['Lama Oscura','Paghi con la vita per infliggere più danni.',5,0,0],
 ['Maestro d\u2019Armi','Armi da mischia e armature marziali.',5,0,0],
 ['Oratore','Convinci, incoraggi e leghi gli animi.',0,5,0],
 ['Sapiente','Studi, ricordi e sveli i punti deboli.',0,5,0],
 ['Spiritista','Magia di guarigione e di spirito.',0,5,0],
 ['Tiratore','Armi a distanza e colpi mirati.',5,0,0],
 ['Viandante','Viaggi, compagni fedeli e risorse.',0,0,2]
];
/* [nome, caratteristica ridotta, seconda caratteristica ridotta] */
var FU_STATI=[
 ['Lento','destrezza',null],
 ['Confuso','intuito',null],
 ['Debole','vigore',null],
 ['Scosso','volonta',null],
 ['Furente','destrezza','intuito'],
 ['Avvelenato','vigore','volonta']
];
var FU_CARAT=[['destrezza','Destrezza','DES'],['intuito','Intuito','INS'],
              ['vigore','Vigore','VIG'],['volonta','Volontà','VOL']];
var FU_EMOZIONI=[['Ammirazione','Inferiorità'],['Lealtà','Sfiducia'],['Affetto','Odio']];
var FU_TAGLIE=[6,8,10,12];
var FU_AFFINITA=['assorbimento','immunità','resistenza','vulnerabilità'];
var FU_ELEMENTI=['fisico','aria','fulmine','fuoco','ghiaccio','luce','ombra','terra','veleno'];
