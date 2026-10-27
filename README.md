# Fit Planner Premium v36 — iPhone UI, date italiane, serie e pasti (27/10/2026)

Questo aggiornamento è una **patch incrementale della v35**, non una riscrittura. Lo ZIP contiene **esclusivamente i file modificati**, con gli stessi percorsi del progetto. Lascia al loro posto le icone `icon-192.png` e `icon-512.png`, che non sono incluse.

## Prima di installare

1. Da Fit Planner v35, apri **Impostazioni → Esporta JSON** e conserva un backup leggibile (controlla che sia un JSON non vuoto).
2. Sostituisci **insieme** tutti i file dello ZIP, senza rinominare la cartella né cambiare il dominio/indirizzo web dove utilizzi la PWA.
3. Su iPhone apri Fit Planner dal link originale in **Safari** o dall'icona della schermata Home. Quando appare l'avviso di nuova versione, scegli **Aggiorna app**, quindi riapri la schermata iniziale.
4. In Impostazioni controlla la versione **v36** e verifica che vecchie schede, diete e sessioni siano presenti. Non cancellare i dati di Safari o disinstallare la PWA fino a quando non hai verificato il backup.

La chiave `localStorage` resta **`fitplanner_v7`**. Le date già memorizzate rimangono **`AAAA-MM-GG` internamente** per non rompere chiavi, ordinamenti e backup. **Tutte le date mostrate nell'interfaccia** vengono invece rese come **`GG/MM/AAAA`**, inclusi storico, sessione, dashboard, dieta, grafici e spesa. I due campi del periodo Spesa accettano **solo** `GG/MM/AAAA`: controllano anche giorni e anni bisestili. La data nel nome del file backup usa `GG-MM-AAAA` perché lo slash non è adatto ai nomi dei file.

## Cosa cambia per file

| File | Modifiche |
| --- | --- |
| `app.js` | Conversione centralizzata delle date visualizzate, validazione del periodo Spesa, ripristino dell'ultimo intervallo scelto, etichette complete della settimana, lista di **tutti** i pasti senza filtro obbligatorio e selezione indipendente di ogni pasto consumato, navigazione **serie precedente/successiva** e selezione diretta delle serie, anche nel dettaglio dello storico. |
| `index.html` | Eliminato il filtro Pasto dalla registrazione giornaliera, aggiunti pulsanti serie precedente/successiva, date Spesa come campi `GG/MM/AAAA` con tastiera numerica iPhone, icone vettoriali monocromatiche per le cinque schede in basso, aggiornato numero versione e colori di Safari. |
| `styles.css` | Nuovo stile premium iOS: palette elegante adattiva (chiaro/scuro), tipografia di sistema Apple, dashboard scura con sfumature discrete, superfici pulite, pulsanti e navigazione inferiore coerenti, controlli allenamento ottimizzati, selettore di serie, card consumi individuali, supporto safe-area e dimensioni di tocco adeguate. |
| `manifest.webmanifest` | Allineamento del colore di sfondo al nuovo tema. |
| `sw.js` | Cache rinominata in `fitplanner-static-v36-20261027` per aggiornare correttamente gli asset della patch. |
| `README.md` | Istruzioni installazione, changelog e guida di test. |

## Guida di verifica iPhone

**Date** — Nella Home e nelle sessioni verifica date del tipo `27/10/2026`, non `2026-10-27`. Nella **Spesa** prova `31/02/2026` (rifiutata) e `29/02/2024` (valida). Riapri Spesa e verifica che il periodo precedente rimanga selezionato. Nel grafico tocca un punto e controlla la data completa nel tooltip.

**Serie** — Apri **Progressi → Storico sessioni**. Nel dettaglio di una sessione, tocca direttamente il riquadro **#2** di un esercizio; deve aprire la **serie 2** di quell'esercizio, con i carichi precedenti. Prova **← Serie** e **Serie →** oppure i numeri serie sopra Kg/Reps. Cambia un valore e poi torna sulla stessa serie: la modifica deve essere mantenuta. **Prossimo esercizio** rimane un'azione diversa da **Serie →**.

**Pasti** — Apri **Dieta**, scegli un giorno e verifica che compaiano insieme **Pasto 1, Pasto 2, ...**, senza selezionare prima un numero di pasto. Tocca **Segna consumato** su due pasti diversi: devono risultare entrambi consumati, anche se cambi giorno o riavvii l'app. Un pasto vuoto resta visibile, ma non può essere segnato consumato.

**Aspetto iPhone** — Controlla la grafica su iPhone in verticale: barra inferiore visibile e toccabile, nessuna sovrapposizione con indicatore Home, campi kg/reps utilizzabili con tastiera, testo leggibile con modalità chiara e scura. Il layout è sviluppato pensando a schermi circa 360–430 px ma va verificato fisicamente su Safari iOS.

**Dati/offline** — Confronta prima/dopo il numero di sessioni e schede; verifica nomi, ripetizioni e carichi. Dopo la pubblicazione visita l'app online per aggiornare la cache e controlla la riapertura in modalità aereo. Per testare il ripristino importa un backup **solo dopo averne esportato uno nuovo**.

## Verifiche tecniche realmente svolte

- **Superati**: controllo sintassi JavaScript con Node.js; test unitari su `GG/MM/AAAA` (inclusi anni bisestili, giorni impossibili e intervallo a cavallo di mese); rendering di tutti i pasti tramite DOM simulato; logica di cambio serie e salvataggio dell'indice; verifica HTML di identificatori duplicati assenti e rimozione dei campi `type=date` e del filtro del pasto.
- **Non eseguiti**: prove grafiche/integrate in browser reale perché il runtime blocca la navigazione automatica di Chromium; test fisici su iPhone/Safari e collaudo del Service Worker installato. I controlli manuali sopra sono necessari prima dell'uso quotidiano.

L'app rimane locale/offline-first, senza account e senza sincronizzazione tra dispositivi. **Non cambiare origine web** per aggiornare: `localStorage` è collegato all'indirizzo del sito in cui gira l'app.
