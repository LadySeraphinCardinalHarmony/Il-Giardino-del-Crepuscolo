/* Le sei classi mancanti. Privilegi dal System Reference Document di
   Wizards of the Coast, licenza Creative Commons Attribuzione 4.0.
   Vengono unite a quelle già presenti in app.js. */
var CLASSI_EXTRA={
 druido:{n:'Druido',dv:8,inc:'pieno',carat:'sag',ts:['int','sag'],abil:2,
  arm:'Armature leggere e medie non metalliche, scudi, randelli, pugnali, giavellotti, bastoni, falcetti',
  f:[
   ['Druidico',1,'both','Il linguaggio segreto dei druidi: lasci messaggi nascosti che solo chi lo conosce individua.'],
   ['Forma selvatica',2,'both','Due volte per riposo breve ti trasformi in una bestia che hai già visto, con grado di sfida e capacità di movimento limitati dal livello.'],
   ['Circolo druidico',2,'both','La sottoclasse: circolo della terra, della luna e gli altri.'],
   ['Corpo senza tempo',18,'both','Il tuo corpo invecchia molto più lentamente: per ogni dieci anni ne passa uno.'],
   ['Incantesimi delle bestie',18,'both','Puoi lanciare molti dei tuoi incantesimi anche mentre sei in forma selvatica.'],
   ['Arcidruido',20,'both','Usi la Forma selvatica quante volte vuoi e ignori le componenti verbali e somatiche dei tuoi incantesimi.']
  ]},
 monaco:{n:'Monaco',dv:8,inc:'nessuno',carat:'des',ts:['forza','des'],abil:2,
  arm:'Armi semplici, spade corte, uno strumento da artigiano o musicale',
  f:[
   ['Difesa senza armatura',1,'both','Senza armatura né scudo la tua Classe Armatura è 10 più il modificatore di Destrezza più quello di Saggezza.'],
   ['Arti marziali',1,'both','Usi la Destrezza per colpi senza armi e armi da monaco, i danni seguono un dado che cresce col livello, e con un\u2019azione bonus attacchi ancora.'],
   ['Ki',2,'both','Punti ki pari al tuo livello: Raffica di colpi, Difesa paziente e Passo del vento. Tornano con il riposo breve.'],
   ['Movimento senza armatura',2,'both','La velocità aumenta di 3 m senza armatura, e cresce ancora ai livelli successivi.'],
   ['Tradizione monastica',3,'both','La sottoclasse: via della mano aperta, dell\u2019ombra, dei quattro elementi.'],
   ['Deviare i proiettili',3,'both','Come reazione riduci i danni di un attacco a distanza di 1d10 più destrezza e livello; se li azzeri, rilanci il proiettile.'],
   ['Caduta lenta',4,'both','Come reazione riduci i danni da caduta di cinque volte il tuo livello.'],
   ['Attacco extra',5,'both','Quando esegui l\u2019azione di attacco, attacchi due volte.'],
   ['Colpo stordente',5,'both','Spendendo 1 punto ki, chi colpisci resta stordito fino al tuo turno successivo se fallisce un tiro salvezza su Costituzione.'],
   ['Purezza del corpo',10,'both','Immune a malattie e veleni.'],
   ['Palmo tremante',17,'both','Spendendo 3 punti ki imponi vibrazioni letali: puoi scatenarle entro alcuni giorni per infliggere 10d10 danni necrotici.']
  ]},
 paladino:{n:'Paladino',dv:10,inc:'mezzo',carat:'car',ts:['sag','car'],abil:2,
  arm:'Tutte le armature, scudi, tutte le armi',
  f:[
   ['Percezione del divino',1,'both','Rilevi celestiali, immondi e non morti entro 18 m, e i luoghi o oggetti consacrati o profanati.'],
   ['Imposizione delle mani',1,'both','Un serbatoio di punti ferita pari a cinque volte il tuo livello, da distribuire col tocco. Spendendone cinque curi una malattia o un veleno.'],
   ['Stile di combattimento',2,'both','Difesa, duello, protezione o armi grandi.'],
   ['Punizione divina',2,'both','Quando colpisci in mischia, spendi uno slot per infliggere 2d8 danni radiosi extra, più 1d8 per ogni livello di slot oltre il primo.'],
   ['Salute divina',3,'both','Sei immune alle malattie.'],
   ['Giuramento sacro',3,'both','La sottoclasse: devozione, antichi, vendetta. Concede incantesimi e usi di Incanalare divinità.'],
   ['Attacco extra',5,'both','Quando esegui l\u2019azione di attacco, attacchi due volte.'],
   ['Aura di protezione',6,'both','Tu e gli alleati entro 3 m aggiungete il tuo modificatore di Carisma a tutti i tiri salvezza.'],
   ['Aura di coraggio',10,'both','Tu e gli alleati entro 3 m non potete essere spaventati.'],
   ['Colpo divino migliorato',11,'both','Ogni tuo attacco in mischia infligge 1d8 danni radiosi extra.']
  ]},
 ranger:{n:'Ranger',dv:10,inc:'mezzo',carat:'sag',ts:['forza','des'],abil:3,
  arm:'Armature leggere e medie, scudi, armi semplici e da guerra',
  f:[
   ['Nemico prescelto',1,'2014','Vantaggio alle prove di Sopravvivenza per seguire una categoria di creature e a quelle di Intelligenza per ricordarne le abitudini.'],
   ['Esploratore esperto',1,'2014','Il terreno difficile non ti rallenta nel tuo ambiente prescelto e il gruppo si perde solo per magia.'],
   ['Cacciatore esperto',1,'2024','Un incantesimo sempre preparato, competenza in un\u2019abilità aggiuntiva e vantaggio alle prove per inseguire.'],
   ['Stile di combattimento',2,'both','Arciere, difesa, duello o combattere con due armi.'],
   ['Incantesimi',2,'both','Magia da mezzo incantatore basata sulla Saggezza: gli slot arrivano più lentamente di quelli di un mago.'],
   ['Archetipo del ranger',3,'both','La sottoclasse: cacciatore, signore delle bestie e le altre.'],
   ['Consapevolezza primordiale',3,'both','Spendendo uno slot percepisci la presenza di alcuni tipi di creature entro 1,5 km.'],
   ['Attacco extra',5,'both','Quando esegui l\u2019azione di attacco, attacchi due volte.'],
   ['Terra natia',8,'both','Il terreno difficile non ti rallenta più nemmeno fuori dai tuoi ambienti prescelti.'],
   ['Scomparire',14,'both','Puoi Nasconderti con un\u2019azione bonus e non puoi essere rintracciato per via magica.'],
   ['Sensi ferini',18,'both','Percepisci con esattezza la posizione delle creature invisibili entro 9 m.']
  ]},
 stregone:{n:'Stregone',dv:6,inc:'pieno',carat:'car',ts:['cos','car'],abil:2,
  arm:'Pugnali, dardi, fionde, bastoni ferrati, balestre leggere',
  f:[
   ['Origine stregonesca',1,'both','La sottoclasse: discendenza draconica, magia selvaggia e le altre. Definisce da dove viene il tuo potere.'],
   ['Fonte di magia',2,'both','Punti stregoneria pari al tuo livello: li converti in slot e viceversa.'],
   ['Metamagia',3,'both','Modifichi i tuoi incantesimi: accelerati, potenziati, prolungati, sottili, gemelli, distanti.'],
   ['Restauro stregonesco',20,'both','Con un riposo breve recuperi 4 punti stregoneria.']
  ]},
 warlock:{n:'Warlock',dv:8,inc:'patto',carat:'car',ts:['sag','car'],abil:2,
  arm:'Armature leggere, armi semplici',
  f:[
   ['Patrono ultraterreno',1,'both','La sottoclasse: il Immondo, l\u2019Arcifata, il Grande Antico. Concede incantesimi ampliati e privilegi.'],
   ['Magia del patto',1,'both','Pochi slot, sempre del livello più alto che puoi lanciare, che tornano con il riposo breve.'],
   ['Suppliche occulte',2,'both','Doni permanenti scelti da un elenco: vista del diavolo, maschera di molte facce, agonia dell\u2019anima.'],
   ['Dono del patto',3,'both','Patto della Lama, del Tomo o della Catena.'],
   ['Arcanum mistico',11,'both','Un incantesimo di 6° livello lanciabile una volta per riposo lungo senza spendere slot. Se ne aggiunge uno ogni due livelli.'],
   ['Maestro del destino',20,'both','Con un riposo breve o lungo recuperi tutti gli slot della Magia del patto.']
  ]}
};
/* Slot per mezzi incantatori (paladino e ranger) e per il warlock */
var SLOT_MEZZI={2:[2],3:[3],4:[3],5:[4,2],6:[4,2],7:[4,3],8:[4,3],9:[4,3,2],10:[4,3,2],
 11:[4,3,3],12:[4,3,3],13:[4,3,3,1],14:[4,3,3,1],15:[4,3,3,2],16:[4,3,3,2],
 17:[4,3,3,3,1],18:[4,3,3,3,1],19:[4,3,3,3,2],20:[4,3,3,3,2]};
var SLOT_PATTO={1:[1,1],2:[2,1],3:[2,2],4:[2,2],5:[2,3],6:[2,3],7:[2,4],8:[2,4],9:[2,5],
 10:[2,5],11:[3,5],12:[3,5],13:[3,5],14:[3,5],15:[3,5],16:[3,5],17:[4,5],18:[4,5],19:[4,5],20:[4,5]};
