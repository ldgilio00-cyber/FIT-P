# Fit Planner · aggiornamento premium mobile v35 (27 ottobre 2026)

Questa cartella ZIP contiene **solo i file aggiornati**. Copiali nella stessa posizione dei file del tuo progetto, mantenendo i percorsi. **Non eliminare** `manifest.webmanifest`, `icon-192.png`, `icon-512.png` o altre risorse già presenti: le loro versioni originali rimangono valide.

## Prima di aggiornare

1. Apri l'app originale sul telefono e vai in **Impostazioni → Export JSON**. Conserva il backup in un posto sicuro.
2. Sostituisci soltanto i file presenti in questo ZIP (`app.js`, `index.html`, `styles.css`, `sw.js`, `README.md`). Pubblica tutti e quattro i file applicativi **insieme**, non uno per volta.
3. Riapri la PWA collegata al sito originale; se compare **Nuova versione disponibile**, premi **Aggiorna app** quando non stai modificando una serie.
4. Da **Impostazioni** controlla la dicitura `v35`, poi verifica che schede, diete e sessioni siano ancora presenti. I dati in `localStorage` appartengono al sito (origine), al profilo browser e al dispositivo: **cambiare indirizzo web o dominio non li trasferisce**.
5. Non disinstallare l'app, eliminare i dati del browser o cancellare il sito prima di aver effettuato e verificato un backup.

**Importante:** la chiave dei dati rimane `fitplanner_v7`. Le nuove proprietà (`grocery`, `consumed`, `ui.restTimer`) si aggiungono ai dati esistenti. Un salvataggio in formato non riconoscibile **non viene sovrascritto**: appare un avviso con un pulsante per scaricare i dati originali non leggibili. Se `localStorage` è pieno o bloccato appare un avviso; occorre risolvere prima di continuare.

## Novità per file

| File | Modifiche |
| --- | --- |
| `app.js` | Data locale, migrazione conservativa, validazione backup/importazione confermata, escaping HTML, timer a scadenza assoluta, salvataggio e avanzamento della serie, modifica esercizi/alimenti, dieta settimanale, marcatura pasti consumati, nutrizione facoltativa con fonte, generazione e gestione persistente spesa, categorie, scorte, esclusioni, condivisione e riepiloghi Home. Corretto `defaultDietWeek()` mancante. |
| `index.html` | Home con riepiloghi, navigazione mobile con Spesa, editor alimenti e nutrienti, selezione giorni dieta, pagina Spesa completa, avvisi di aggiornamento e protezione dati, numero versione. |
| `styles.css` | UI mobile riprogettata con aree tocco ampie, safe area, barra azioni durante allenamento, spesa e settimana responsive, tema scuro, adattamento della tastiera mobile e rispetto di `prefers-reduced-motion`. |
| `sw.js` | Nuova cache v35, precaching atomico delle risorse locali, pulizia delle vecchie cache `fitplanner`, nessuna cache indiscriminata di dati esterni, fallback offline della Home. |
| `README.md` | Changelog e guida di installazione/test. |

## Regole esplicite della Spesa

- Seleziona l'intervallo **Dal–Al** (da 1 a 31 giorni), poi premi **Ricalcola lista**. Al primo ingresso, con una dieta attiva, la lista viene generata automaticamente per 7 giorni a partire da oggi.
- Gli alimenti uguali vengono accorpati in modo insensibile a maiuscole/minuscole, accentazione e spazi extra. Si sommano solo unità compatibili: g/kg, ml/l, oppure pz. Il peso di un liquido **non** viene stimato a partire dai millilitri.
- Il fabbisogno è quello **pianificato**. La quantità da comprare è `max(0, quantità prevista - scorta)`.
- Spunte, scorte, e articoli manuali restano dopo riavvio e ricalcolo. Un articolo modificato dalla lista automatica diventa **manuale** e la sua precedente versione automatica viene esclusa.
- Gli articoli automatici cancellati manualmente rimangono esclusi dopo il ricalcolo; usa **Ripristina esclusi** per rigenerarli.
- Un alimento non più nella dieta ma già acquistato o con scorte rimane in lista segnalato **Fuori piano**, per non perdere la cronologia della spunta.
- La condivisione usa `navigator.share` se disponibile; altrimenti viene mostrato un testo selezionabile da copiare.

