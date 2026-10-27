# Fit Planner Premium v43 — calendario, preferiti, allenamento rapido, dispensa e backup

Aggiornamento incrementale **dalla v42**. È una patch sui file reali: sostituire soltanto i file forniti, **senza cancellare gli altri**. La chiave locale resta `fitplanner_v7`. Non spostare il sito su un nuovo dominio o percorso base: i dati locali della PWA dipendono dall'origine web.

## Changelog dei file

| File | Cosa cambia |
| --- | --- |
| `app.js` | Calendario mensile e dettaglio giornaliero; pasti preferiti clonabili e applicabili ai piani; completamento rapido delle serie con Annulla e barra di avanzamento; dispensa condivisa con la lista Spesa e migrazione delle vecchie scorte; controllo integrità, avviso esportazione e copia di sicurezza automatica prima di importare un JSON. |
| `index.html` | Nuova vista Calendario, accessi da Home e Progressi; preferiti nella Dieta; editor Dispensa nella Spesa; strumenti di verifica e ripristino in Impostazioni; versione v43. |
| `styles.css` | Layout mobile responsive di calendario, preferiti, dispensa, serie rapide e stato backup; corretta resa anche a 320 px. |
| `sw.js` | Cache statica rinominata in `fitplanner-static-v43-20261027` per servire insieme le risorse aggiornate. |
| `README.md` | Questa guida di verifica e aggiornamento. |

**Nessuna nuova libreria, backend, account o servizio esterno.** `manifest.webmanifest`, icone e altre risorse restano quelli della v42.

## Funzionalità nuove

### Calendario

Dalla Home premi **Apri calendario**, oppure dai Progressi **Apri calendario mensile**. Scorri i mesi e tocca un giorno: vedrai le sessioni registrate (apribili dallo storico), le eventuali sessioni previste dalla scheda attiva per quel giorno della settimana e i nomi dei pasti effettivamente segnati consumati. I due puntini colorati distinguono allenamenti e pasti consumati. Il calendario legge i dati esistenti, **non li duplica**. Le date visibili restano `GG/MM/AAAA`.

### Dieta e pasti preferiti

Nella Dieta, ogni pasto pianificato che contiene alimenti ha il tasto **☆ Preferito**. Assegna un nome: verrà salvata una **copia autonoma** del pasto. Più in basso, scegli il giorno, seleziona Colazione/Pranzo/Cena (o un altro nome personalizzato) nel menu del preferito, quindi **Usa**. Se il pasto di destinazione contiene già alimenti, viene chiesta conferma prima di sostituirli. Puoi eliminare i preferiti singolarmente. Modificare una copia nel piano non altera l'originale memorizzato tra i preferiti.

### Allenamento rapido

Ogni riga della tabella Serie possiede il tasto **✓**. Se kg e ripetizioni sono già stati digitati, usa quei valori; se il campo è vuoto, l'app propone il valore della stessa serie dell'ultima sessione registrata, quando disponibile. Per completare è necessaria una quantità valida di ripetizioni. Ogni azione è esplicita: il software non inventa una prestazione. Il tasto **Annulla** ripristina la serie esattamente com'era prima dell'ultimo completamento rapido, finché non viene eseguita un'altra modifica. La barra mostra le serie con ripetizioni registrate.

### Dispensa e spesa

La nuova card **Dispensa** permette di inserire alimenti, quantità e unità (g, kg, ml, l, pz). Le unità compatibili vengono normalizzate per il calcolo e la quantità da acquistare non scende mai sotto zero. Le scorte già inserite nelle righe della Spesa v42 vengono convertite automaticamente in voci della Dispensa al primo avvio. Modificare la quantità **In casa** su un prodotto della Spesa aggiorna anche la Dispensa. La spunta “Acquistato” **non** aggiunge automaticamente quel prodotto in dispensa: potrai aggiornare la quantità disponibile quando lo riponi. Restano preservati gli articoli manuali e le spunte già effettuate.

### Backup e controllo dati

Nelle **Impostazioni** trovi **Controlla integrità** (controlli strutturali, senza alterare i dati), un'indicazione della data in cui è stata **avviata** l'ultima esportazione e il pulsante per recuperare il salvataggio precedente all'ultima importazione, se disponibile. Prima di ogni importazione viene salvata una copia sotto la chiave distinta `fitplanner_preimport_v43`; se lo spazio non basta, l'importazione viene bloccata anziché rischiare di perdere dati. Un backup JSON non valido viene rifiutato e l'importazione continua a richiedere conferma. La copia di recupero è **solo sullo stesso dispositivo** e non sostituisce un backup esportato su File/iCloud Drive.

## Come aggiornare su iPhone

1. Dalla **v42**, vai in **Impostazioni → Export JSON** e conserva il file nella cartella File o su iCloud Drive.
2. Copia i cinque file dello ZIP nella stessa posizione del progetto, sovrascrivendo quelli omonimi; mantieni tutte le altre risorse.
3. Apri la PWA installata sulla schermata Home, attendi l'avviso di aggiornamento e premi **Aggiorna app**. Riapri se necessario.
4. Verifica la dicitura **v43** in Impostazioni. Controlla schede, diete, sessioni, spesa, scorte e pasti consumati.
5. Fai un nuovo backup quando hai verificato il corretto funzionamento.

**Non disinstallare l'app né eliminare dati siti web da Safari prima di avere un backup valido.**

## Guida ai test reali

- **Calendario:** apri un mese con allenamenti precedenti; i giorni devono presentare un punto e il dettaglio deve aprire la sessione corretta. Controlla anche un giorno con pasti segnati consumati.
- **Preferiti:** salva Colazione nei preferiti, scegli un altro giorno e applicala a Colazione. Controlla che la prima giornata sia rimasta invariata.
- **Serie rapide:** apri un esercizio già svolto, tocca ✓ su una serie vuota, controlla che siano stati ripresi i dati della serie precedente; premi Annulla e verifica il ripristino. Prova anche una serie senza storico.
- **Dispensa:** registra 0,5 kg di riso, ricalcola la Spesa e controlla che vengano sottratti 500 g da un fabbisogno espresso in g. Cambia la scorta dalla Spesa e riapri la Dispensa.
- **Backup:** esegui Controlla integrità. Esporta un JSON. Non testare un ripristino sostitutivo sui tuoi unici dati reali: usa una copia di prova dell'app, oppure verifica soltanto il rifiuto di un file JSON non valido.
- **iPhone standalone/offline:** prova l'apertura dalla schermata Home, l'utilizzo della tastiera su kg/ripetizioni e la riapertura in modalità aereo dopo un primo aggiornamento online.

## Test eseguiti nell'ambiente disponibile

- Controllo sintattico di `app.js` con Node.js.
- Test automatici in Chromium: calendario, apertura storico, completamento rapido e annullamento, creazione/applicazione preferiti, migrazione vecchie scorte, compatibilità g/kg e ml/l, preservazione `fitplanner_v7`, import JSON valido/non valido, recupero pre-importazione.
- Verifica responsive e assenza di overflow orizzontale nelle nuove schermate a **320, 375, 390, 430 e 1024 px**.

**Non eseguiti:** test fisici su iPhone/Safari PWA standalone, conferma del comportamento reale della tastiera iOS e collaudo del Service Worker dopo pubblicazione. Questi devono essere verificati sul dispositivo.
