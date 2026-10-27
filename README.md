# Fit Planner Premium v38 — iPhone-style refinements + nuovo branding (27/10/2026)

Questo aggiornamento è una **patch incrementale della v37**, non una riscrittura. Lo ZIP contiene **solo** i file modificati o aggiunti, mantenendo i percorsi originali del progetto.

## Contenuto dello ZIP

- `FIT-P-main/app.js`
- `FIT-P-main/index.html`
- `FIT-P-main/styles.css`
- `FIT-P-main/sw.js`
- `FIT-P-main/manifest.webmanifest`
- `FIT-P-main/README.md`
- `FIT-P-main/brand-mark.svg`
- `FIT-P-main/icon-192.png`
- `FIT-P-main/icon-512.png`

## Novità principali della v38

- Pulsante **Impostazioni** riportato in una posizione più discreta e coerente con il layout precedente: resta nell'header, ma non occupa più troppo spazio su iPhone.
- Restyling ancora più **mobile-first / iPhone-style**: header più pulito, card più compatte, barra inferiore più elegante e shell visiva più simile a un'app nativa.
- Nuovo **simbolo/logo Fit Planner** più gradevole rispetto al vecchio riquadro con `FP`.
- Nuove icone PWA `icon-192.png` e `icon-512.png`, coerenti con il nuovo branding.
- Tutte le migliorie della v37 restano attive: **date in formato `GG/MM/AAAA`**, **pasti nominabili**, **selezione di tutti i pasti del giorno**, **navigazione tra le serie** durante modifica e sessione.

## Installazione / aggiornamento

1. Dalla tua versione attuale apri **Impostazioni → Esporta JSON** e salva un backup leggibile.
2. Sostituisci **insieme** tutti i file dello ZIP nella stessa cartella del progetto.
3. Se la PWA era già installata, aprila in Safari o dal link originale e usa il pulsante **Aggiorna app** quando compare l'avviso.
4. In **Impostazioni** controlla che compaia la versione **v38**.
5. Verifica che schede, diete, sessioni, pasti consumati e lista della spesa siano ancora presenti.

La chiave `localStorage` resta **`fitplanner_v7`**. Non cambiare dominio, percorso base o origine web dell'app, altrimenti i dati locali del browser non saranno gli stessi.

## Cosa è stato modificato per file

| File | Modifiche |
| --- | --- |
| `app.js` | Mantiene tutte le logiche v37 e continua a gestire date italiane, pasti nominabili e flussi allenamento/dieta/spesa. |
| `index.html` | Header rivisto con pulsante Impostazioni più compatto, nuovo marchio nell'intestazione, versione aggiornata a v38. |
| `styles.css` | Affinamento grafico mobile-first, header più leggero, logo nuovo, pulsante Impostazioni più elegante, shell ancora più iPhone-style. |
| `sw.js` | Cache aggiornata a `fitplanner-static-v38-20261027` e inclusione del nuovo asset `brand-mark.svg`. |
| `manifest.webmanifest` | Mantiene il setup mobile e aggiunge descrizione più chiara per la PWA. |
| `brand-mark.svg` | Nuovo simbolo grafico di Fit Planner usato nell'header. |
| `icon-192.png` | Nuova icona PWA 192×192 coerente con il nuovo branding. |
| `icon-512.png` | Nuova icona PWA 512×512 coerente con il nuovo branding. |
| `README.md` | Documentazione aggiornata per la v38. |

## Verifiche manuali consigliate su iPhone

### 1) Header e impostazioni
- Apri la Home e controlla che **Impostazioni** non occupi più tutta la larghezza.
- Verifica che il nuovo pulsante sia più discreto e comodo.
- Controlla che il nuovo logo sia visivamente gradevole sia in chiaro che in scuro.

### 2) Branding e icona app
- Se l'app è installata sulla Home di iPhone, aggiorna la PWA e verifica che dopo il refresh compaia la **nuova icona**.
- Controlla che il simbolo sia coerente anche nell'intestazione interna dell'app.

### 3) Date italiane
- Home, storico, sessioni, dieta, grafici e spesa devono mostrare le date come `GG/MM/AAAA`.
- Nella Spesa prova un valore non valido come `31/02/2026`: deve essere rifiutato.

### 4) Pasti nominabili
- Vai in **Le mie diete → Modifica**.
- Seleziona un pasto e rinominalo, ad esempio `Colazione`, `Pranzo`, `Cena`, `Spuntino pomeriggio`.
- Salva e controlla che il nome compaia anche nella schermata giornaliera della Dieta.

### 5) Pasti consumati
- In **Dieta** scegli un giorno.
- Verifica che vengano mostrati **tutti i pasti del giorno insieme**.
- Segna come consumati più pasti diversi senza doverli filtrare prima.
- Chiudi e riapri l'app: le selezioni devono restare salvate.

### 6) Serie allenamento
- Apri una sessione o modifica dallo storico.
- Passa tra le serie con **← Serie** e **Serie →**.
- Verifica che si possa modificare la singola serie senza saltare subito all'esercizio successivo.

### 7) Lista spesa
- Controlla che la sezione Spesa mantenga quantità, articoli manuali, scorte e spunte dopo ricalcolo e riavvio.

## Verifiche tecniche realmente eseguite

- **Superati**: controllo sintassi JavaScript con Node.js; validazione formale del `manifest.webmanifest`; generazione e sostituzione dei nuovi asset grafici; verifica della presenza del nuovo asset `brand-mark.svg` nella cache del Service Worker.
- **Non eseguiti in modo reale su dispositivo**: test fisici su iPhone/Safari, installazione PWA su schermata Home e verifica visuale finale delle nuove icone. Questi controlli vanno fatti sul telefono.

## Nota finale

Questa versione punta a migliorare l'esperienza **reale da mobile**, senza cambiare l'architettura offline-first né rompere i dati esistenti. Prima di adottarla definitivamente, fai comunque una prova completa sul tuo iPhone con il backup JSON a portata di mano.