## Test concreti su Android e iPhone

1. **Dati precedenti**: prima e dopo l'aggiornamento confronta numero e nomi delle schede, diete e sessioni. Apri uno storico vecchio e controlla peso, ripetizioni, data e PR.
2. **Schede**: crea una scheda, aggiungi un giorno e due esercizi; modifica un esercizio, riordina gli elementi, duplica un giorno. Chiudi e riapri l'app, controllando che tutto rimanga.
3. **Allenamento**: avvia una sessione, inserisci kg e ripetizioni, premi **Salva & Avvia timer**. La serie successiva si mostra automaticamente; puoi tornare e correggere i valori. Esci e usa **Riprendi allenamento**, poi chiudi e riapri la sessione dallo storico.
4. **Timer**: durante un recupero blocca lo schermo per 10–20 secondi, poi torna nell'app: deve essere mostrato il tempo effettivamente trascorso. Verifica pausa, ripresa, salto, e il comportamento dopo chiusura/riavvio. Vibrazione e avvisi in background dipendono dal sistema operativo.
5. **Dieta**: crea una dieta, inserisci alimenti, cambia porzioni e sposta i pasti tra giorni; usa **Copia su giorno** e prova la vista settimanale. Tocca **Segna consumato** e verifica che la spunta rimanga dopo il riavvio. I valori nutrizionali vengono mostrati soltanto se **tutti** gli alimenti del giorno hanno dati completi inseriti con fonte.
6. **Spesa**: genera una settimana, verifica somme e categorie; aggiungi un prodotto manuale, segna acquistato, inserisci le scorte, modifica la dieta e premi Ricalcola. Verifica che le spunte e l'articolo manuale rimangano. Prova esclusione, ripristino, copia testo e condivisione.
7. **Backup**: esporta JSON, prova ad importare un file JSON non valido (deve rifiutarlo). Importa una copia di backup valida **solo dopo avere eseguito un'altra esportazione** e controlla che chieda conferma.
8. **Offline/PWA**: apri e usa l'app almeno una volta online, poi attiva modalità aereo e riaprila; controlla Home, sessione e Spesa. Torna online e verifica che si aggiorni senza perdere i dati.
9. **Responsive**: prova orientamento verticale su schermi stretti (~360 px) e più larghi (~430 px), e con tastiera aperta negli input di serie, alimenti e lista.

## Limiti conosciuti

L'app è offline-first con `localStorage`, non sincronizza i dati fra dispositivi. Le notifiche visibili a schermo e la vibrazione al termine del recupero funzionano solo se browser/OS le permettono; **non sono garantite notifiche quando il sistema chiude la PWA in background**. Il calcolo dei macro è una somma dei valori dichiarati dall'utente con la relativa fonte e non costituisce consiglio medico o un database nutrizionale certificato. La categoria alimentare è una classificazione indicativa basata sul nome.

## Verifiche eseguite in questa consegna

Eseguiti test automatici con Chromium headless, caricando il codice della PWA e simulando il `localStorage`, su viewport 360×780, 390×844, 430×932 e 1280×800: nessun errore JavaScript nei percorsi provati né overflow orizzontale. Eseguiti creazione dieta, aggiunta e accorpamento cibi, conservazione spunte/scorte dopo ricalcolo, aggiunta/modifica manuale, esclusione e ripristino, creazione scheda e sessione, serie, ripresa e chiusura, escaping di HTML negli input, backup non valido rifiutato, importazione valida, conservazione dello storico importato e protezione di dati locali non leggibili. Validata sintassi di `app.js` e `sw.js` con Node.js. **Non testate su dispositivi fisici reali né verificata in un browser raggiungibile via HTTPS l'installazione/offline del Service Worker:** il test locale di navigazione HTTP è stato impedito dall'ambiente di esecuzione. Seguire la checklist sopra per questi ultimi controlli.
