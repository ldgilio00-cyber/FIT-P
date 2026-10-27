/* Fit Planner — app.js (offline-first)
   ✅ Multi schede + multi diete
   ✅ Sessione dedicata (1 serie alla volta) + timer
   ✅ Storico esercizio (Ultima/Best) — CORRETTO (Best reale)
   ✅ Suggerimento progressione (PT)
   ✅ Grafico progressione esercizio (canvas) — PER SESSIONE (anche stesso giorno)
   ✅ TAP su “Storico sessioni” -> apre la sessione (EDIT anche se chiusa)
   ✅ Toggle “Chiusa/Riapri”
   ✅ Grafico più dettagliato: assi, griglia, min/max/ultimo, tooltip tap
*/

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

if("serviceWorker" in navigator){
  const previouslyControlled=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!previouslyControlled)return; // Non segnalare come update la prima installazione.
    const banner=document.getElementById("updateBanner");if(banner)banner.hidden=false;
  });
  window.addEventListener("load",()=>navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{}));
}
document.getElementById("btnReloadApp")?.addEventListener("click",()=>location.reload());
// iOS Home Screen PWA: la tastiera riduce visualViewport, NON l'altezza
// logica del pannello. Ridimensionarlo a ogni resize lasciava un enorme vuoto
// e spostava i comandi sopra il campo selezionato (caso reale su iPhone).
let sessionBaseHeight=0;
let keyboardScrollTask=null;
let editingBlurTask=null;
function sessionKeyboardActive(){
  const session=document.getElementById("session");
  return !!session && session.classList.contains("keyboard-editing");
}
function updateKeyboardInset(){
  const vv=window.visualViewport;
  const visualH=Math.round(vv?.height||window.innerHeight);
  const offset=Math.max(0,Math.round(vv?.offsetTop||0));
  if(!sessionKeyboardActive()){
    sessionBaseHeight=Math.max(visualH,Math.round(window.innerHeight));
  }
  const base=Math.max(sessionBaseHeight||visualH,visualH);
  const covered=sessionKeyboardActive()?Math.max(0,base-visualH-offset):0;
  const root=document.documentElement.style;
  root.setProperty("--keyboard-inset",`${covered}px`);
  // Mantieni lo stesso viewport del pannello mentre appare la tastiera.
  root.setProperty("--session-viewport-height",`${base}px`);
  root.setProperty("--session-keyboard-space",`${covered}px`);
  if(sessionKeyboardActive())queueFocusedSetScroll();
}
function scrollFocusedSetIntoView(){
  const target=document.activeElement;
  const scroll=document.querySelector("#session .sessionBody");
  if(!scroll || !sessionKeyboardActive() || !target?.matches?.("#session [data-set-field]"))return;
  const vh=window.visualViewport?.height || window.innerHeight;
  const r=target.getBoundingClientRect(), body=scroll.getBoundingClientRect();
  const desired=body.top+Math.max(35,Math.min(112,Math.round(vh*.19)));
  const offset=r.top-desired;
  if(Math.abs(offset)>5)scroll.scrollTop=Math.max(0,scroll.scrollTop+offset);
}
function queueFocusedSetScroll(){
  if(keyboardScrollTask)clearTimeout(keyboardScrollTask);
  keyboardScrollTask=setTimeout(scrollFocusedSetIntoView,70);
}
function changeSessionEditing(active){
  const session=document.getElementById("session");
  if(!session)return;
  session.classList.toggle("keyboard-editing",active);
  if(!active){
    document.documentElement.style.setProperty("--session-keyboard-space","0px");
  }
  updateKeyboardInset();
  if(active){
    queueFocusedSetScroll();
    // Il visual viewport iOS si assesta dopo l'animazione della tastiera.
    setTimeout(()=>{if(sessionKeyboardActive()){updateKeyboardInset();scrollFocusedSetIntoView();}},280);
  }
}
window.visualViewport?.addEventListener("resize",updateKeyboardInset);
window.visualViewport?.addEventListener("scroll",updateKeyboardInset);
window.addEventListener("resize",updateKeyboardInset);
window.addEventListener("orientationchange",()=>setTimeout(updateKeyboardInset,160));
// focusin/focusout in delega: renderSingleSet ricrea spesso gli input.
document.addEventListener("focusin",e=>{
  if(!e.target?.matches?.("#session [data-set-field]"))return;
  clearTimeout(editingBlurTask);
  changeSessionEditing(true);
});
document.addEventListener("focusout",e=>{
  if(!e.target?.matches?.("#session [data-set-field]"))return;
  clearTimeout(editingBlurTask);
  editingBlurTask=setTimeout(()=>{
    const current=document.activeElement;
    if(!current?.matches?.("#session [data-set-field]"))changeSessionEditing(false);
  },130);
});
updateKeyboardInset();
const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
// Date locali: UTC non deve spostare i giorni per utenti in Italia o altri fusi.
const localISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const todayISO = () => localISO();
// Il formato ISO resta riservato a localStorage, ordinamenti e chiavi: la UI usa sempre GG/MM/AAAA.
function displayDate(value){
  const s=String(value??"").trim();
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if(iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}
function parseItalianDate(input){
  const s=String(input??"").trim();
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if(!m)return null;
  const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]);
  if(year<1900||year>2100||month<1||month>12||day<1||day>31)return null;
  const date=new Date(year,month-1,day,12);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function maskItalianDate(input){
  const digits=input.value.replace(/\D/g,"").slice(0,8);
  const pieces=[digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean);
  input.value=pieces.join("/");
}

function addLocalDays(iso, days){
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(y,m-1,d+days,12);
  return localISO(date);
}
function weekdayOfISO(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y,m-1,d,12).getDay();
}
function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function finiteNumber(v){const n=Number(v); return Number.isFinite(n) ? n : 0;}

const DEFAULT_MEAL_NAMES = {
  1:"Colazione",
  2:"Spuntino",
  3:"Pranzo",
  4:"Merenda",
  5:"Cena",
  6:"Post workout",
  7:"Spuntino serale",
  8:"Extra"
};
function mealLabelForIndex(index){
  const key=String(index);
  return DEFAULT_MEAL_NAMES[key] || `Pasto ${key}`;
}
function ensureDietMealNames(diet){
  if(!diet || typeof diet!=="object") return;
  if(!diet.mealNames || typeof diet.mealNames!=="object" || Array.isArray(diet.mealNames)) diet.mealNames={};
  let maxKey=Math.max(1, Number(state?.settings?.mealsPerDay)||5);
  (diet.week||[]).forEach(day=>{
    Object.keys(day?.meals||{}).forEach(key=>{
      const n=Number(key);
      if(Number.isFinite(n)) maxKey=Math.max(maxKey,n);
    });
  });
  maxKey=Math.min(12,maxKey);
  for(let i=1;i<=maxKey;i++){
    const key=String(i);
    const raw=String(diet.mealNames[key] ?? "").trim();
    diet.mealNames[key]=raw || mealLabelForIndex(i);
  }
}
function getMealLabel(diet, key){
  ensureDietMealNames(diet);
  return String(diet?.mealNames?.[String(key)] || mealLabelForIndex(key)).trim();
}
function getDietMealKeys(diet){
  ensureDietMealNames(diet);
  let max=Math.max(1, Number(state?.settings?.mealsPerDay)||5);
  (diet?.week||[]).forEach(day=>{
    Object.keys(day?.meals||{}).forEach(key=>{
      const n=Number(key);
      if(Number.isFinite(n)) max=Math.max(max,n);
    });
  });
  max=Math.min(12,max);
  return Array.from({length:max},(_,i)=>String(i+1));
}
function mealHeading(diet,key){
  return getMealLabel(diet,key).toUpperCase();
}

const KEY = "fitplanner_v7";

function safeParse(raw){ try { return JSON.parse(raw); } catch { return null; } }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

function sid(v){ return (v===null || v===undefined) ? null : String(v); }
function clamp(n,min,max){
  n = Number(n);
  if(!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
// trova sessione anche se id è number/string
function findSessionById(id){
  const key = sid(id);
  if(!key) return null;
  return (state.sessions||[]).find(s => sid(s.id) === key) || null;
}

const DEFAULT = {
  settings: { weightKg: 68, mealsPerDay: 5, kcal: 2900, p: 140, c: 380, f: 80 },

  plans: [],
  activePlanId: null,

  diets: [],
  activeDietId: null,

  sessions: [],
  activeSessionId: null,
  activeExIndex: 0,
  activeSetIndex: 0,

  consumed: {},
  grocery: { rows: [], context: null },
  pantry: [],
  mealFavorites: [],
  meta: {lastExportStartedAt:null},
  ui: {
    planEditId: null, planEditDayId: null,
    dietEditId: null, dietEditDayIndex: 0, dietEditMeal: 1,
    dietEditMealNameDirty: false,
    exProgName: "", exProgMode: "best",
    sessionOpenId: null,     // sessione aperta da storico / attiva
  }
};

// Non sovrascrivere mai un salvataggio danneggiato con dati vuoti.
let storageBlocked = false;
let storageIssue = "";
let unreadableRaw = null;
let state = loadState();

function validDataShape(obj){
  if(!obj || typeof obj!=="object" || Array.isArray(obj))return false;
  // Supporto a salvataggi precedenti con workoutPlan / dietPlan anziché array.
  const legacy=!!(obj.workoutPlan || obj.dietPlan);
  const modern=Array.isArray(obj.plans) && Array.isArray(obj.diets) && Array.isArray(obj.sessions);
  if(!modern && !legacy)return false;
  const plans=obj.plans??[], diets=obj.diets??[], sessions=obj.sessions??[];
  return Array.isArray(plans)&&Array.isArray(diets)&&Array.isArray(sessions)&&
    plans.every(p=>p && typeof p.name==="string" && Array.isArray(p.days) &&
      p.days.every(d=>d && Array.isArray(d.exercises))) &&
    diets.every(d=>d && typeof d.name==="string" && Array.isArray(d.week) &&
      d.week.length===7 && d.week.every(w=>w && w.meals && typeof w.meals==="object")) &&
    sessions.every(s=>s && Array.isArray(s.items) && s.items.every(it=>it && Array.isArray(it.sets)));
}
function loadState(){
  let txt;
  try{ txt = localStorage.getItem(KEY); }
  catch(e){ storageBlocked=true; storageIssue="Memoria locale non disponibile"; return clone(DEFAULT); }
  if(txt === null) return clone(DEFAULT);
  const parsed = safeParse(txt);
  if(!validDataShape(parsed)){
    unreadableRaw=txt;
    storageBlocked=true;
    storageIssue="Dati salvati non leggibili. Non verranno sovrascritti: esporta una copia prima di intervenire.";
    return clone(DEFAULT);
  }
  return parsed;
}
function saveState(){
  if(storageBlocked) return false;
  try{ localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch(e){ storageIssue="Memoria piena o non disponibile: salva subito un backup JSON.";
    const warning=$("storageWarning"); if(warning){warning.hidden=false; warning.textContent=storageIssue;}
    return false;
  }
}

function toast(msg){
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => t.classList.remove("show"), 1400);
}



/* ---------------- helpers ---------------- */
function parseRestToSeconds(rest){
  if (!rest) return 90;
  const s = String(rest).trim();
  if (s.includes(":")){
    const [m,sec] = s.split(":");
    const mm = Number(m), ss = Number(sec);
    if (isFinite(mm) && isFinite(ss)) return Math.max(0, mm*60 + ss);
  }
  const n = Number(s.replace(/[^\d]/g, ""));
  if (isFinite(n) && n > 0) return n;
  return 90;
}
function fmtMMSS(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}
function moveItem(arr, from, to){
  if (!Array.isArray(arr)) return;
  if (to < 0 || to >= arr.length) return;
  const x = arr.splice(from,1)[0];
  arr.splice(to,0,x);
}
function getActivePlan(){ return state.plans.find(p => p.id === state.activePlanId) || null; }
function getActiveDiet(){ return state.diets.find(d => d.id === state.activeDietId) || null; }

const WEEKDAY_LABEL = {1:"Lunedì",2:"Martedì",3:"Mercoledì",4:"Giovedì",5:"Venerdì",6:"Sabato",0:"Domenica"};
const ID_TO_WEEKDAY = {mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};

function weekdayLabel(jsDay){ return WEEKDAY_LABEL[jsDay] || ""; }

function getPlanDayForJsDay(plan, jsDay){
  if(!plan || !Array.isArray(plan.days)) return null;
  // Prefer match by explicit weekday
  let d = plan.days.find(x => x && x.weekday!==undefined && Number(x.weekday) === jsDay);
  if(d) return d;
  // Fallback: legacy id mapping (mon/tue/...)
  d = plan.days.find(x => x && ID_TO_WEEKDAY[String(x.id||"")] === jsDay);
  return d || null;
}

function toNum(v){
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return isFinite(n) ? n : NaN;
}
function toKg(v){ const n=toNum(v); return (isFinite(n)&&n>0)?n:NaN; }
function toReps(v){ const n=toNum(v); return (isFinite(n)&&n>=0)?n:NaN; }
function normName(s){ return String(s||"").trim().toLowerCase(); }

function shortDate(d){return displayDate(d);}

/* ================= STORICO + SUGGERIMENTI ================= */
function getExerciseLastBest(exName){
  const currentId = state.activeSessionId;
  const name = normName(exName);

  const others = state.sessions
    .filter(s => s && s.id !== currentId);

  // Best (tutte le sessioni)
  let bestKg = null;
  for (const s of others){
    for (const it of (s.items||[])){
      if (normName(it.ex) !== name) continue;
      for (const st of (it.sets||[])){
        const kg = toKg(st.kg);
        if (isFinite(kg)) bestKg = (bestKg===null) ? kg : Math.max(bestKg, kg);
      }
    }
  }

  // Ultima (sessione più recente)
  const sorted = [...others].sort((a,b)=>{
    const at = a.ts || 0, bt = b.ts || 0;
    if (at && bt) return bt - at;
    return (a.date||"") < (b.date||"") ? 1 : -1;
  });

  let last = null;
  for (const s of sorted){
    for (const it of (s.items||[])){
      if (normName(it.ex) !== name) continue;
      for (const st of (it.sets||[])){
        const kg = toKg(st.kg);
        const reps = toReps(st.reps);
        if (isFinite(kg)){
          last = {
            date: s.date||"",
            kg,
            reps: isFinite(reps)?reps:null,
            ts: s.ts || 0
          };
          break;
        }
      }
      if (last) break;
    }
    if (last) break;
  }

  return { last, bestKg };
}

function fmtHistoryLine(h){
  const l = h?.last;
  const lastTxt = l
    ? `Ultima: ${l.kg.toFixed(1).replace(".0","")}kg${l.reps?` x ${l.reps}`:""} • ${displayDate(l.date)}`
    : "";
  const bestTxt = (h?.bestKg!==null && h?.bestKg!==undefined) ? `Best: ${h.bestKg.toFixed(1).replace(".0","")}kg` : "";
  return lastTxt && bestTxt ? `${lastTxt}  |  ${bestTxt}` : (lastTxt || bestTxt);
}

function suggestNextTarget(exName, target){
  const { last } = getExerciseLastBest(exName);
  if (!last || !isFinite(last.kg)) return null;

  const repMin = Number(target?.repMin || 0);
  const repMax = Number(target?.repMax || 0);
  const lastReps = last.reps;

  const bump = (kg) => kg < 20 ? 1 : Math.max(1, Math.round(kg * 0.025 * 2) / 2);
  const cut  = (kg) => kg < 20 ? 1 : Math.max(1, Math.round(kg * 0.025 * 2) / 2);

  let msg = "";
  let kgSug = last.kg;

  if (isFinite(lastReps) && repMax>0 && lastReps >= repMax){
    const inc = bump(last.kg);
    kgSug = last.kg + inc;
    msg = `Hai toccato il top range (${last.kg}kg x ${lastReps}). Prova ${kgSug.toFixed(1).replace(".0","")}kg (≈ +${inc}).`;
  } else if (isFinite(lastReps) && repMin>0 && lastReps < repMin){
    const dec = cut(last.kg);
    kgSug = Math.max(0, last.kg - dec);
    msg = `Sotto range (${last.kg}kg x ${lastReps}). Prova ${kgSug.toFixed(1).replace(".0","")}kg (≈ -${dec}).`;
  } else {
    msg = `Mantieni ${last.kg.toFixed(1).replace(".0","")}kg e prova +1 rep (se tecnica ok).`;
  }

  return { kgSuggested: kgSug, message: msg, last };
}

/* ================= PROGRESSIONE GRAFICO ================= */
function getAllExerciseNames(){
  const set = new Set();
  for (const s of state.sessions){
    for (const it of (s.items||[])){
      if (it?.ex) set.add(it.ex.trim());
    }
  }
  for (const p of state.plans){
    for (const d of (p.days||[])){
      for (const ex of (d.exercises||[])){
        if (ex?.ex) set.add(ex.ex.trim());
      }
    }
  }
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

/* ✅ PER SESSIONE */
function getExerciseDailySeries(exName){
  const name = normName(exName);
  const rows = [];

  for (const s of state.sessions){
    let best = 0;
    let sum = 0;
    let n = 0;
    let volume = 0;
    let volumeCount = 0;

    for (const it of (s.items||[])){
      if (normName(it.ex) !== name) continue;
      for (const st of (it.sets||[])){
        const kg = toKg(st.kg);
        const reps = toReps(st.reps);
        if (!isFinite(kg)) continue;

        best = Math.max(best, kg);
        sum += kg;
        n += 1;
        if (isFinite(reps) && reps > 0) { volume += kg * reps; volumeCount += 1; }
      }
    }

    if (n === 0) continue;

    rows.push({
      key: s.ts || 0,
      date: s.date || "",
      best,
      avg: n ? (sum/n) : 0,
      volume, volumeCount
    });
  }

  rows.sort((a,b)=> (a.key||0) - (b.key||0));
  return rows;
}

function niceTicks(min, max, count){
  // tick “carini” (tipo 5)
  if (!(isFinite(min) && isFinite(max)) || min === max) return [min, max];
  const span = max - min;
  const step0 = span / Math.max(1, (count-1));
  const pow = Math.pow(10, Math.floor(Math.log10(step0)));
  const n = step0 / pow;
  const niceN = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  const step = niceN * pow;

  const start = Math.floor(min/step) * step;
  const end = Math.ceil(max/step) * step;

  const ticks = [];
  for(let v=start; v<=end + 1e-9; v+=step) ticks.push(v);
  return ticks;
}

/* Progressi: grafico responsive, dettagli in una riga HTML, non nel canvas. */
let progressRange = "12";
let progressChartFrame = 0;
let progressChartObserver = null;
let progressCurrentRows = [];
let progressCurrentMode = "best";
function progressNum(value,mode="best"){
  const n=Number(value);
  if(!Number.isFinite(n))return "—";
  return (mode==="volume"?Math.round(n):Math.round(n*10)/10).toLocaleString("it-IT",{maximumFractionDigits:1});
}
function progressUnit(mode){return mode==="volume"?"kg × rip.":"kg";}
function progressDateLabel(value){return displayDate(value||"")||"Data sconosciuta";}
function selectChartPoint(canvas,index){
  const points=canvas?._fp_meta?.points||[];
  if(!points.length)return;
  const p=points[Math.max(0,Math.min(points.length-1,index))];
  canvas._fp_meta.selected=p.i;
  const detail=$("progressPointDetail");
  if(detail)detail.textContent=`${progressDateLabel(p.row.date)} · Punto ${p.i+1} di ${points.length} · ${progressNum(p.row[progressCurrentMode],progressCurrentMode)} ${progressUnit(progressCurrentMode)}`;
  drawChart(canvas,progressCurrentRows,progressCurrentMode,p.i);
}
function attachChartInteractions(canvas){
  if(!canvas || canvas._fp_bound)return;
  canvas._fp_bound=true;
  const pick=event=>{
    const meta=canvas._fp_meta;
    if(!meta?.points?.length)return;
    const x=(event.changedTouches?.[0]?.clientX??event.clientX)-canvas.getBoundingClientRect().left;
    // Per iPhone è più facile scegliere una data tramite coordinata orizzontale.
    const chosen=meta.points.reduce((a,b)=>Math.abs(b.cx-x)<Math.abs(a.cx-x)?b:a);
    selectChartPoint(canvas,chosen.i);
  };
  canvas.addEventListener("click",pick);
  canvas.addEventListener("keydown",event=>{
    if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
    event.preventDefault();
    const n=canvas._fp_meta?.points?.length||0;
    if(!n)return;
    const current=canvas._fp_meta.selected??(n-1);
    selectChartPoint(canvas,Math.max(0,Math.min(n-1,current+(event.key==="ArrowLeft"?-1:1))));
  });
  canvas.tabIndex=0;
}
function drawChart(canvas,rows,mode,selectedIndex){
  if(!canvas)return;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const width=Math.max(0,canvas.getBoundingClientRect().width||canvas.clientWidth||0);
  const height=Math.max(0,canvas.getBoundingClientRect().height||canvas.clientHeight||0);
  if(width<10||height<10)return; // Non disegnare durante una transizione nascosta.
  const dpr=Math.min(window.devicePixelRatio||1,3);
  const pxW=Math.round(width*dpr),pxH=Math.round(height*dpr);
  if(canvas.width!==pxW||canvas.height!==pxH){canvas.width=pxW;canvas.height=pxH;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  const style=getComputedStyle(canvas),ink=style.color||"#d4def1";
  const muted=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim()||"#8b9ab4";
  const accent=getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()||"#6396ff";
  const unit=progressUnit(mode);
  if(!rows.length){
    ctx.fillStyle=muted;ctx.font="13px -apple-system,system-ui,sans-serif";
    ctx.fillText("Nessun dato per questo esercizio.",12,Math.round(height/2));
    canvas._fp_meta={points:[],selected:null};return;
  }
  // La zona del grafico usa coordinate CSS: il testo non si sovrappone anche a 320px.
  const L=width<360?39:46,R=12,T=15,B=37,plotW=Math.max(30,width-L-R),plotH=Math.max(35,height-T-B);
  const values=rows.map(r=>Number(r[mode])||0);
  const low=Math.min(...values),high=Math.max(...values);
  const pad=Math.max((high-low)*0.15,mode==="volume"?5:0.8);
  const min=Math.max(0,low-pad),max=Math.max(high+pad,min+1);
  const xAt=i=>L+(rows.length===1?plotW/2:(i/(rows.length-1))*plotW);
  const yAt=v=>T+plotH-((v-min)/(max-min))*plotH;
  ctx.textBaseline="middle";ctx.font="11px -apple-system,system-ui,sans-serif";
  for(let j=0;j<=3;j++){
    const value=min+((max-min)/3)*j,y=yAt(value);
    ctx.strokeStyle="rgba(147,164,196,.20)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(width-R,y);ctx.stroke();
    ctx.fillStyle=muted;ctx.textAlign="right";ctx.fillText(progressNum(value,mode),L-7,y);
  }
  if(rows.length>1){
    ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.lineJoin="round";
    ctx.beginPath();rows.forEach((r,i)=>{const x=xAt(i),y=yAt(values[i]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  }
  const points=[];
  // Molti allenamenti non devono creare una massa illeggibile di pallini.
  const stride=rows.length>55?Math.ceil(rows.length/55):1;
  rows.forEach((r,i)=>{
    const x=xAt(i),y=yAt(values[i]);
    const highlighted=i===(selectedIndex??rows.length-1);
    if(i%stride===0||i===rows.length-1||highlighted){
      ctx.beginPath();ctx.arc(x,y,highlighted?5.4:rows.length>25?2.3:3.6,0,Math.PI*2);
      ctx.fillStyle=highlighted?"#ffffff":accent;ctx.fill();
      if(highlighted){ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.stroke();}
    }
    points.push({i,cx:x,cy:y,row:r,globalIndex:i});
  });
  ctx.font="10px -apple-system,system-ui,sans-serif";ctx.fillStyle=muted;
  ctx.textBaseline="alphabetic";
  [0,Math.floor((rows.length-1)/2),rows.length-1].filter((v,i,arr)=>arr.indexOf(v)===i).forEach(i=>{
    ctx.textAlign=i===0?"left":i===rows.length-1?"right":"center";
    ctx.fillText(displayDate(rows[i].date)||"—",xAt(i),height-10);
  });
  canvas._fp_meta={points,selected:selectedIndex??rows.length-1};
  attachChartInteractions(canvas);
}
function renderExerciseProgressUI(){
  const sel=$("exProgressSelect"),modeSel=$("exProgressMode"),sum=$("exProgressSummary"),canvas=$("exProgressChart");
  if(!sel||!modeSel||!sum||!canvas)return;
  const names=getAllExerciseNames();
  const previous=sel.value||state.ui.exProgName;
  sel.replaceChildren();
  if(!names.length){const option=document.createElement("option");option.value="";option.textContent="Nessun esercizio";sel.appendChild(option);}
  names.forEach(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;sel.appendChild(option);});
  sel.value=names.includes(previous)?previous:names.includes(state.ui.exProgName)?state.ui.exProgName:names[0]||"";
  modeSel.value=["best","avg","volume"].includes(state.ui.exProgMode)?state.ui.exProgMode:"best";
  const detail=$("progressPointDetail");
  const refresh=()=>{
    state.ui.exProgName=sel.value;
    state.ui.exProgMode=modeSel.value;
    saveState();
    const all=sel.value?getExerciseDailySeries(sel.value):[];
    const mode=modeSel.value;
    // Nessuna serie con ripetizioni = volume sconosciuto, NON zero.
    const available=mode==="volume"?all.filter(r=>r.volumeCount>0):all;
    const visible=progressRange==="all"?available:available.slice(-Number(progressRange));
    progressCurrentRows=visible;progressCurrentMode=mode;
    const fmt=n=>progressNum(n,mode);
    if(!visible.length){
      sum.innerHTML='<p class="muted small">Nessuna prestazione registrata: completa una serie per iniziare.</p>';
      if(detail)detail.textContent="Il grafico apparirà dopo il primo allenamento.";
    }else{
      const first=visible[0][mode],last=visible[visible.length-1][mode],max=Math.max(...visible.map(r=>r[mode]));
      const delta=last-first;
      const cells=[
        ["Ultima",`${fmt(last)} ${progressUnit(mode)}`],
        ["Migliore",`${fmt(max)} ${progressUnit(mode)}`],
        ["Variazione",`${delta>0?"+":""}${fmt(delta)} ${progressUnit(mode)}`]
      ];
      sum.innerHTML=cells.map(([label,value])=>`<div class="progressMetric"><span>${label}</span><b>${escapeHTML(value)}</b></div>`).join("");
      if(detail)detail.textContent=`${visible.length} ${visible.length===1?"sessione":"sessioni"} visualizzate · Tocca un punto per i dettagli.`;
    }
    drawChart(canvas,visible,mode);
  };
  sel.onchange=refresh;modeSel.onchange=refresh;
  document.querySelectorAll("[data-progress-range]").forEach(btn=>{
    const active=btn.dataset.progressRange===progressRange;
    btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",String(active));
    btn.onclick=()=>{
      progressRange=btn.dataset.progressRange;
      document.querySelectorAll("[data-progress-range]").forEach(b=>{
        b.classList.toggle("active",b===btn);b.setAttribute("aria-pressed",String(b===btn));
      });
      refresh();
    };
  });
  if(typeof ResizeObserver!=="undefined" && !progressChartObserver){
    progressChartObserver=new ResizeObserver(()=>{
      if(currentView!=="progress")return;
      cancelAnimationFrame(progressChartFrame);
      progressChartFrame=requestAnimationFrame(()=>drawChart(canvas,progressCurrentRows,progressCurrentMode));
    });
    progressChartObserver.observe(canvas.parentElement);
  }
  refresh();
}

document.addEventListener("keydown",e=>{
  if(e.key==="Enter" && ["INPUT"].includes(document.activeElement?.tagName) &&
    ["inKg","inReps"].includes(document.activeElement.id))document.activeElement.blur();
});
/* ---------------- views/tabs ---------------- */
/* ---------------- views/tabs ---------------- */
const VIEW_META = {
  home:     { title: "Fit Planner",  sub: "Oggi • Offline" },
  workout:  { title: "Allenamento",  sub: "Schede, sessioni, progressione" },
  diet:     { title: "Dieta",        sub: "Pasti, macro e kcal" },
  progress: { title: "Progressi",    sub: "Storico, PR e grafici" },
  settings: { title: "Impostazioni", sub: "Preferenze e backup" },
  grocery: { title: "Spesa", sub: "Lista intelligente e scorte" },
};

let currentView = "home";

function setAppBar(view){
  const meta = VIEW_META[view] || VIEW_META.home;
  const t = $("appTitle"); if(t) t.textContent = meta.title;
  const s = $("appSubtitle"); if(s) s.textContent = meta.sub;
}

function animateViewSwitch(prevEl, nextEl){
  if(!nextEl) return;

  // prepara
  nextEl.classList.remove("hidden");
  nextEl.style.zIndex = "2";
  if(prevEl){ prevEl.style.zIndex = "1"; }

  // animazioni (Web Animations API)
  try{
    nextEl.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0px)" }
      ],
      { duration: 180, easing: "ease-out" }
    );
  }catch{}

  if(prevEl && prevEl !== nextEl){
    try{
      const out = prevEl.animate(
        [
          { opacity: 1, transform: "translateY(0px)" },
          { opacity: 0, transform: "translateY(10px)" }
        ],
        { duration: 160, easing: "ease-out" }
      );
      out.onfinish = ()=>{
        prevEl.classList.add("hidden");
        prevEl.classList.remove("active");
        prevEl.style.zIndex = "";
        nextEl.style.zIndex = "";
      };
    }catch{
      prevEl.classList.add("hidden");
      prevEl.classList.remove("active");
      prevEl.style.zIndex = "";
      nextEl.style.zIndex = "";
    }
  } else {
    nextEl.style.zIndex = "";
  }
}

function setView(view){
  if(!view) return;
  const prev = document.querySelector(".view.active");
  const next = document.getElementById("view-"+view);

  if(!next) return;
  // tabs attivi (top + bottom)
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view===view));

  // views
  document.querySelectorAll(".view").forEach(v => {
    if(v === next) return;
    v.classList.remove("active");
    v.classList.add("hidden");
  });

  if(next){
    next.classList.add("active");
    animateViewSwitch(prev, next);
  }

  currentView = view;
  setAppBar(view);

  if(view==="grocery") openGrocery();
  if(view==="calendar") renderCalendar();
  if(view==="settings") renderBackupStatus();
  if(view==="diet") {renderDietPreview(); renderDietWeek();renderMealFavorites();}
  if(view==="home") homeRefresh();
  if(view==="progress"){
    renderHistory();
    renderPR();
    renderExerciseProgressUI();
  }
}

document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeSessionModal(); });

document.addEventListener("click",(e)=>{
  const tab=e.target.closest(".tab,[data-view].headerSettings"); if(tab) setView(tab.dataset.view);
  const jump=e.target.closest("[data-jump]"); if(jump) setView(jump.dataset.jump);
});

/* ================= TAP: apri sessione dallo storico (EDIT) ================= */
/* ================= TAP: apri sessione dallo storico (SHEET + EDIT) ================= */
let modalSessionId = null;

function resumeSessionFromHistory(sessionId){
  const s = findSessionById(sessionId);
  if(!s){
    toast("Sessione non trovata");
    // pulisci puntatore rotto
    if(state.activeSessionId && !findSessionById(state.activeSessionId)){
      state.activeSessionId = null;
      state.ui.sessionOpenId = null;
      saveState();
      refreshHomeSessionButton();
    }
    return;
  }

  state.ui.sessionOpenId = s.id;
  state.activeSessionId = s.id;

  // riprendi dove eri rimasto (se disponibile)
  const exMax = Math.max(0, (s.items?.length||1) - 1);
  const ex = clamp(s.progressExIndex ?? state.activeExIndex ?? 0, 0, exMax);
  const setMax = Math.max(0, (s.items?.[ex]?.sets?.length||1) - 1);
  const st = clamp(s.progressSetIndex ?? state.activeSetIndex ?? 0, 0, setMax);

  state.activeExIndex = ex;
  state.activeSetIndex = st;

  saveState();
  openSessionUI();
  renderSession();

  toast(s.closed ? "Sessione in modifica" : "Allenamento ripreso");
}

function renderSessionModal(sessionId){
  const s = findSessionById(sessionId);
  if(!s) return;

  const title = $("modalTitle"); if(title) title.textContent = s.dayName || "Sessione";
  const sub = $("modalSub");
  if(sub){
    const plan = s.planName ? ` • ${s.planName}` : "";
    sub.textContent = `${displayDate(s.date)}${plan}`.trim() || "—";
  }

  const status = $("modalStatus");
  if(status){
    status.textContent = s.closed ? "CHIUSA" : "IN CORSO";
    status.style.background = s.closed ? "rgba(148,163,184,.18)" : "var(--primarySoft)";
    status.style.color = s.closed ? "var(--muted)" : "var(--text)";
  }

  // calcola completamento serie
  let totalSets = 0, doneSets = 0;
  (s.items || []).forEach(it=>{
    totalSets += (it.target?.sets || (it.sets?.length||0) || 0);
    (it.sets || []).forEach(st=>{
      if(String(st?.reps||"").trim()) doneSets++;
    });
  });

  const sum = $("modalSummary");
  if(sum){
    const exN = (s.items||[]).length;
    const pct = totalSets ? Math.round((doneSets/totalSets)*100) : 0;
    sum.textContent = `${exN} esercizi • ${doneSets}/${totalSets} serie completate${totalSets?` • ${pct}%`:``}`;
  }

  const body = $("modalBody");
  if(body){
    body.innerHTML = "";
    (s.items || []).forEach((it,ix)=>{
      const row=document.createElement("div");
      row.className="item";
      row.innerHTML = `
        <div class="itemTop">
          <div class="itemTitle">${escapeHTML(it.ex || ("Esercizio "+(ix+1)))}</div>
          <div class="pill">${escapeHTML(it.target?.sets||it.sets?.length||0)}x ${escapeHTML(it.target?.repMin||"")}-${escapeHTML(it.target?.repMax||"")}</div>
        </div>
        <div class="tags"></div>
      `;
      const tags=row.querySelector(".tags");
      (it.sets || []).forEach((st,si)=>{
        const t=document.createElement("button");
        t.type="button";t.dataset.sessionJumpEx=String(ix);t.dataset.sessionJumpSet=String(si);
        t.className="tag tagAction";
        t.setAttribute("aria-label",`Modifica ${it.ex}, serie ${si+1}`);
        const kg = String(st?.kg||"").trim();
        const reps = String(st?.reps||"").trim();
        t.textContent = `#${si+1} ${kg?kg+"kg":""} ${reps?reps+" reps":"—"}`.trim();
        if(!reps) t.style.opacity = ".55";
        tags.appendChild(t);
      });
      body.appendChild(row);
    });
  }

  const btn = $("btnSessionModalResume");
  if(btn){
    btn.textContent = s.closed ? "Modifica" : "Apri";
  }
}

function openSessionModal(sessionId){
  const el = $("sessionModal");
  if(!el) return resumeSessionFromHistory(sessionId);

  modalSessionId = sid(sessionId);
  renderSessionModal(modalSessionId);

  document.body.classList.add("sheet-open");
  el.classList.remove("hidden");

  // animazione sheet
  const sheet = el.querySelector(".sheet");
  try{
    sheet.animate(
      [
        { transform: "translateY(20px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 }
      ],
      { duration: 180, easing: "ease-out" }
    );
  }catch{}
}

function closeSessionModal(){
  const el = $("sessionModal");
  if(!el) return;
  const sheet = el.querySelector(".sheet");
  document.body.classList.remove("sheet-open");

  try{
    const out = sheet.animate(
      [
        { transform: "translateY(0px)", opacity: 1 },
        { transform: "translateY(20px)", opacity: 0 }
      ],
      { duration: 140, easing: "ease-in" }
    );
    out.onfinish = ()=> el.classList.add("hidden");
  }catch{
    el.classList.add("hidden");
  }

  modalSessionId = null;
}

function openSessionFromHistory(sessionId){
  openSessionModal(sid(sessionId));
}

/* delega click su storico */
document.addEventListener("click",(e)=>{
  const open = e.target.closest("[data-session-open]");
  if(open){
    const id = open.getAttribute("data-session-id");
    openSessionFromHistory(id);
  }

  // chiudi sheet toccando lo sfondo
  if(e.target && e.target.id === "sessionModal"){
    closeSessionModal();
  }
});

/* bottoni sheet */
(function bindSessionModal(){
  const el = $("sessionModal");
  if(!el) return;

  $("btnSessionModalClose")?.addEventListener("click", closeSessionModal);

  $("modalBody")?.addEventListener("click",e=>{
    const button=e.target.closest("[data-session-jump-set]");
    const id=modalSessionId;if(!button||!id)return;
    const exercise=Number(button.dataset.sessionJumpEx),set=Number(button.dataset.sessionJumpSet);
    closeSessionModal();
    resumeSessionFromHistory(id);
    const session=activeSession();
    if(!session?.items?.[exercise]?.sets?.[set])return;
    state.activeExIndex=exercise;state.activeSetIndex=set;
    persistSessionProgress();saveState();renderSession();
  });

  $("btnSessionModalResume")?.addEventListener("click", ()=>{
    const id = modalSessionId;
    if(!id) return;
    closeSessionModal();
    resumeSessionFromHistory(id);
  });

  $("btnSessionModalDelete")?.addEventListener("click", ()=>{
    if(!modalSessionId) return;
    const s = findSessionById(modalSessionId);
    if(!s) return;

    const ok = confirm("Eliminare questa sessione?");
    if(!ok) return;

    // se è la sessione attiva, chiudi
    if(state.activeSessionId === s.id){
      state.activeSessionId = null;
      state.activeExIndex = 0;
      state.activeSetIndex = 0;
      state.ui.sessionOpenId = null;
      closeSessionUI();
    }

    state.sessions = state.sessions.filter(x=>sid(x.id)!==sid(s.id));
    saveState();
    refreshHomeSessionButton();

    closeSessionModal();
    renderHistory();
    renderPR();
    renderExerciseProgressUI();
    homeRefresh();
    toast("Sessione eliminata");
  });
})();




/* ---------------- selectors active plan/diet ---------------- */
function populateActivePlanSelect(){
  const sel = $("activePlanSelect"); if(!sel) return;
  sel.innerHTML = "";
  state.plans.forEach(p=>{
    const o=document.createElement("option");
    o.value=p.id; o.textContent=p.name;
    sel.appendChild(o);
  });
  sel.value = state.activePlanId || (state.plans[0]?.id || "");
}
function populateActiveDietSelect(){
  const sel = $("activeDietSelect"); if(!sel) return;
  sel.innerHTML = "";
  state.diets.forEach(d=>{
    const o=document.createElement("option");
    o.value=d.id; o.textContent = d.name;
    sel.appendChild(o);
  });
  sel.value = state.activeDietId || (state.diets[0]?.id || "");
}

$("activePlanSelect")?.addEventListener("change", ()=>{
  state.activePlanId = $("activePlanSelect").value;
  saveState();
  populateDays();
  renderDayPreview();
  homeRefresh();
});
$("activeDietSelect")?.addEventListener("change", ()=>{
  state.activeDietId = $("activeDietSelect").value;
  saveState();
  renderDietPreview(); renderDietWeek(); homeRefresh();
});

/* ---------------- workout preview ---------------- */
function populateDays(){
  const sel=$("daySelect");
  const plan = getActivePlan();
  if(!sel)return;
  sel.innerHTML="";
  if(!plan)return;
  plan.days.forEach(d=>{
    const o=document.createElement("option");
    o.value=d.id; o.textContent = (d.weekday!==undefined ? (weekdayLabel(d.weekday)+" — ") : "") + d.name;
    sel.appendChild(o);
  });
  if (!sel.value && plan.days[0]) sel.value = plan.days[0].id;
}

function renderDayPreview(){
  const box=$("dayPreview"), sel=$("daySelect");
  const plan = getActivePlan();
  if(!box||!sel)return;
  if(!plan){box.textContent="Nessuna scheda attiva. Crea la tua prima scheda.";return;}
  const day=plan.days.find(d=>d.id===sel.value);
  if(!day){box.textContent="Seleziona un giorno con esercizi.";return;}
  box.innerHTML="";
  day.exercises.forEach(ex=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`
      <div class="itemTop">
        <div class="itemTitle">${escapeHTML(ex.ex)}</div>
        <div class="badge">${escapeHTML(ex.sets)} × ${escapeHTML(ex.repMin)}-${escapeHTML(ex.repMax)}</div>
      </div>
      <div class="muted small">Recupero: ${escapeHTML(ex.rest)}</div>`;
    box.appendChild(div);
  });
}
$("daySelect")?.addEventListener("change", renderDayPreview);

/* ================= SESSION ================= */
let timer={running:false,remaining:0,endAt:0,interval:null};
function persistTimer(){
  state.ui.restTimer={sessionId:state.activeSessionId,running:timer.running,
    remaining:timer.remaining,endAt:timer.running?timer.endAt:0};
  saveState();
}
function timerTick(){
  if(timer.running) timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
  const label=$("timerTime"); if(label) label.textContent=fmtMMSS(timer.remaining);
  if(timer.running && timer.remaining===0){
    timerStop(); persistTimer();
    toast("Recupero terminato");
    if(navigator.vibrate) navigator.vibrate([180,100,180]);
  }
}
function timerSet(seconds){
  timer.remaining=Math.max(0,Math.floor(seconds));
  timerTick(); persistTimer();
}
function timerStop(){
  if(timer.running) timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
  timer.running=false; timer.endAt=0;
  clearInterval(timer.interval); timer.interval=null; timerTick(); persistTimer();
}
function timerStart(){
  if(timer.running||timer.remaining<=0) return;
  timer.running=true; timer.endAt=Date.now()+timer.remaining*1000;
  clearInterval(timer.interval);
  timer.interval=setInterval(timerTick,500);
  timerTick(); persistTimer();
}
function timerRestore(){
  const saved=state.ui.restTimer;
  if(!saved || sid(saved.sessionId)!==sid(state.activeSessionId)) return;
  timer.running=Boolean(saved.running); timer.remaining=Math.max(0,finiteNumber(saved.remaining));
  timer.endAt=finiteNumber(saved.endAt);
  if(timer.running){timer.interval=setInterval(timerTick,500);}
  timerTick();
}
function timerAutoFromExercise(){
  const s=activeSession(); if(!s) return;
  const it=s.items[state.activeExIndex];
  timerStop(); timerSet(parseRestToSeconds(it.target.rest)); timerStart();
}
document.addEventListener("visibilitychange",timerTick);
document.addEventListener("visibilitychange",()=>{if(document.hidden && activeSession()){syncCurrentSetInputs();persistSessionProgress();saveState();}});
window.addEventListener("pagehide",()=>{if(activeSession()){syncCurrentSetInputs();persistSessionProgress();saveState();}});

function openSessionUI(){
  $("session")?.classList.remove("hidden");
  document.body.classList.add("session-open");
  document.body.style.overflow="hidden";
  changeSessionEditing(false);
}
function closeSessionUI(){
  if(document.activeElement?.matches?.("#session input"))document.activeElement.blur();
  changeSessionEditing(false);
  $("session")?.classList.add("hidden");
  document.body.classList.remove("session-open");
  document.body.style.overflow="";
  timerTick();
}

function startSession(dayId){
  const plan = getActivePlan();
  if(!plan) return;
  const day = plan.days.find(d=>d.id===dayId);
  if(!day) return;
  if(!day.exercises?.length){ toast("Aggiungi un esercizio prima di iniziare"); return; }

  if(state.activeSessionId && !confirm("C'è già un allenamento aperto. Iniziarne un altro?")) return;
  timerStop(); timer.remaining=0;
  const session={
    id:uid(),
    ts: Date.now(),
    date:todayISO(),
    planName:plan.name,
    planId: plan.id,
    dayId:day.id,
    dayName:day.name,
    items:day.exercises.map(ex=>({
      ex:ex.ex,
      unit:ex.unit||"reps",
      target:{sets:ex.sets,repMin:ex.repMin,repMax:ex.repMax,rest:ex.rest},
      sets:Array.from({length:ex.sets},()=>({kg:"",reps:""}))
    })),
    closed:false
  };

  state.sessions.push(session);
  state.activeSessionId=session.id;
  state.activeExIndex=0;
  state.activeSetIndex=0;
  state.ui.sessionOpenId = session.id;

  // progress iniziale
  session.progressExIndex = 0;
  session.progressSetIndex = 0;

  saveState();
  refreshHomeSessionButton();

  openSessionUI();
  renderSession();
  toast("Sessione avviata");
}

function activeSession(){
  if(state.activeSessionId===null || state.activeSessionId===undefined) return null;
  return findSessionById(state.activeSessionId);
}

function syncCurrentSetInputs(){
  const s=activeSession();if(!s)return;
  const it=s.items?.[state.activeExIndex];if(!it)return;
  const table=$("singleSetBox");
  const inputs=table?.querySelectorAll("[data-set-field][data-set-index]")||[];
  if(inputs.length){
    inputs.forEach(input=>{
      const idx=Number(input.dataset.setIndex),field=input.dataset.setField;
      if(it.sets[idx] && (field==="kg"||field==="reps"))it.sets[idx][field]=input.value;
    });
  }else{
    const st=it.sets?.[state.activeSetIndex];if(!st)return;
    if($("inKg"))st.kg=$("inKg").value;
    if($("inReps"))st.reps=$("inReps").value;
  }
}

function lastExerciseSets(exName){
  const current=sid(state.activeSessionId),name=normName(exName);
  const sessions=[...state.sessions].filter(s=>sid(s.id)!==current)
    .sort((a,b)=>(b.ts||0)-(a.ts||0));
  for(const session of sessions){
    const item=session.items?.find(it=>normName(it.ex)===name && it.sets?.some(x=>String(x.reps??"").trim()));
    if(item)return item.sets;
  }
  return [];
}
function setRowIsDone(row){
  return String(row?.reps??"").trim()!=="" && Number(row.reps)>0;
}
function updateSessionRowUI(index){
  const s=activeSession(),it=s?.items?.[state.activeExIndex];if(!it)return;
  const body=$("singleSetBox");
  body?.querySelectorAll("[data-set-row]").forEach(row=>{
    const i=Number(row.dataset.setRow);
    const done=setRowIsDone(it.sets[i]);
    row.classList.toggle("active",i===state.activeSetIndex);
    row.classList.toggle("done",done);
    const status=row.querySelector(".seriesStatus");
    if(status)status.textContent=done?"✓":"○";
  });
  const heading=body?.querySelector("[data-series-heading]");
  if(heading)heading.textContent=`Serie ${state.activeSetIndex+1} di ${it.sets.length}`;
  const count=body?.querySelector("[data-sets-completed]");
  if(count)count.textContent=`${it.sets.filter(setRowIsDone).length}/${it.sets.length} completate`;
  const fill=body?.querySelector(".quickSetFill");if(fill)fill.style.width=`${it.sets.length?Math.round(it.sets.filter(setRowIsDone).length/it.sets.length*100):0}%`;
  const counter=body?.querySelector(".quickSetTools span");if(counter)counter.textContent=`${it.sets.filter(setRowIsDone).length}/${it.sets.length} serie`;
  if($("btnPrevSet"))$("btnPrevSet").disabled=state.activeSetIndex===0;
  if($("btnNextSet"))$("btnNextSet").disabled=state.activeSetIndex===it.sets.length-1;
}

let lastQuickSet=null;
function quickCompleteSet(index){
 const session=activeSession(),item=session?.items?.[state.activeExIndex],row=item?.sets?.[index];if(!row)return;
 syncCurrentSetInputs();
 const previous=lastExerciseSets(item.ex)?.[index]||{};
 const reps=String(row.reps??"").trim()||String(previous.reps??"").trim();
 if(!Number.isInteger(Number(reps))||Number(reps)<=0){toast("Inserisci le ripetizioni prima di completare");return;}
 const kg=String(row.kg??"").trim()||String(previous.kg??"").trim();
 if(kg && (!Number.isFinite(toNum(kg))||toNum(kg)<0)){toast("Carico non valido");return;}
 lastQuickSet={sessionId:session.id,exIndex:state.activeExIndex,setIndex:index,before:clone(row)};
 row.reps=reps;row.kg=kg;state.activeSetIndex=index;
 persistSessionProgress();saveState();renderSession();toast(`Serie ${index+1} completata`);
}
function undoQuickSet(){
 const record=lastQuickSet,s=activeSession();
 if(!record||!s||record.sessionId!==s.id){toast("Nessuna operazione da annullare");return;}
 const target=s.items?.[record.exIndex]?.sets?.[record.setIndex];if(!target){lastQuickSet=null;return;}
 Object.assign(target,record.before);state.activeExIndex=record.exIndex;state.activeSetIndex=record.setIndex;
 lastQuickSet=null;persistSessionProgress();saveState();renderSession();toast("Ultima serie ripristinata");
}
function persistSessionProgress(){
  const s = activeSession(); if(!s) return;
  s.progressExIndex = state.activeExIndex;
  s.progressSetIndex = state.activeSetIndex;
}

function renderSingleSet(){
  const s=activeSession();if(!s)return;
  const it=s.items[state.activeExIndex],idx=state.activeSetIndex;
  const hist=getExerciseLastBest(it.ex),line=fmtHistoryLine(hist);
  const sug=suggestNextTarget(it.ex,it.target),prev=lastExerciseSets(it.ex);
  const fmt=v=>String(v??"").trim();
  const completed=it.sets.filter(setRowIsDone).length;
  const rows=it.sets.map((set,n)=>{
    const was=prev[n]||{};
    const prevText=(fmt(was.kg)||fmt(was.reps))?`Ultima: ${escapeHTML(fmt(was.kg)||"—")} kg × ${escapeHTML(fmt(was.reps)||"—")}`:"";
    const hintKg=(n===0&&sug?.kgSuggested!=null)?String(sug.kgSuggested.toFixed(1)).replace(/\.0$/,''):fmt(was.kg);
    return `<div class="seriesTableRow ${n===idx?"active":""} ${setRowIsDone(set)?"done":""}" data-set-row="${n}">
      <button class="seriesIndex" type="button" data-go-set="${n}" aria-label="Seleziona serie ${n+1}"><b>${n+1}</b><span class="seriesStatus">${setRowIsDone(set)?"✓":"○"}</span></button>
      <label class="seriesCell"><span class="srOnly">Kg serie ${n+1}</span><input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" data-set-index="${n}" data-set-field="kg" value="${escapeHTML(set.kg)}" placeholder="${escapeHTML(hintKg||"Kg")}" aria-label="Kg serie ${n+1}"></label>
      <label class="seriesCell"><span class="srOnly">Ripetizioni serie ${n+1}</span><input type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" data-set-index="${n}" data-set-field="reps" value="${escapeHTML(set.reps)}" placeholder="${escapeHTML(fmt(was.reps)||"Rip.")}" aria-label="Ripetizioni serie ${n+1}"></label>
      <button class="seriesRowButton" type="button" data-quick-set="${n}" aria-label="Completa rapidamente serie ${n+1}">✓</button>
      ${prevText?`<div class="seriesPrevious">${prevText}</div>`:""}
    </div>`;
  }).join("");
  $("singleSetBox").innerHTML=`<div class="singleCard setsTableCard">
    <div class="singleTop"><div><div class="singleTitle" data-series-heading>Serie ${idx+1} di ${it.sets.length}</div><small class="muted" data-sets-completed>${completed}/${it.sets.length} completate</small></div><div class="badge">${s.closed?"CHIUSA":"ATTIVA"}</div></div>
    <div class="setEditingTools"><span>Inserisci i valori e tocca ✓ per completare rapidamente.</span><button type="button" class="btn" data-done-set-editing>✓ Fine</button></div>
    <div class="quickSetTools"><div class="quickSetTrack"><div class="quickSetFill" style="width:${it.sets.length?Math.round(completed/it.sets.length*100):0}%"></div></div><span>${completed}/${it.sets.length} serie</span><button class="btn" type="button" data-undo-quick ${lastQuickSet?.sessionId===s.id?"":"disabled"}>Annulla</button></div>
    <div class="seriesTableHeader"><span>SERIE</span><span>KG</span><span>RIP.</span><span></span></div>
    <div class="seriesTable">${rows}</div>
    <div class="singleTarget">Obiettivo: ${escapeHTML(it.target.repMin)}–${escapeHTML(it.target.repMax)} rip.</div>
    ${sug?`<div class="suggestionBox"><span>Carico proposto: <strong>${escapeHTML(sug.kgSuggested.toFixed(1).replace(".0",""))} kg</strong></span><button class="btn" type="button" data-use-suggestion>Usa</button></div>`:""}
    ${(line||sug?.message)?`<details class="setAdvice"><summary>Prestazioni precedenti e progressione</summary>${line?`<p>${escapeHTML(line)}</p>`:""}${sug?.message?`<p>${escapeHTML(sug.message)}</p>`:""}</details>`:""}
    <div class="autoSaveMessage" aria-live="polite">Le modifiche vengono salvate automaticamente.</div>
  </div>`;
}

function renderSession(){
  const s=activeSession();
  if(!s) return closeSessionUI();

  $("sessionDay").textContent=s.dayName;
  $("sessionDate").textContent=displayDate(s.date);

  const it=s.items[state.activeExIndex];
  if(!it){ toast("La sessione non contiene esercizi"); closeSessionUI(); return; }
  $("exName").textContent=it.ex;

  const t=it.target;
  const hist = getExerciseLastBest(it.ex);
  const histLine = fmtHistoryLine(hist);

  const sug = suggestNextTarget(it.ex, it.target);
  const sugShort = sug ? `Suggerito: ${sug.kgSuggested.toFixed(1).replace(".0","")}kg` : "";

  $("exTarget").textContent =
    `${t.sets} serie · ${t.repMin}–${t.repMax} rip. · Recupero ${t.rest}`;

  // Evita di riarmare un timer terminato; all'inizio mostra il recupero dell'esercizio.
  if(!state.ui.restTimer || sid(state.ui.restTimer.sessionId)!==sid(s.id)){
    timerSet(parseRestToSeconds(it.target.rest));
  }
  timerTick();

  // tasto “Chiudi” diventa toggle: Chiudi/Riapri
  const btnFinish = $("btnSessionFinish");
  if (btnFinish){
    btnFinish.textContent = s.closed ? "Riapri" : "Chiudi";
  }

  renderSingleSet();
  const picker=$("singleSetBox")?.querySelector(".setPicker");
  const selected=picker?.querySelector(".setChip.active");
  if(picker && selected){
    picker.scrollLeft=Math.max(0, selected.offsetLeft-picker.offsetLeft-(picker.clientWidth-selected.clientWidth)/2);
  }
  const sCount=it.sets.length;
  if($("btnPrevSet"))$("btnPrevSet").disabled=state.activeSetIndex===0;
  if($("btnNextSet"))$("btnNextSet").disabled=state.activeSetIndex===sCount-1;
}

function saveSetAndAutoTimer(){
  syncCurrentSetInputs();
  persistSessionProgress();
  const s=activeSession(); if(!s) return;
  const it=s.items[state.activeExIndex];
  const idx=state.activeSetIndex;
  const st=it.sets[idx];

  if(!Number.isInteger(Number(st.reps)) || !(Number(st.reps)>0) || !String(st.reps).trim()){
    toast("Inserisci ripetizioni valide"); return;
  }
  if(String(st.kg).trim() && (!Number.isFinite(toNum(st.kg)) || toNum(st.kg)<0)){
    toast("Controlla il carico in kg"); return;
  }
  lastQuickSet=null;
  saveState();
  timerAutoFromExercise();
  if(idx < it.sets.length-1){
    state.activeSetIndex=idx+1;
  }else if(state.activeExIndex<s.items.length-1){
    state.activeExIndex++; state.activeSetIndex=0;
  }
  persistSessionProgress(); saveState(); renderSession();
  toast(`Serie ${idx+1} salvata`);
}

function goToSet(index){
  const s=activeSession();if(!s)return;
  const sets=s.items?.[state.activeExIndex]?.sets||[];
  if(!Number.isInteger(index)||index<0||index>=sets.length)return;
  syncCurrentSetInputs();
  state.activeSetIndex=index;
  persistSessionProgress();saveState();renderSession();
}
function nextSet(){
  const s=activeSession();if(!s)return;
  if(state.activeSetIndex < (s.items?.[state.activeExIndex]?.sets?.length||0)-1)goToSet(state.activeSetIndex+1);
  else toast("Ultima serie dell'esercizio");
}
function prevSet(){
  if(state.activeSetIndex>0)goToSet(state.activeSetIndex-1);
  else toast("Prima serie dell'esercizio");
}
$("singleSetBox")?.addEventListener("focusin",e=>{
  const input=e.target.closest("[data-set-field][data-set-index]");if(!input)return;
  state.activeSetIndex=Number(input.dataset.setIndex);
  persistSessionProgress();saveState();updateSessionRowUI(state.activeSetIndex);
});
$("singleSetBox")?.addEventListener("input",e=>{
  const input=e.target.closest("[data-set-field][data-set-index]");if(!input)return;
  const session=activeSession(),item=session?.items?.[state.activeExIndex];if(!item)return;
  const idx=Number(input.dataset.setIndex),field=input.dataset.setField;
  if(!item.sets[idx]||!["kg","reps"].includes(field))return;
  item.sets[idx][field]=input.value;
  state.activeSetIndex=idx;
  persistSessionProgress();
  lastQuickSet=null;
  saveState(); // ogni input e' una bozza persistente; nessun valore viene inventato
  updateSessionRowUI(idx);
});
$("singleSetBox")?.addEventListener("keydown",e=>{
  if(e.key!=="Enter" || !e.target.matches("[data-set-field]"))return;
  e.preventDefault();syncCurrentSetInputs();saveState();e.target.blur();changeSessionEditing(false);
});
$("singleSetBox")?.addEventListener("click",e=>{
  const quick=e.target.closest("[data-quick-set]");if(quick){quickCompleteSet(Number(quick.dataset.quickSet));return;}
  if(e.target.closest("[data-undo-quick]")){undoQuickSet();return;}
  if(e.target.closest("[data-done-set-editing]")){
    syncCurrentSetInputs();saveState();
    if(document.activeElement?.matches?.("#session [data-set-field]"))document.activeElement.blur();
    changeSessionEditing(false);toast("Valori conservati");return;
  }
  if(e.target.closest("[data-use-suggestion]")){
    const s=activeSession();if(!s)return;
    const it=s.items[state.activeExIndex];
    const suggestion=suggestNextTarget(it.ex,it.target);if(!suggestion)return;
    const value=suggestion.kgSuggested.toFixed(1).replace(".0","");
    const idx=state.activeSetIndex;
    const input=$("singleSetBox")?.querySelector(`[data-set-index="${idx}"][data-set-field="kg"]`);
    if(input){input.value=value;it.sets[idx].kg=value;saveState();toast(`Proposti ${value} kg sulla serie ${idx+1}`);}
    return;
  }
  const btn=e.target.closest("[data-go-set]");if(btn)goToSet(Number(btn.dataset.goSet));
});

function nextExercise(){
  lastQuickSet=null;
  syncCurrentSetInputs();
  persistSessionProgress();
  const s=activeSession(); if(!s) return;
  if(state.activeExIndex < s.items.length-1){
    state.activeExIndex++;
    state.activeSetIndex=0;
    persistSessionProgress();
    saveState();
    timerStop();
    timerSet(parseRestToSeconds(s.items[state.activeExIndex].target.rest));
    renderSession();
  } else toast("Ultimo esercizio");
}
function prevExercise(){
  lastQuickSet=null;
  syncCurrentSetInputs();
  persistSessionProgress();
  const s=activeSession(); if(!s) return;
  if(state.activeExIndex>0){
    state.activeExIndex--;
    state.activeSetIndex=0;
    persistSessionProgress();
    saveState();
    timerStop();
    timerSet(parseRestToSeconds(s.items[state.activeExIndex].target.rest));
    renderSession();
  }
}

/* session buttons */
$("btnSaveSet")?.addEventListener("click", saveSetAndAutoTimer);
$("btnNextSet")?.addEventListener("click", nextSet);
$("btnPrevSet")?.addEventListener("click", prevSet);
$("btnNextExercise")?.addEventListener("click", nextExercise);
$("btnNextEx")?.addEventListener("click", nextExercise);
$("btnPrevEx")?.addEventListener("click", prevExercise);

$("btnSessionExit")?.addEventListener("click", ()=>{
  syncCurrentSetInputs();
  persistSessionProgress();
  saveState();
  closeSessionUI();
  refreshHomeSessionButton();
  toast("Allenamento salvato: puoi riprendere da Home");
});

// ✅ Toggle Chiusa/Riapri (ma la sessione resta modificabile)
$("btnSessionFinish")?.addEventListener("click", ()=>{
  syncCurrentSetInputs();
  persistSessionProgress();

  const s=activeSession(); if(!s) return;
  s.closed = !s.closed;

  if(s.closed){
    timerStop(); state.ui.restTimer=null;
    // sessione conclusa: libera la sessione attiva (resta nello storico)
    state.activeSessionId = null;
    state.ui.sessionOpenId = null;
    state.activeExIndex = 0;
    state.activeSetIndex = 0;
    saveState();
    closeSessionUI();
    refreshHomeSessionButton();
    renderHistory();
    toast("Sessione chiusa e salvata");
    return;
  } else {
    // riaperta: torna attiva
    state.activeSessionId = s.id;
    state.ui.sessionOpenId = s.id;
  }

  saveState();
  refreshHomeSessionButton();
  renderSession();
  renderHistory();
});


$("btnTimerStart")?.addEventListener("click", timerStart);
$("btnTimerPause")?.addEventListener("click", ()=>{ timerStop(); toast("Timer in pausa"); });
$("btnTimerSkip")?.addEventListener("click", ()=>{ timerStop(); timerSet(0); toast("Recupero saltato"); });

/* =================== LIBRERIA SCHEDE + EDITOR =================== */
function renderPlansList(){
  const box = $("plansList"); if(!box) return;
  box.innerHTML = "";
  if (!state.plans.length){
    box.innerHTML = `<div class="muted">Nessuna scheda. Clicca “Nuova scheda”.</div>`;
    return;
  }
  state.plans.forEach(p=>{
    const div=document.createElement("div");
    div.className="item";
    const isActive = p.id === state.activePlanId;
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHTML(p.name)} ${isActive ? "• (attiva)" : ""}</div>
        <div class="badge">${p.days.length} giorni</div>
      </div>
      <div class="miniActions">
        <button class="iconBtn primary" data-plan-use="${escapeHTML(p.id)}">Usa</button>
        <button class="iconBtn" data-plan-edit="${escapeHTML(p.id)}">Modifica</button>
        <button class="iconBtn" data-plan-dup="${escapeHTML(p.id)}">Duplica</button>
        <button class="iconBtn danger" data-plan-del="${escapeHTML(p.id)}">Elimina</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function openPlans(){
  renderPlansList();
  setView("plans");
}

function planEditing(){
  return state.plans.find(p=>p.id===state.ui.planEditId) || null;
}
function planDayById(plan, id){
  return plan.days.find(d=>d.id===id) || null;
}

function openPlanEditor(planId){
  const p = state.plans.find(x=>x.id===planId);
  if(!p) return;

  state.ui.planEditId = p.id;
  state.ui.planEditDayId = p.days[0]?.id || null;
  delete state.ui.editExerciseIndex;
  $("btnAddExercise").textContent="Aggiungi esercizio";
  saveState();

  $("planEditTitle").textContent = `Editor Scheda: ${p.name}`;
  $("planName").value = p.name;
  $("newDayName").value = "";

  populatePlanDaySelect();
  renderPlanDaysList();
  renderPlanExercisesList();
  setView("planedit");
}

function populatePlanDaySelect(){
  const sel = $("planDaySelect");
  const plan = planEditing();
  if(!sel || !plan) return;
  sel.innerHTML = "";
  plan.days.forEach(d=>{
    const o=document.createElement("option");
    o.value=d.id; o.textContent = (d.weekday!==undefined ? (weekdayLabel(d.weekday)+" — ") : "") + d.name;
    sel.appendChild(o);
  });
  sel.value = state.ui.planEditDayId || (plan.days[0]?.id || "");
}

function renderPlanDaysList(){
  const box = $("planDaysList");
  const plan = planEditing();
  if(!box || !plan) return;
  box.innerHTML = "";
  plan.days.forEach((d)=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHTML((d.weekday!==undefined? (weekdayLabel(d.weekday)+" — "):"") + d.name)}</div>
        <div class="badge">${d.exercises.length} esercizi</div>
      </div>
      <div class="miniActions">
        <button class="iconBtn primary" data-peday-select="${escapeHTML(d.id)}">Seleziona</button>
        <button class="iconBtn" data-peday-up="${escapeHTML(d.id)}">↑</button>
        <button class="iconBtn" data-peday-down="${escapeHTML(d.id)}">↓</button>
        <button class="iconBtn danger" data-peday-del="${escapeHTML(d.id)}">Elimina</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function renderPlanExercisesList(){
  const box = $("planExercisesList");
  const plan = planEditing();
  if(!box || !plan) return;

  const dayId = $("planDaySelect")?.value || state.ui.planEditDayId;
  const day = planDayById(plan, dayId);
  if(!day){
    box.innerHTML = `<div class="muted">Seleziona un giorno.</div>`;
    return;
  }
  state.ui.planEditDayId = day.id;
  saveState();

  box.innerHTML = "";
  if(!day.exercises.length){
    box.innerHTML = `<div class="muted">Nessun esercizio. Aggiungine uno sopra.</div>`;
    return;
  }

  day.exercises.forEach((ex,idx)=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${idx+1}. ${escapeHTML(ex.ex)}</div>
        <div class="badge">${escapeHTML(ex.sets)}x ${escapeHTML(ex.repMin)}-${escapeHTML(ex.repMax)} • ${escapeHTML(ex.rest)}</div>
      </div>
      <div class="miniActions">
        <button class="iconBtn" data-peex-edit="${idx}">Modifica</button>
        <button class="iconBtn" data-peex-up="${idx}">↑</button>
        <button class="iconBtn" data-peex-down="${idx}">↓</button>
        <button class="iconBtn danger" data-peex-del="${idx}">Elimina</button>
      </div>
    `;
    box.appendChild(div);
  });
}

document.addEventListener("click",(e)=>{
  const use = e.target.closest("[data-plan-use]");
  const edit = e.target.closest("[data-plan-edit]");
  const dup = e.target.closest("[data-plan-dup]");
  const del = e.target.closest("[data-plan-del]");

  if(use){
    state.activePlanId = use.dataset.planUse;
    saveState();
    populateActivePlanSelect();
    populateDays();
    renderDayPreview();
    homeRefresh();
    renderPlansList();
    toast("Scheda impostata");
  }
  if(edit) openPlanEditor(edit.dataset.planEdit);

  if(dup){
    const p = state.plans.find(x=>x.id===dup.dataset.planDup);
    if(!p) return;
    const c = clone(p);
    c.id = uid().slice(0,8);
    c.name = `${p.name} (copia)`;
    state.plans.push(c);
    saveState();
    renderPlansList();
    populateActivePlanSelect();
    toast("Scheda duplicata");
  }

  if(del){
    const id = del.dataset.planDel;
    if(!confirm("Eliminare questa scheda?")) return;
    const idx = state.plans.findIndex(x=>x.id===id);
    if(idx>=0) state.plans.splice(idx,1);
    if(state.activePlanId===id) state.activePlanId = state.plans[0]?.id || null;
    saveState();
    renderPlansList();
    populateActivePlanSelect();
    populateDays();
    renderDayPreview();
    homeRefresh();
    toast("Scheda eliminata");
  }

  const plan = planEditing();
  if(!plan) return;

  const sel = e.target.closest("[data-peday-select]");
  const up  = e.target.closest("[data-peday-up]");
  const dn  = e.target.closest("[data-peday-down]");
  const ddel = e.target.closest("[data-peday-del]");

  if(sel){
    state.ui.planEditDayId = sel.dataset.pedaySelect;
    saveState();
    populatePlanDaySelect();
    renderPlanExercisesList();
    toast("Giorno selezionato");
  }
  if(up||dn||ddel){
    const id2 = (up?.dataset.pedayUp) || (dn?.dataset.pedayDown) || (ddel?.dataset.pedayDel);
    const i = plan.days.findIndex(d=>d.id===id2);
    if(i<0) return;
    if(up) moveItem(plan.days, i, i-1);
    if(dn) moveItem(plan.days, i, i+1);
    if(ddel){
      if(!confirm("Eliminare il giorno?")) return;
      plan.days.splice(i,1);
      if(state.ui.planEditDayId===id2) state.ui.planEditDayId = plan.days[0]?.id || null;
    }
    saveState();
    populatePlanDaySelect();
    renderPlanDaysList();
    renderPlanExercisesList();
    populateDays(); renderDayPreview();
  }

  const exEdit = e.target.closest("[data-peex-edit]");
  if(exEdit){
    const day=planDayById(plan, $("planDaySelect").value);
    const idx=Number(exEdit.dataset.peexEdit), ex=day?.exercises[idx];
    if(ex){state.ui.editExerciseIndex=idx;
      $("exNameIn").value=ex.ex; $("exSetsIn").value=ex.sets;
      $("exRepMinIn").value=ex.repMin; $("exRepMaxIn").value=ex.repMax;
      $("exRestIn").value=ex.rest; $("btnAddExercise").textContent="Salva esercizio";
      $("exNameIn").focus();
    }
  }
  const exUp = e.target.closest("[data-peex-up]");
  const exDn = e.target.closest("[data-peex-down]");
  const exDel = e.target.closest("[data-peex-del]");
  if(exUp||exDn||exDel){
    const day = planDayById(plan, $("planDaySelect").value);
    if(!day) return;
    const idx = Number(exUp?.dataset.peexUp || exDn?.dataset.peexDown || exDel?.dataset.peexDel);
    if(exUp) moveItem(day.exercises, idx, idx-1);
    if(exDn) moveItem(day.exercises, idx, idx+1);
    if(exDel){
      if(!confirm("Eliminare esercizio?")) return;
      day.exercises.splice(idx,1);
    }
    saveState();
    renderPlanExercisesList();
    populateDays(); renderDayPreview();
  }
});

$("btnPlanSaveName")?.addEventListener("click", ()=>{
  const plan = planEditing(); if(!plan) return;
  plan.name = $("planName").value.trim() || "Scheda";
  saveState();
  populateActivePlanSelect();
  renderPlansList();
  $("planEditTitle").textContent = `Editor Scheda: ${plan.name}`;
  homeRefresh();
  toast("Nome salvato");
});

$("btnAddDay")?.addEventListener("click", ()=>{
  const plan = planEditing(); if(!plan) return;
  const name = $("newDayName").value.trim();
  if(!name){ toast("Inserisci nome giorno"); return; }

  const wSel = $("newDayWeekday");
  const weekday = wSel ? Number(wSel.value) : undefined;

  const id = uid().slice(0,6);
  plan.days.push({ id, name, weekday, exercises: [] });
  state.ui.planEditDayId = id;
  saveState();
  $("newDayName").value="";
  populatePlanDaySelect();
  renderPlanDaysList();
  renderPlanExercisesList();
  populateDays(); renderDayPreview();
  toast("Giorno aggiunto");
});

$("planDaySelect")?.addEventListener("change", ()=>{
  state.ui.planEditDayId = $("planDaySelect").value;
  saveState();
  renderPlanExercisesList();
});

$("btnAddExercise")?.addEventListener("click", ()=>{
  const plan = planEditing(); if(!plan) return;
  const day = planDayById(plan, $("planDaySelect").value);
  if(!day){ toast("Seleziona un giorno"); return; }

  const ex = $("exNameIn").value.trim();
  if(!ex){ toast("Inserisci esercizio"); return; }

  const sets = Number($("exSetsIn").value||0);
  const repMin = Number($("exRepMinIn").value||0);
  const repMax = Number($("exRepMaxIn").value||0);
  const rest = $("exRestIn").value.trim() || "90";
  if(![sets,repMin,repMax].every(Number.isInteger) || !(sets>0 && repMin>0 && repMax>=repMin) ||
      !(parseRestToSeconds(rest)>=0)){ toast("Controlla serie, reps e recupero"); return; }

  const idx=state.ui.editExerciseIndex;
  if(Number.isInteger(idx) && day.exercises[idx]) day.exercises[idx]={ ex, sets, repMin, repMax, rest };
  else day.exercises.push({ ex, sets, repMin, repMax, rest });
  delete state.ui.editExerciseIndex;
  $("btnAddExercise").textContent="Aggiungi esercizio";
  saveState();
  $("exNameIn").value="";
  renderPlanExercisesList();
  populateDays(); renderDayPreview();
  toast("Esercizio aggiunto");
});

$("btnDuplicateDay")?.addEventListener("click", ()=>{
  const plan = planEditing(); if(!plan) return;
  const day = planDayById(plan, $("planDaySelect").value);
  if(!day){ toast("Seleziona un giorno"); return; }
  const c = clone(day);
  c.id = uid().slice(0,6);
  c.name = day.name + " (copia)";
  plan.days.push(c);
  state.ui.planEditDayId = c.id;
  saveState();
  populatePlanDaySelect();
  renderPlanDaysList();
  renderPlanExercisesList();
  toast("Giorno duplicato");
});

$("btnPlanDelete")?.addEventListener("click", ()=>{
  const plan = planEditing(); if(!plan) return;
  if(!confirm("Eliminare questa scheda?")) return;
  const id = plan.id;
  const idx = state.plans.findIndex(p=>p.id===id);
  if(idx>=0) state.plans.splice(idx,1);
  if(state.activePlanId===id) state.activePlanId = state.plans[0]?.id || null;
  state.ui.planEditId = null;
  state.ui.planEditDayId = null;
  saveState();
  populateActivePlanSelect();
  populateDays(); renderDayPreview(); homeRefresh();
  openPlans();
  toast("Scheda eliminata");
});

/* =================== LIBRERIA DIETE + EDITOR =================== */
function renderDietsList(){
  const box = $("dietsList"); if(!box) return;
  box.innerHTML = "";
  if (!state.diets.length){
    box.innerHTML = `<div class="muted">Nessuna dieta. Clicca “Nuova dieta”.</div>`;
    return;
  }
  state.diets.forEach(d=>{
    const div=document.createElement("div");
    div.className="item";
    const isActive = d.id === state.activeDietId;
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHTML(d.name)} ${isActive ? "• (attiva)" : ""}</div>
        <div class="badge">7 giorni</div>
      </div>
      <div class="miniActions">
        <button class="iconBtn primary" data-diet-use="${escapeHTML(d.id)}">Usa</button>
        <button class="iconBtn" data-diet-edit="${escapeHTML(d.id)}">Modifica</button>
        <button class="iconBtn" data-diet-dup="${escapeHTML(d.id)}">Duplica</button>
        <button class="iconBtn danger" data-diet-del="${escapeHTML(d.id)}">Elimina</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function openDiets(){
  renderDietsList();
  setView("diets");
}

function dietEditing(){ return state.diets.find(d=>d.id===state.ui.dietEditId) || null; }

function populateDietEditDays(){
  const sel = $("dietEditDaySelect"); if(!sel) return;
  sel.innerHTML = "";
  const labels=["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
  for(let i=0;i<7;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=labels[i];
    sel.appendChild(o);
  }
  sel.value = String(state.ui.dietEditDayIndex || 0);
}
function populateDietMealSelect(diet){
  const sel=$("dietEditMealSelect");
  if(!sel || !diet) return;
  const current=String(state.ui.dietEditMeal || sel.value || 1);
  sel.innerHTML="";
  getDietMealKeys(diet).forEach(key=>{
    const o=document.createElement("option");
    o.value=key;
    o.textContent=getMealLabel(diet,key);
    sel.appendChild(o);
  });
  sel.value=getDietMealKeys(diet).includes(current)?current:getDietMealKeys(diet)[0];
}
function syncMealNameEditor(){
  const d=dietEditing();
  const input=$("dietMealName");
  if(!d || !input) return;
  const key=String($("dietEditMealSelect")?.value || state.ui.dietEditMeal || 1);
  input.value=getMealLabel(d,key);
  state.ui.dietEditMealNameDirty=false;
}

function renderDietFoodsList(){
  const d = dietEditing();
  const box = $("dietFoodsList");
  if(!d || !box) return;

  const di = Number($("dietEditDaySelect").value);
  const mi = Number($("dietEditMealSelect").value);

  state.ui.dietEditDayIndex = di;
  state.ui.dietEditMeal = mi;
  saveState();
  syncMealNameEditor();

  const items = d.week[di].meals[mi] || [];
  box.innerHTML = "";

  if(!items.length){
    box.innerHTML = `<div class="muted">Nessun alimento in questo pasto. Aggiungine uno sopra.</div>`;
    return;
  }

  items.forEach((it, idx)=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML = `
      <div class="itemTop">
        <div class="itemTitle">${escapeHTML(it.food)}</div>
        <div class="badge">${escapeHTML(it.qty)} ${escapeHTML(it.unit)}</div>
      </div>
      <div class="miniActions">
        <button class="iconBtn" data-food-edit="${idx}">Modifica</button>
        <button class="iconBtn" data-food-up="${idx}">↑</button>
        <button class="iconBtn" data-food-down="${idx}">↓</button>
        <button class="iconBtn danger" data-food-del="${idx}">Elimina</button>
      </div>
    `;
    box.appendChild(div);
  });
}

function openDietEditor(dietId){
  const d = state.diets.find(x=>x.id===dietId);
  if(!d) return;

  state.ui.dietEditId = d.id;
  delete state.ui.editFoodIndex;
  $("btnAddFood").textContent="Aggiungi";
  saveState();

  $("dietEditTitle").textContent = `Editor Dieta: ${d.name}`;
  $("dietName").value = d.name;

  populateDietEditDays();
  populateDietMealSelect(d);
  $("dietEditMealSelect").value = String(state.ui.dietEditMeal || 1);
  syncMealNameEditor();
  renderDietFoodsList();
  setView("dietedit");
}

document.addEventListener("click",(e)=>{
  const use = e.target.closest("[data-diet-use]");
  const edit = e.target.closest("[data-diet-edit]");
  const dup = e.target.closest("[data-diet-dup]");
  const del = e.target.closest("[data-diet-del]");

  if(use){
    state.activeDietId = use.dataset.dietUse;
    saveState();
    populateActiveDietSelect();
    renderDietPreview();
    renderDietsList();
    toast("Dieta impostata");
  }
  if(edit) openDietEditor(edit.dataset.dietEdit);

  if(dup){
    const d = state.diets.find(x=>x.id===dup.dataset.dietDup);
    if(!d) return;
    const c = clone(d);
    c.id = uid().slice(0,8);
    c.name = `${d.name} (copia)`;
    state.diets.push(c);
    saveState();
    renderDietsList();
    populateActiveDietSelect();
    toast("Dieta duplicata");
  }

  if(del){
    const id = del.dataset.dietDel;
    if(!confirm("Eliminare questa dieta?")) return;
    const idx = state.diets.findIndex(x=>x.id===id);
    if(idx>=0) state.diets.splice(idx,1);
    if(state.activeDietId===id) state.activeDietId = state.diets[0]?.id || null;
    saveState();
    renderDietsList();
    populateActiveDietSelect();
    renderDietPreview();
    toast("Dieta eliminata");
  }

  const d = dietEditing();
  if(!d) return;

  const foodEdit=e.target.closest("[data-food-edit]");
  if(foodEdit){
    const di=Number($("dietEditDaySelect").value), mi=Number($("dietEditMealSelect").value);
    const idx=Number(foodEdit.dataset.foodEdit), food=d.week[di]?.meals[mi]?.[idx];
    if(food){ state.ui.editFoodIndex=idx; $("foodNameIn").value=food.food;
      $("foodQtyIn").value=food.qty; $("foodUnitIn").value=food.unit;
      ["kcal","p","c","f"].forEach(k=>$("nutrient_"+k).value=food.nutrition?.[k]??"");
      $("nutrientSource").value=food.nutrition?.source||"";
      $("btnAddFood").textContent="Salva alimento"; $("foodNameIn").focus(); }
  }
  const up = e.target.closest("[data-food-up]");
  const dn = e.target.closest("[data-food-down]");
  const fdel = e.target.closest("[data-food-del]");
  if(up||dn||fdel){
    const di = Number($("dietEditDaySelect").value);
    const mi = Number($("dietEditMealSelect").value);
    const arr = d.week[di].meals[mi] || [];
    const idx = Number(up?.dataset.foodUp || dn?.dataset.foodDown || fdel?.dataset.foodDel);

    if(up) moveItem(arr, idx, idx-1);
    if(dn) moveItem(arr, idx, idx+1);
    if(fdel){
      if(!confirm("Eliminare alimento?")) return;
      arr.splice(idx,1);
    }
    d.week[di].meals[mi] = arr;
    saveState();
    renderDietFoodsList();
    renderDietPreview(); renderDietWeek();
  }
});

$("btnDietSaveName")?.addEventListener("click", ()=>{
  const d = dietEditing(); if(!d) return;
  d.name = $("dietName").value.trim() || "Dieta";
  saveState();
  populateActiveDietSelect();
  renderDietsList();
  $("dietEditTitle").textContent = `Editor Dieta: ${d.name}`;
  toast("Nome salvato");
});
function clearFoodEdit(){delete state.ui.editFoodIndex; const b=$("btnAddFood"); if(b)b.textContent="Aggiungi";
  ["foodNameIn","foodQtyIn","nutrient_kcal","nutrient_p","nutrient_c","nutrient_f","nutrientSource"].forEach(id=>{if($(id))$(id).value="";});}
$("dietEditDaySelect")?.addEventListener("change", ()=>{clearFoodEdit();renderDietFoodsList();});
$("dietEditMealSelect")?.addEventListener("change", ()=>{clearFoodEdit();syncMealNameEditor();renderDietFoodsList();});
$("dietMealName")?.addEventListener("input", ()=>{state.ui.dietEditMealNameDirty=true;});
$("btnDietSaveMealName")?.addEventListener("click", ()=>{
  const d=dietEditing(); if(!d) return;
  const key=String($("dietEditMealSelect")?.value || state.ui.dietEditMeal || 1);
  const value=$("dietMealName")?.value.trim();
  if(!value){toast("Inserisci il nome del pasto"); return;}
  ensureDietMealNames(d);
  d.mealNames[key]=value.slice(0,32);
  state.ui.dietEditMealNameDirty=false;
  saveState();
  populateDietMealSelect(d);
  $("dietEditMealSelect").value=key;
  syncMealNameEditor();
  renderDietFoodsList();
  renderDietPreview();
  renderDietWeek();
  toast("Nome pasto salvato");
});
$("btnDietResetMealNames")?.addEventListener("click", ()=>{
  const d=dietEditing(); if(!d) return;
  if(!confirm("Ripristinare i nomi standard dei pasti per questa dieta?")) return;
  d.mealNames={};
  ensureDietMealNames(d);
  saveState();
  populateDietMealSelect(d);
  syncMealNameEditor();
  renderDietFoodsList();
  renderDietPreview();
  renderDietWeek();
  toast("Nomi pasti ripristinati");
});

$("btnAddFood")?.addEventListener("click", ()=>{
  const d = dietEditing(); if(!d) return;
  const di = Number($("dietEditDaySelect").value);
  const mi = Number($("dietEditMealSelect").value);

  const food = $("foodNameIn").value.trim();
  const qty = Number($("foodQtyIn").value || 0);
  const unit = $("foodUnitIn").value;

  if(!food){ toast("Inserisci alimento"); return; }
  if(!Number.isFinite(qty) || !(qty>0)){ toast("Quantità non valida"); return; }

  const arr = d.week[di].meals[mi] || [];
  const idx=state.ui.editFoodIndex;
  const foodObj={food,qty,unit};
  const nutrientFields=["kcal","p","c","f"];
  const values=nutrientFields.map(k=>$("nutrient_"+k)?.value.trim()||"");
  const source=$("nutrientSource")?.value.trim()||"";
  if(values.some(Boolean) || source){
    if(!values.every(v=>v!=="" && Number.isFinite(Number(v)) && Number(v)>=0) || !source){
      toast("Completa i 4 nutrienti e la fonte, oppure svuotali tutti"); return;
    }
    foodObj.nutrition={kcal:+values[0],p:+values[1],c:+values[2],f:+values[3],
      basis:unit==="pz"?"pz":unit==="ml"?"100ml":"100g",source};
  }
  if(Number.isInteger(idx) && arr[idx]) arr[idx]={...arr[idx],...foodObj,nutrition:foodObj.nutrition};
  else arr.push(foodObj);
  delete state.ui.editFoodIndex;
  $("btnAddFood").textContent="Aggiungi";
  d.week[di].meals[mi] = arr;
  saveState();

  $("foodNameIn").value="";
  ["kcal","p","c","f"].forEach(k=>$("nutrient_"+k).value=""); $("nutrientSource").value="";
  renderDietFoodsList();
  renderDietPreview(); renderDietWeek();
  toast("Alimento salvato");
});

$("btnCopyDayToAll")?.addEventListener("click", ()=>{
  const d = dietEditing(); if(!d) return;
  const di = Number($("dietEditDaySelect").value);
  if(!confirm("Copiare questo giorno su tutti i giorni?")) return;
  const dayCopy = clone(d.week[di]);
  for(let i=0;i<7;i++) d.week[i] = clone(dayCopy);
  saveState();
  renderDietFoodsList();
  renderDietPreview();
  toast("Giorno copiato su tutti");
});

$("btnCopyMealToAllDays")?.addEventListener("click", ()=>{
  const d = dietEditing(); if(!d) return;
  const di = Number($("dietEditDaySelect").value);
  const mi = Number($("dietEditMealSelect").value);
  if(!confirm("Copiare questo pasto su tutti i giorni?")) return;
  const mealCopy = clone(d.week[di].meals[mi] || []);
  for(let i=0;i<7;i++) d.week[i].meals[mi] = clone(mealCopy);
  saveState();
  renderDietFoodsList();
  renderDietPreview();
  toast("Pasto copiato su tutti");
});

$("btnDietDelete")?.addEventListener("click", ()=>{
  const d = dietEditing(); if(!d) return;
  if(!confirm("Eliminare questa dieta?")) return;
  const id = d.id;
  const idx = state.diets.findIndex(x=>x.id===id);
  if(idx>=0) state.diets.splice(idx,1);
  if(state.activeDietId===id) state.activeDietId = state.diets[0]?.id || null;
  state.ui.dietEditId = null;
  saveState();
  populateActiveDietSelect();
  renderDietPreview();
  openDiets();
  toast("Dieta eliminata");
});

/* ---------------- diet preview ---------------- */
function populateDietDays(){
  const sel=$("dietDaySelect"); if(!sel) return;
  sel.innerHTML="";
  const labels=["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
  for(let i=0;i<7;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=labels[i];
    sel.appendChild(o);
  }
  sel.value = String((new Date().getDay()+6)%7);
}

function renderDietPreview(){
  const box=$("dietPreview"), daySel=$("dietDaySelect");
  const diet=getActiveDiet();
  if(!box||!daySel)return;
  box.replaceChildren();
  if(!diet){box.textContent="Crea una dieta per vedere i pasti.";return;}
  const dayIndex=Number(daySel.value||0), day=diet.week?.[dayIndex];
  if(!day){box.textContent="Giorno non disponibile.";return;}
  const date=dateForDietDay(dayIndex);
  const keys=getDietMealKeys(diet);
  const consumed=state.consumed[date]?.[diet.id]||{};
  const marked=keys.filter(k=>consumed[k]&&day.meals?.[k]?.length).length;
  const available=keys.filter(k=>day.meals?.[k]?.length).length;
  const heading=document.createElement("div");heading.className="dietDayHeading";
  heading.innerHTML=`<div><div class="eyebrow">REGISTRO ALIMENTARE</div><h3>${escapeHTML(displayDate(date))}</h3><p class="muted small">Tutti i pasti, senza filtri. Tocca quelli che hai consumato.</p></div><div class="mealCounter">${marked}<span>/${available}</span><small>consumati</small></div>`;
  box.appendChild(heading);
  for(const key of keys){
    const foods=day.meals?.[key]||[], eaten=Boolean(consumed[key]);
    const card=document.createElement("section");
    card.className="mealCard"+(eaten?" isConsumed":"");
    const list=foods.length?foods.map((f,foodIndex)=>`<li class="dietFoodRow"><span>${escapeHTML(f.food)}</span><label class="foodPortion"><span class="srOnly">Quantità ${escapeHTML(f.food)}</span><input type="number" inputmode="decimal" min="0.01" step="any" data-food-portion="${foodIndex}" data-meal-key="${escapeHTML(key)}" value="${escapeHTML(f.qty)}" aria-label="Quantità ${escapeHTML(f.food)}"><span>${escapeHTML(f.unit)}</span></label></li>`).join(""):
      '<li class="mealEmpty">Nessun alimento pianificato</li>';
    const label=getMealLabel(diet,key);
    card.innerHTML=`<div class="mealCardTop"><div><div class="mealNumber">${escapeHTML(mealHeading(diet,key))}</div><div class="mealStatus">${foods.length} ${foods.length===1?"alimento":"alimenti"}</div></div><button class="mealToggle ${eaten?"selected":""}" type="button" data-consume-meal="${escapeHTML(key)}" ${foods.length?"":"disabled"} aria-pressed="${eaten}" aria-label="${eaten?"Annulla consumato":"Segna consumato"} ${escapeHTML(label)}"><span class="mealToggleIcon">${eaten?"✓":"○"}</span><span>${eaten?"Consumato":"Segna consumato"}</span></button></div><ul class="mealFoods">${list}</ul><div class="mealCardActions"><button class="btn" type="button" data-open-meal-editor="${escapeHTML(key)}">Modifica pasto</button><button class="btn" type="button" data-copy-meal-tomorrow="${escapeHTML(key)}" ${foods.length?"":"disabled"}>Copia a domani</button><button class="btn" type="button" data-meal-favorite="${escapeHTML(key)}" ${foods.length?"":"disabled"}>☆ Preferito</button></div>`;
    box.appendChild(card);
  }
}

$("dietDaySelect")?.addEventListener("change",renderDietPreview);

/* ---------------- Calendario: date locali, nessuna modifica ai dati storici ---------------- */
let calendarCursor = (()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1,12)})();
let calendarSelected = todayISO();
function renderCalendar(){
  const grid=$("calendarGrid"),details=$("calendarDetails"),title=$("calendarTitle");
  if(!grid||!details||!title)return;
  const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth();
  title.textContent=calendarCursor.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
  const firstDay=(new Date(year,month,1,12).getDay()+6)%7;
  const days=new Date(year,month+1,0,12).getDate();
  grid.replaceChildren();
  ["L","M","M","G","V","S","D"].forEach(label=>{const el=document.createElement("span");el.className="calendarWeekday";el.textContent=label;grid.appendChild(el);});
  for(let n=0;n<firstDay;n++){const spacer=document.createElement("span");spacer.className="calendarSpacer";grid.appendChild(spacer);}
  for(let day=1;day<=days;day++){
    const iso=localISO(new Date(year,month,day,12));
    const sessions=state.sessions.filter(s=>s.date===iso);
    const meals=Object.values(state.consumed[iso]||{}).some(x=>Object.values(x||{}).some(Boolean));
    const b=document.createElement("button");b.type="button";b.className="calendarDay"+(iso===calendarSelected?" selected":"")+(iso===todayISO()?" today":"");b.dataset.calendarDate=iso;
    b.setAttribute("aria-label",`${displayDate(iso)}${sessions.length?`, ${sessions.length} allenamenti`:""}${meals?", pasti registrati":""}`);
    b.innerHTML=`<strong>${day}</strong><span class="calendarMarks">${sessions.length?'<i class="training"></i>':""}${meals?'<i class="food"></i>':""}</span>`;
    grid.appendChild(b);
  }
  const sessions=state.sessions.filter(s=>s.date===calendarSelected);
  const logged=state.consumed[calendarSelected]||{};
  const mealSummaries=[];
  for(const diet of state.diets){
    const eaten=Object.entries(logged[diet.id]||{}).filter(([,v])=>Boolean(v)).map(([key])=>getMealLabel(diet,key));
    if(eaten.length)mealSummaries.push(`${diet.name}: ${eaten.join(", ")}`);
  }
  const di=(weekdayOfISO(calendarSelected)+6)%7;
  const plan=getActivePlan(),planned=getPlanDayForJsDay(plan,weekdayOfISO(calendarSelected));
  details.innerHTML=`<h3>${escapeHTML(displayDate(calendarSelected))}</h3><p class="muted small">${planned?`Scheda prevista: ${escapeHTML(planned.name)}`:"Nessuna scheda associata a questo giorno"}</p>
    ${sessions.length?sessions.map(s=>`<button class="calendarSession" type="button" data-calendar-session="${escapeHTML(s.id)}"><b>${escapeHTML(s.dayName||"Allenamento")}</b><span>${s.closed?"Completato":"In corso"} · Apri ›</span></button>`).join(""):'<p class="muted small">Nessun allenamento registrato.</p>'}
    <h4>Pasti consumati</h4>${mealSummaries.length?mealSummaries.map(t=>`<p class="calendarMeal">✓ ${escapeHTML(t)}</p>`).join(""):'<p class="muted small">Nessun pasto segnato come consumato.</p>'}`;
}
$("calendarPrev")?.addEventListener("click",()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1,12);calendarSelected=localISO(calendarCursor);renderCalendar();});
$("calendarNext")?.addEventListener("click",()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1,12);calendarSelected=localISO(calendarCursor);renderCalendar();});
$("calendarGrid")?.addEventListener("click",e=>{const b=e.target.closest("[data-calendar-date]");if(!b)return;calendarSelected=b.dataset.calendarDate;renderCalendar();});
$("calendarDetails")?.addEventListener("click",e=>{const b=e.target.closest("[data-calendar-session]");if(b)openSessionModal(b.dataset.calendarSession);});

/* ---------------- Pasti preferiti (copie indipendenti dai piani) ---------------- */
function renderMealFavorites(){
 const box=$("mealFavorites");if(!box)return;box.replaceChildren();
 if(!state.mealFavorites.length){box.textContent="Nessun preferito: salva un pasto dal planner.";return;}
 for(const favorite of state.mealFavorites){
   const card=document.createElement("div");card.className="favoriteItem";
   const diet=getActiveDiet();
   const choices=diet?getDietMealKeys(diet).map(key=>`<option value="${escapeHTML(key)}">${escapeHTML(getMealLabel(diet,key))}</option>`).join(""):"";
   card.innerHTML=`<div><b>${escapeHTML(favorite.name)}</b><small>${favorite.items.length} alimenti</small></div><div class="favoriteActions"><select data-favorite-target="${escapeHTML(favorite.id)}" aria-label="Scegli pasto di destinazione">${choices}</select><button class="btn" data-favorite-apply="${escapeHTML(favorite.id)}" type="button" ${diet?"":"disabled"}>Usa</button><button class="iconBtn danger" data-favorite-delete="${escapeHTML(favorite.id)}" type="button" aria-label="Elimina preferito ${escapeHTML(favorite.name)}">×</button></div>`;
   box.appendChild(card);
 }
}
$("mealFavorites")?.addEventListener("click",e=>{
 const del=e.target.closest("[data-favorite-delete]"),apply=e.target.closest("[data-favorite-apply]");
 if(del){if(!confirm("Eliminare questo pasto preferito?"))return;state.mealFavorites=state.mealFavorites.filter(f=>f.id!==del.dataset.favoriteDelete);saveState();renderMealFavorites();return;}
 if(!apply)return;
 const fav=state.mealFavorites.find(f=>f.id===apply.dataset.favoriteApply),diet=getActiveDiet();if(!fav||!diet)return;
 const match=apply.closest(".favoriteItem")?.querySelector("[data-favorite-target]")?.value;
 if(!match){toast("Scegli il pasto di destinazione");return;}
 const di=Number($("dietDaySelect").value);
 if((diet.week[di].meals[match]||[]).length && !confirm("Sostituire gli alimenti del pasto selezionato?"))return;
 diet.week[di].meals[match]=clone(fav.items);saveState();renderDietPreview();renderDietWeek();toast("Pasto preferito applicato");
});

/* ---------------- food planning, nutrition & purchases ---------------- */
function dateForDietDay(dayIndex){
  const now=new Date(), today=(now.getDay()+6)%7;
  return addLocalDays(todayISO(), Number(dayIndex)-today);
}
function mealNutrition(items){
  // Totale SOLO quando ogni alimento ha dati completi dichiarati con fonte.
  const total={kcal:0,p:0,c:0,f:0};
  for(const food of items){
    const n=food.nutrition;
    const basis=food.unit==="g"?"100g":food.unit==="ml"?"100ml":"pz";
    if(!n || n.basis!==basis || !String(n.source||"").trim() ||
       !["kcal","p","c","f"].every(k=>Number.isFinite(n[k]) && n[k]>=0)) return null;
    const factor=food.unit==="pz"?food.qty:food.qty/100;
    for(const key of Object.keys(total)) total[key]+=n[key]*factor;
  }
  return total;
}
function renderDietWeek(){
  const box=$("dietWeek"); if(!box)return;
  const diet=getActiveDiet(); box.replaceChildren();
  if(!diet){box.textContent="Nessuna dieta attiva.";return;}
  const labels=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
  const index=Number($("dietDaySelect")?.value||0);
  diet.week.forEach((day,i)=>{
    const meals=Object.values(day.meals||{});
    const foods=meals.flat();
    const button=document.createElement("button");
    button.className="weekDay"+(index===i?" selected":"");
    button.type="button"; button.dataset.dietWeek=i;
    const date=dateForDietDay(i);
    const checked=Object.values(state.consumed[date]?.[diet.id]||{}).filter(Boolean).length;
    const plannedMeals=getDietMealKeys(diet).filter(key=>(day.meals?.[key]||[]).length).length;
    button.innerHTML=`<strong>${labels[i]}</strong><span>${displayDate(date)}</span><small>${foods.length} alimenti · ${plannedMeals} pasti${checked?` · ${checked} ✓`:""}</small>`;
    box.appendChild(button);
  });
  const day=diet.week[index], foods=Object.values(day?.meals||{}).flat();
  const sum=$("dietNutrition"); if(!sum)return;
  const total=foods.length?mealNutrition(foods):null;
  if(!total){sum.textContent="Valori nutrizionali non disponibili: inserisci dati completi con fonte (es. etichetta) per tutti gli alimenti del giorno. I target non sono consumi.";return;}
  const fmt=n=>Math.round(n*10)/10;
  sum.textContent=`Pianificato: ${fmt(total.kcal)} kcal · P ${fmt(total.p)}g · C ${fmt(total.c)}g · G ${fmt(total.f)}g. Non rappresenta il consumo effettivo.`;
}
$("dietWeek")?.addEventListener("click",e=>{
  const day=e.target.closest("[data-diet-week]"); if(!day)return;
  $("dietDaySelect").value=day.dataset.dietWeek;
  renderDietPreview(); renderDietWeek();
});
$("dietPreview")?.addEventListener("change",e=>{
  const input=e.target.closest("[data-food-portion]");if(!input)return;
  const d=getActiveDiet();if(!d)return;
  const di=Number($("dietDaySelect").value),key=input.dataset.mealKey;
  const item=d.week?.[di]?.meals?.[key]?.[Number(input.dataset.foodPortion)];
  const quantity=Number(input.value);
  if(!item || !Number.isFinite(quantity)||quantity<=0){toast("Inserisci una quantità maggiore di zero");if(item)input.value=item.qty;return;}
  item.qty=quantity;saveState();renderDietWeek();toast("Porzione aggiornata");
});
$("dietPreview")?.addEventListener("click",e=>{
  const edit=e.target.closest("[data-open-meal-editor]");
  const duplicate=e.target.closest("[data-copy-meal-tomorrow]");
  const favoriteButton=e.target.closest("[data-meal-favorite]");
  const d=getActiveDiet(),di=Number($("dietDaySelect").value);
  if(favoriteButton && d){
    const key=favoriteButton.dataset.mealFavorite,items=d.week?.[di]?.meals?.[key]||[];
    if(!items.length)return;
    const name=prompt("Nome del pasto preferito:",getMealLabel(d,key));
    if(name===null)return;
    if(!name.trim()){toast("Inserisci un nome");return;}
    state.mealFavorites.push({id:uid(),name:name.trim().slice(0,60),items:clone(items)});
    saveState();renderMealFavorites();toast("Pasto salvato nei preferiti");return;
  }
  if(edit && d){
    state.ui.dietEditDayIndex=di;
    state.ui.dietEditMeal=Number(edit.dataset.openMealEditor);
    openDietEditor(d.id);return;
  }
  if(duplicate && d){
    const key=duplicate.dataset.copyMealTomorrow,next=(di+1)%7;
    const src=d.week?.[di]?.meals?.[key]||[];
    if(!src.length)return;
    const dest=d.week?.[next]?.meals?.[key]||[];
    if(dest.length && !confirm(`Sostituire il pasto ${getMealLabel(d,key)} di ${["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"][next]}?`))return;
    d.week[next].meals[key]=clone(src);saveState();renderDietWeek();toast("Pasto copiato a domani");return;
  }
  const button=e.target.closest("[data-consume-meal]");if(!button)return;
  const iso=dateForDietDay(di);
  const meal=button.dataset.consumeMeal,diet=getActiveDiet();
  if(!diet?.week[di]?.meals?.[meal]?.length){toast("Prima aggiungi alimenti al pasto");return;}
  if(!state.consumed[iso])state.consumed[iso]={};
  if(!state.consumed[iso][diet.id])state.consumed[iso][diet.id]={};
  state.consumed[iso][diet.id][meal]=!state.consumed[iso][diet.id][meal];
  saveState();renderDietPreview();renderDietWeek();homeRefresh();
  const label=getMealLabel(diet,meal);
  toast(state.consumed[iso][diet.id][meal]?`${label} segnato come consumato`:`${label} da consumare`);
});
$("dietDaySelect")?.addEventListener("change",renderDietWeek);
$("btnCopyDayToDay")?.addEventListener("click",()=>{
  const diet=dietEditing();if(!diet)return;
  const from=Number($("dietEditDaySelect").value),to=Number($("copyDayTarget").value);
  if(from===to){toast("Scegli un giorno diverso");return;}
  if(!confirm("Sostituire i pasti del giorno di destinazione?"))return;
  diet.week[to]=clone(diet.week[from]);saveState();renderDietWeek();toast("Giorno copiato");
});

const normalizedFood=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .toLocaleLowerCase("it").replace(/\s+/g," ").trim();
function normalizedUnit(unit,qty){
  const u=String(unit||"").trim().toLowerCase(), num=Number(qty);
  if(u==="kg")return {unit:"g",qty:num*1000};
  if(u==="l")return {unit:"ml",qty:num*1000};
  if(["g","ml","pz"].includes(u))return {unit:u,qty:num};
  return null;
}
/* ---------------- Dispensa condivisa con la lista della spesa ---------------- */
function pantryKey(food,unit){return normalizedFood(food)+"|"+(normalizedUnit(unit,1)?.unit||unit);}
function stockForRow(pantryQty,rowUnit){
  const u=String(rowUnit||"").toLowerCase();
  return u==="kg"||u==="l"?pantryQty/1000:pantryQty;
}
function findPantry(food,unit){return state.pantry.find(p=>p.key===pantryKey(food,unit));}
function setPantry(food,qty,unit){
 const norm=normalizedUnit(unit,qty),name=String(food||"").trim();
 if(!name||!norm||!Number.isFinite(norm.qty)||norm.qty<0)return false;
 const key=pantryKey(name,norm.unit),entry=state.pantry.find(p=>p.key===key);
 if(entry){entry.qty=norm.qty;entry.food=name;}
 else state.pantry.push({key,food:name,unit:norm.unit,qty:norm.qty});
 state.grocery.rows.forEach(r=>{if(pantryKey(r.food,r.unit)===key)r.stock=stockForRow(norm.qty,r.unit);});
 return true;
}
function pantryReconcile(){
 for(const r of state.grocery.rows){
  const item=findPantry(r.food,r.unit);
  if(item)r.stock=stockForRow(item.qty,r.unit);
 }
}
function renderPantry(){
 const box=$("pantryList");if(!box)return;
 box.replaceChildren();
 if(!state.pantry.length){box.innerHTML='<p class="muted small">Dispensa vuota. Aggiungi ciò che hai già in casa.</p>';return;}
 for(const item of [...state.pantry].sort((a,b)=>a.food.localeCompare(b.food,"it"))){
  const div=document.createElement("div");div.className="pantryItem";
  div.innerHTML=`<div><b>${escapeHTML(item.food)}</b><span>${escapeHTML(item.qty)} ${escapeHTML(item.unit)}</span></div><div class="pantryActions"><button type="button" class="iconBtn" data-pantry-edit="${escapeHTML(item.key)}">Modifica</button><button type="button" class="iconBtn danger" data-pantry-remove="${escapeHTML(item.key)}">Elimina</button></div>`;
  box.appendChild(div);
 }
}
$("pantrySave")?.addEventListener("click",()=>{
 const food=$("pantryFood").value,qty=Number($("pantryQty").value),unit=$("pantryUnit").value;
 if(!setPantry(food,qty,unit)){toast("Inserisci alimento e quantità non negativa");return;}
 $("pantryFood").value="";$("pantryQty").value="1";
 saveState();renderPantry();renderGrocery();toast("Dispensa aggiornata");
});
$("pantryList")?.addEventListener("click",e=>{
 const edit=e.target.closest("[data-pantry-edit]"),del=e.target.closest("[data-pantry-remove]");
 if(edit){const row=state.pantry.find(x=>x.key===edit.dataset.pantryEdit);if(!row)return;
 $("pantryFood").value=row.food;$("pantryQty").value=row.qty;$("pantryUnit").value=row.unit;$("pantryFood").focus();return;}
 if(del){const row=state.pantry.find(x=>x.key===del.dataset.pantryRemove);if(!row||!confirm(`Rimuovere ${row.food} dalla dispensa?`))return;
 state.pantry=state.pantry.filter(x=>x.key!==row.key);state.grocery.rows.forEach(r=>{if(pantryKey(r.food,r.unit)===row.key)r.stock=0;});
 saveState();renderPantry();renderGrocery();toast("Alimento rimosso dalla dispensa");}
});
function foodCategory(food){
  const n=normalizedFood(food);
  if(/latte|yogurt|ricotta|formaggio|mozzarella|parmigiano|skyr/.test(n))return "Latticini";
  if(/pollo|tacchino|manzo|vitello|maiale|tonno|salmone|pesce|uova|bresaola/.test(n))return "Proteine";
  if(/riso|pasta|pane|avena|farina|patate|cereali|gallette|orzo/.test(n))return "Cereali e amidi";
  if(/mela|banana|pera|arancia|frutt|fragol|kiwi|mirtill/.test(n))return "Frutta";
  if(/insalata|pomodor|zucchin|spinac|broccoli|verdura|carota|cipolla/.test(n))return "Verdura";
  if(/olio|burro|mandor|noci|arachid|nocciole/.test(n))return "Condimenti e frutta secca";
  return "Altro";
}
function rangeInput(){
  const start=parseItalianDate($("groceryStart").value),end=parseItalianDate($("groceryEnd").value);
  if(!start||!end||end<start)return null;
  const days=Math.round((Date.parse(end+"T12:00:00")-Date.parse(start+"T12:00:00"))/86400000)+1;
  if(!(days>=1&&days<=31))return null;
  return {start,end,days};
}
function generateGrocery(){
  const diet=getActiveDiet(),range=rangeInput();
  if(!diet||!range)return null;
  const agg=new Map();
  for(let d=0;d<range.days;d++){
    const date=addLocalDays(range.start,d), di=(weekdayOfISO(date)+6)%7;
    for(const meal of Object.values(diet.week[di]?.meals||{})){
      for(const it of meal){
        const normalized=normalizedUnit(it.unit,it.qty);
        if(!normalized || !Number.isFinite(normalized.qty) || normalized.qty<=0)continue;
        const key=normalizedFood(it.food)+"|"+normalized.unit;
        const existing=agg.get(key)||{food:String(it.food).trim(),qty:0,unit:normalized.unit};
        existing.qty+=normalized.qty;agg.set(key,existing);
      }
    }
  }
  return {list:Array.from(agg,([key,row])=>({...row,id:"auto:"+key,
    category:foodCategory(row.food)})),range,dietId:diet.id};
}
function updateGrocery(){
  const result=generateGrocery();
  if(!result){toast("Controlla le date GG/MM/AAAA e seleziona 1–31 giorni con una dieta attiva");return;}
  const rows=state.grocery.rows,previous=new Map(rows.map(r=>[r.id,r]));
  const excluded=state.grocery.excluded||[];
  const incoming=result.list.filter(r=>!excluded.includes(r.id));
  const activeIds=new Set(incoming.map(r=>r.id));
  const next=incoming.map(item=>{
    const old=previous.get(item.id);
    return {...item,stock:(findPantry(item.food,item.unit)?stockForRow(findPantry(item.food,item.unit).qty,item.unit):old?.stock ?? 0),bought:old?.bought||false,manual:false,stale:false};
  });
  // Manuali sempre intatti; non previsti ma già utilizzati rimangono per verifica.
  for(const old of rows){
    if(old.manual)next.push(old);
    else if(!activeIds.has(old.id) && (old.bought || old.stock>0))next.push({...old,qty:0,stale:true});
  }
  state.grocery={rows:next,context:{dietId:result.dietId,...result.range},excluded};
  pantryReconcile();saveState();renderPantry();renderGrocery();toast("Lista aggiornata senza perdere acquisti e articoli manuali");
}
function openGrocery(){
  const start=$("groceryStart"),end=$("groceryEnd");
  if(!start.value)start.value=displayDate(state.grocery.context?.start||todayISO());
  if(!end.value)end.value=displayDate(state.grocery.context?.end||addLocalDays(parseItalianDate(start.value)||todayISO(),6));
  if(!state.grocery.context && getActiveDiet())updateGrocery();
  else renderGrocery();
  renderPantry();
}
function renderGrocery(){
  const box=$("groceryItems"),summary=$("grocerySummary");if(!box)return;
  box.replaceChildren();
  const rows=state.grocery?.rows||[];
  const context=state.grocery.context;
  const need=r=>Math.max(0,Math.round((finiteNumber(r.qty)-finiteNumber(r.stock))*100)/100);
  const pending=rows.filter(r=>!r.bought && need(r)>0);
  const purchased=rows.filter(r=>r.bought);
  const showAll=Boolean(state.ui.groceryShowAll);
  $("btnGroceryPending")?.classList.toggle("active",!showAll);
  $("btnGroceryAll")?.classList.toggle("active",showAll);
  $("btnGroceryPending")?.setAttribute("aria-pressed",String(!showAll));
  $("btnGroceryAll")?.setAttribute("aria-pressed",String(showAll));
  if($("groceryPendingLabel"))$("groceryPendingLabel").textContent=`Da acquistare (${pending.length})`;
  if($("groceryAllLabel"))$("groceryAllLabel").textContent=`Tutti (${rows.length})`;
  const excludedCount=(state.grocery.excluded||[]).length;
  if($("btnGroceryRestore"))$("btnGroceryRestore").hidden=!excludedCount;
  if(summary){summary.textContent=context?
    `${pending.length} da acquistare · ${purchased.length} acquistati · ${displayDate(context.start)} – ${displayDate(context.end)}`:
    "Nessuna lista generata";
    if(excludedCount)summary.textContent+=` · ${excludedCount} esclusi`;
    if(context && (context.dietId!==state.activeDietId || context.start!==parseItalianDate($("groceryStart")?.value) || context.end!==parseItalianDate($("groceryEnd")?.value))) summary.textContent+=" · Premi Ricalcola per aggiornare il periodo";
  }
  const available=showAll?rows:pending;
  if(!available.length){box.innerHTML=`<div class="shoppingEmpty">${rows.length?"Tutto acquistato! ✓":"Nessun articolo. Aggiungi un prodotto o genera la lista dalla dieta."}</div>`;return;}
  function appendProduct(item){
    const div=document.createElement("div");div.className="groceryItem"+(item.bought?" purchased":"");
    div.innerHTML=`<label class="groceryCheck"><input type="checkbox" data-grocery-check="${escapeHTML(item.id)}" ${item.bought?"checked":""} aria-label="Acquistato: ${escapeHTML(item.food)}"><span class="groceryName">${escapeHTML(item.food)}</span></label>
      <div class="groceryFields"><span class="muted small">Da acquistare: <b>${need(item)} ${escapeHTML(item.unit)}</b> · Totale ${escapeHTML(item.qty)} ${escapeHTML(item.unit)}${item.stale?' · Fuori piano':''}${item.manual?' · Manuale':''}</span>
      <label class="stockField">In casa <input inputmode="decimal" type="number" min="0" step="any" data-grocery-stock="${escapeHTML(item.id)}" value="${escapeHTML(item.stock||0)}" aria-label="Quantità già in casa di ${escapeHTML(item.food)}"></label>
      <button class="iconBtn" data-grocery-edit="${escapeHTML(item.id)}">Modifica</button>
      <button class="iconBtn danger" data-grocery-del="${escapeHTML(item.id)}">Elimina</button></div>`;
    box.appendChild(div);
  }
  const active=available.filter(r=>!r.bought);
  const categories=[...new Set(active.map(r=>r.category||"Altro"))].sort((a,b)=>a.localeCompare(b,"it"));
  for(const category of categories){
    const heading=document.createElement("h3");heading.className="groceryCategory";heading.textContent=category;box.appendChild(heading);
    active.filter(r=>(r.category||"Altro")===category).forEach(appendProduct);
  }
  if(showAll && purchased.length){
    const heading=document.createElement("h3");heading.className="groceryCategory purchasedHeading";heading.textContent=`Acquistati (${purchased.length})`;box.appendChild(heading);
    purchased.forEach(appendProduct);
  }
}
$("btnGroceryPending")?.addEventListener("click",()=>{state.ui.groceryShowAll=false;saveState();renderGrocery();});
$("btnGroceryAll")?.addEventListener("click",()=>{state.ui.groceryShowAll=true;saveState();renderGrocery();});

function groceryItem(id){return state.grocery.rows.find(r=>r.id===id);}
for(const id of ["groceryStart","groceryEnd"]){
  $(id)?.addEventListener("input",e=>{maskItalianDate(e.target);e.target.setCustomValidity("");});
  $(id)?.addEventListener("change",e=>{
    const date=parseItalianDate(e.target.value);
    e.target.setCustomValidity(date?"":"Inserisci una data valida nel formato GG/MM/AAAA");
    e.target.toggleAttribute("aria-invalid",!date);
    renderGrocery();
  });
}
$("btnGroceryUpdate")?.addEventListener("click",updateGrocery);
$("btnGroceryManual")?.addEventListener("click",()=>{
  const food=$("groceryFood").value.trim(),qty=Number($("groceryQty").value),unit=$("groceryUnit").value;
  if(!food || !(qty>0) || !Number.isFinite(qty)){toast("Inserisci articolo e quantità validi");return;}
  const edit=$("btnGroceryManual").dataset.edit;
  const item=edit?groceryItem(edit):null;
  if(item){
    if(!item.manual){
      state.grocery.excluded=[...new Set([...(state.grocery.excluded||[]),item.id])];
      item.id="manual:"+uid();item.manual=true;
    }
    Object.assign(item,{food,qty,unit,category:foodCategory(food)});
  }
  else state.grocery.rows.push({id:"manual:"+uid(),manual:true,food,qty,unit,
    category:foodCategory(food),stock:0,bought:false});
  $("btnGroceryManual").dataset.edit="";$("btnGroceryManual").textContent="Aggiungi articolo";
  $("groceryFood").value="";$("groceryQty").value="1";
  saveState();renderGrocery();toast("Articolo salvato");
});
$("groceryItems")?.addEventListener("change",e=>{
  const input=e.target;
  if(input.matches("[data-grocery-check]")){
    const it=groceryItem(input.dataset.groceryCheck);if(it)it.bought=input.checked;
  }else if(input.matches("[data-grocery-stock]")){
    const it=groceryItem(input.dataset.groceryStock);
    if(it){
      const qty=Number(input.value);
      if(!Number.isFinite(qty)||qty<0){toast("Quantità non valida");input.value=it.stock??0;return;}
      setPantry(it.food,qty,it.unit);
      renderPantry();
    }
  }else return;
  saveState();renderGrocery();
});
$("groceryItems")?.addEventListener("click",e=>{
  const edit=e.target.closest("[data-grocery-edit]"),del=e.target.closest("[data-grocery-del]");
  if(edit){
    const item=groceryItem(edit.dataset.groceryEdit); if(!item)return;
    $("groceryFood").value=item.food;$("groceryQty").value=item.qty;
    $("groceryUnit").value=item.unit;
    $("btnGroceryManual").dataset.edit=item.id;$("btnGroceryManual").textContent="Salva articolo";
    $("groceryFood").focus();
  }
  if(del){
    const item=groceryItem(del.dataset.groceryDel); if(!item || !confirm(`Eliminare ${item.food} dalla lista?`))return;
    if(!item.manual){ // Esclusione esplicita persiste sino al ripristino
      state.grocery.excluded=[...new Set([...(state.grocery.excluded||[]),item.id])];
    }
    state.grocery.rows=state.grocery.rows.filter(r=>r.id!==item.id);
    saveState();renderGrocery();toast("Articolo eliminato. Puoi ripristinare gli esclusi.");
  }
});
$("btnGroceryRestore")?.addEventListener("click",()=>{
  if(!confirm("Ripristinare gli articoli esclusi dalla generazione automatica?"))return;
  state.grocery.excluded=[];updateGrocery();
});
function groceryText(){
  const rows=state.grocery.rows;
  return `SPESA FIT PLANNER\n${displayDate(state.grocery.context?.start)} → ${displayDate(state.grocery.context?.end)}\n\n`+
    rows.map(r=>`${r.bought?'☑':'☐'} ${r.food}: ${Math.max(0,finiteNumber(r.qty)-finiteNumber(r.stock))} ${r.unit}${r.bought?' (acquistato)':''}`).join("\n");
}
$("btnGroceryCopy")?.addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(groceryText());toast("Lista copiata");}
  catch{const text=$("groceryShareFallback");text.hidden=false;text.value=groceryText();text.select();toast("Seleziona e copia il testo");}
});
$("btnGroceryShare")?.addEventListener("click",async()=>{
  if(navigator.share){try{await navigator.share({title:"Spesa Fit Planner",text:groceryText()});return;}catch(e){if(e.name==="AbortError")return;}}
  const text=$("groceryShareFallback");text.hidden=false;text.value=groceryText();text.select();
  toast("Condivisione non disponibile: copia il testo");
});
/* ---------------- Progressi: dati esistenti, layout mobile ---------------- */
let historyFilter="all",historyLimit=12,prLimit=10;
function historySort(a,b){
  const at=Number(a.ts)||0,bt=Number(b.ts)||0;
  if(at&&bt)return bt-at;
  return String(b.date||"").localeCompare(String(a.date||""))||(bt-at);
}
function progressTotals(){
  const sessions=state.sessions||[];
  const closed=sessions.filter(s=>s.closed);
  let sets=0,volume=0;
  const exercises=new Set();
  sessions.forEach(s=>(s.items||[]).forEach(it=>{
    (it.sets||[]).forEach(st=>{
      const kg=toKg(st.kg),reps=toReps(st.reps);
      if(Number.isFinite(kg)&&Number.isFinite(reps)&&reps>0){
        sets++;volume+=kg*reps;exercises.add(normName(it.ex));
      }
    });
  }));
  return {closed:closed.length,sets,volume,exercises:exercises.size};
}
function renderProgressKpis(){
  const box=$("progressKpis");if(!box)return;
  const k=progressTotals();
  const list=[
    ["Sessioni concluse",k.closed.toLocaleString("it-IT"),"check-circle-2"],
    ["Serie registrate",k.sets.toLocaleString("it-IT"),"dumbbell"],
    ["Volume totale",`${Math.round(k.volume).toLocaleString("it-IT")} kg`,"activity"],
    ["Esercizi registrati",k.exercises.toLocaleString("it-IT"),"award"]
  ];
  box.innerHTML=list.map(([label,value])=>`<div class="progressKpi"><span class="progressKpiLabel">${label}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
}
function renderHistory(){
  const box=$("sessionHistory");if(!box)return;
  renderProgressKpis();
  const search=String($("historySearch")?.value||"").trim().toLocaleLowerCase("it-IT");
  const filtered=[...state.sessions].filter(s=>{
    if(historyFilter==="closed"&&!s.closed)return false;
    if(historyFilter==="open"&&s.closed)return false;
    return `${s.dayName||""} ${s.planName||""} ${displayDate(s.date||"")}`.toLocaleLowerCase("it-IT").includes(search);
  }).sort(historySort);
  box.replaceChildren();
  const counter=$("historyCounter");if(counter)counter.textContent=`${filtered.length}`;
  document.querySelectorAll("[data-history-filter]").forEach(btn=>{
    const active=btn.dataset.historyFilter===historyFilter;
    btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",String(active));
  });
  if(!filtered.length){box.innerHTML='<div class="progressEmpty">Nessuna sessione per questo filtro.</div>';}
  filtered.slice(0,historyLimit).forEach(s=>{
    const button=document.createElement("button");button.type="button";
    button.className="progressHistoryRow";button.dataset.sessionOpen="1";button.dataset.sessionId=String(s.id);
    const filled=(s.items||[]).reduce((sum,it)=>sum+(it.sets||[]).filter(st=>String(st.reps??"").trim()!=="").length,0);
    const title=String(s.dayName||"Allenamento");
    const status=s.closed?"Conclusa":"In corso";
    button.innerHTML=`<span class="progressHistoryInfo"><b>${escapeHTML(title)}</b><small>${escapeHTML(displayDate(s.date))}${s.planName?` · ${escapeHTML(s.planName)}`:""}</small><small>${filled} ${filled===1?"serie registrata":"serie registrate"}</small></span><span class="progressHistoryMeta"><span class="progressStatus ${s.closed?"isClosed":"isOpen"}">${status}</span><span aria-hidden="true">›</span></span>`;
    box.appendChild(button);
  });
  const more=$("historyShowMore");if(more){more.hidden=filtered.length<=historyLimit;more.textContent=`Mostra altre sessioni (${filtered.length-Math.min(historyLimit,filtered.length)})`;}
}
function computeRecords(){
  const pr=new Map();
  for(const s of state.sessions){
    for(const it of (s.items||[])){
      const name=String(it.ex||"").trim();if(!name)continue;
      for(const st of (it.sets||[])){
        const kg=toKg(st.kg);
        if(!Number.isFinite(kg))continue;
        const key=normName(name);
        const prev=pr.get(key);
        if(!prev||kg>prev.kg)pr.set(key,{ex:name,kg,date:s.date||""});
      }
    }
  }
  return [...pr.values()].sort((a,b)=>b.kg-a.kg||a.ex.localeCompare(b.ex,"it"));
}
function renderPR(){
  const box=$("prBox");if(!box)return;
  const search=String($("prSearch")?.value||"").trim().toLocaleLowerCase("it-IT");
  const records=computeRecords().filter(r=>r.ex.toLocaleLowerCase("it-IT").includes(search));
  box.replaceChildren();
  const count=$("prCounter");if(count)count.textContent=`${records.length}`;
  if(!records.length){box.innerHTML='<div class="progressEmpty">Nessun record per questo esercizio.</div>';}
  records.slice(0,prLimit).forEach(r=>{
    const button=document.createElement("button");button.type="button";button.className="progressPrRow";
    button.dataset.progressExercise=r.ex;
    button.innerHTML=`<span class="progressPrInfo"><b>${escapeHTML(r.ex)}</b><small>${escapeHTML(displayDate(r.date))}</small></span><span class="progressPrResult"><strong>${escapeHTML(progressNum(r.kg))} kg</strong><small>Vedi grafico ›</small></span>`;
    box.appendChild(button);
  });
  const more=$("prShowMore");if(more){more.hidden=records.length<=prLimit;more.textContent=`Mostra altri record (${records.length-Math.min(prLimit,records.length)})`;}
}
$("historySearch")?.addEventListener("input",()=>{historyLimit=12;renderHistory();});
$("prSearch")?.addEventListener("input",()=>{prLimit=10;renderPR();});
$("historyShowMore")?.addEventListener("click",()=>{historyLimit+=12;renderHistory();});
$("prShowMore")?.addEventListener("click",()=>{prLimit+=10;renderPR();});
document.querySelectorAll("[data-history-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  historyFilter=btn.dataset.historyFilter;historyLimit=12;renderHistory();
}));
$("prBox")?.addEventListener("click",e=>{
  const btn=e.target.closest("[data-progress-exercise]");if(!btn)return;
  const sel=$("exProgressSelect");if(!sel)return;
  sel.value=btn.dataset.progressExercise;
  sel.dispatchEvent(new Event("change"));
  document.querySelector(".progressChartCard")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
});

/* ---------------- home & settings ---------------- */
function refreshHomeSessionButton(){
  const btn = $("btnStartSession");
  if(!btn) return;
  const s = state.activeSessionId ? findSessionById(state.activeSessionId) : null;
  if(s){
    btn.textContent = s.closed ? "Modifica sessione" : "Riprendi allenamento";
  } else {
    btn.textContent = "Inizia allenamento";
  }
}

function homeRefresh(){
  if($("homeDate"))$("homeDate").textContent=displayDate(todayISO());
  $("homeKcal").textContent=`Target ${state.settings.kcal} kcal`;
  $("homeSessions").textContent=String(state.sessions.length);
  $("homePlanName").textContent=getActivePlan()?.name || "—";

  const plan = getActivePlan();
  const jsDay = new Date().getDay(); // 0=Dom ... 6=Sab
  let todayTxt = "Riposo";

  if(plan){
    const d = getPlanDayForJsDay(plan, jsDay);
    if(d){
      todayTxt = (d.weekday!==undefined ? (weekdayLabel(d.weekday) + " • ") : "") + d.name;
    }
  }
  $("homeTodayWorkout").textContent = todayTxt;
  const todayIndex=(jsDay+6)%7, meals=getActiveDiet()?.week[todayIndex]?.meals||{};
  const mealCount=Object.values(meals).filter(items=>items.length>0).length;
  const eaten=Object.values(state.consumed[todayISO()]?.[getActiveDiet()?.id]||{}).filter(Boolean).length;
  if($("homeMeals"))$("homeMeals").textContent=mealCount?`${eaten}/${mealCount} pasti segnati`:
    "Nessun pasto programmato";
  if($("homeGrocery"))$("homeGrocery").textContent=`${state.grocery.rows.filter(r=>!r.bought && (r.qty-r.stock)>0).length} prodotti da acquistare`;
  if($("homeProgress")){
    const last=state.sessions.filter(s=>s.closed).sort((a,b)=>finiteNumber(b.ts)-finiteNumber(a.ts))[0];
    $("homeProgress").textContent=last?`Ultimo completato: ${last.dayName} (${displayDate(last.date)})`:"Nessuna sessione completata";
  }
  refreshHomeSessionButton();
}

function renderSettings(){
  $("setWeight").value=state.settings.weightKg;
  $("setMeals").value=state.settings.mealsPerDay;
  $("setKcal").value=state.settings.kcal;
  $("setP").value=state.settings.p;
  $("setC").value=state.settings.c;
  $("setF").value=state.settings.f;

  $("kcalTarget").textContent=state.settings.kcal;
  $("pTarget").textContent=state.settings.p+" g";
  $("cTarget").textContent=state.settings.c+" g";
  $("fTarget").textContent=state.settings.f+" g";
}

function defaultDietWeek(){
  return {id:uid().slice(0,8), name:"Nuovo piano alimentare", mealNames:{1:"Colazione",2:"Spuntino",3:"Pranzo",4:"Merenda",5:"Cena"},
    week:Array.from({length:7},()=>({meals:{1:[],2:[],3:[],4:[],5:[]}}))};
}
function defaultWorkout4Days(){
  return {id:uid().slice(0,8),name:"Nuova scheda 4 giorni",
    days:[1,2,4,5].map(w=>({id:uid().slice(0,6),name:weekdayLabel(w),weekday:w,exercises:[]}))};
}

/* ---------------- buttons navigation ---------------- */
$("btnOpenPlans")?.addEventListener("click", openPlans);
$("btnPlansBack")?.addEventListener("click", ()=>setView("workout"));
$("btnPlanEditBack")?.addEventListener("click", openPlans);

$("btnOpenDiets")?.addEventListener("click", openDiets);
$("btnDietsBack")?.addEventListener("click", ()=>setView("diet"));
$("btnDietEditBack")?.addEventListener("click", openDiets);

$("btnPlanNew")?.addEventListener("click", ()=>{
  const name = prompt("Nome nuova scheda:", "Nuova scheda");
  if(!name) return;
  const p = { id: uid().slice(0,8), name: name.trim(), days: [] };
  state.plans.push(p);
  state.activePlanId = p.id;
  saveState();
  populateActivePlanSelect();
  populateDays(); renderDayPreview(); homeRefresh();
  openPlanEditor(p.id);
  toast("Scheda creata");
});

$("btnDietNew")?.addEventListener("click", ()=>{
  const name = prompt("Nome nuova dieta:", "Nuova dieta");
  if(!name) return;
  const d = defaultDietWeek();
  d.name = name.trim();
  state.diets.push(d);
  state.activeDietId = d.id;
  saveState();
  populateActiveDietSelect();
  renderDietPreview(); renderDietWeek();
  openDietEditor(d.id);
  toast("Dieta creata");
});

$("btnLoadDefaultPlan")?.addEventListener("click", ()=>{
  const p = defaultWorkout4Days();
  state.plans.push(p);
  state.activePlanId = p.id;
  saveState();
  populateActivePlanSelect();
  populateDays(); renderDayPreview();
  homeRefresh();
  toast("Scheda 4gg aggiunta");
});

$("btnLoadDefaultDiet")?.addEventListener("click", ()=>{
  const d = defaultDietWeek();
  state.diets.push(d);
  state.activeDietId = d.id;
  saveState();
  populateActiveDietSelect();
  renderDietPreview();
  toast("Dieta base aggiunta");
});

$("btnStartDay")?.addEventListener("click", ()=>{
  const plan = getActivePlan();
  if(!plan){ toast("Crea o seleziona una scheda"); return; }
  const id=$("daySelect")?.value; if(!id) return;
  startSession(id);
});

$("btnStartSession")?.addEventListener("click", ()=>{
  // se c'è una sessione attiva (anche chiusa in modifica), riprendi da dove eri rimasto
  if(state.activeSessionId){
    const s = findSessionById(state.activeSessionId);
    if(s){
      // indici da progress (clamp per sicurezza)
      const exMax = Math.max(0, (s.items?.length||1)-1);
      state.activeExIndex = clamp(s.progressExIndex ?? state.activeExIndex ?? 0, 0, exMax);
      const setMax = Math.max(0, (s.items?.[state.activeExIndex]?.sets?.length||1)-1);
      state.activeSetIndex = clamp(s.progressSetIndex ?? state.activeSetIndex ?? 0, 0, setMax);

      saveState();
      openSessionUI();
      renderSession();
      toast(s.closed ? "Sessione in modifica" : "Allenamento ripreso");
      return;
    } else {
      // puntatore rotto: pulisci e permetti di iniziare
      state.activeSessionId = null;
      state.ui.sessionOpenId = null;
      state.activeExIndex = 0;
      state.activeSetIndex = 0;
      saveState();
      refreshHomeSessionButton();
    }
  }

  const plan = getActivePlan();
  if(!plan){ toast("Crea o seleziona una scheda"); return; }
  const jsDay = new Date().getDay();
  const d = getPlanDayForJsDay(plan, jsDay) || plan.days[0];
  if(!d){ toast("La scheda non ha giorni"); return; }
  startSession(d.id);
});

$("btnTodayMeals")?.addEventListener("click", ()=>{
  setView("diet");
  $("dietDaySelect").value = String((new Date().getDay()+6)%7);
  renderDietPreview();renderDietWeek();
});

$("btnGenerateGrocery")?.addEventListener("click", ()=>setView("grocery"));
$("btnGrocery")?.addEventListener("click", ()=>setView("grocery"));
$("btnBackup")?.addEventListener("click", ()=>setView("settings"));

$("btnSaveSettings")?.addEventListener("click",()=>{
  state.settings.weightKg=Number($("setWeight").value||0);
  state.settings.mealsPerDay=Number($("setMeals").value||5);
  state.settings.kcal=Number($("setKcal").value||0);
  state.settings.p=Number($("setP").value||0);
  state.settings.c=Number($("setC").value||0);
  state.settings.f=Number($("setF").value||0);
  saveState();
  renderSettings();
  homeRefresh();
  toast("Impostazioni salvate");
});

/* ---------------- Salvataggi e integrità: nessun reset silenzioso ---------------- */
const PRE_IMPORT_KEY="fitplanner_preimport_v43";
function integrityIssues(data=state){
 const problems=[];
 if(!validDataShape(data))problems.push("Struttura generale del backup non valida");
 const dup=arr=>{const ids=arr.map(x=>String(x?.id??"")).filter(Boolean);return ids.length!==new Set(ids).size;};
 if(dup(data.plans||[]))problems.push("ID duplicati nelle schede");
 if(dup(data.diets||[]))problems.push("ID duplicati nelle diete");
 if(dup(data.sessions||[]))problems.push("ID duplicati nelle sessioni");
 for(const session of data.sessions||[]){
   if(session.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(session.date)))problems.push("Data non valida nello storico");
   for(const item of session.items||[]){for(const set of item.sets||[]){
     if(String(set.kg??"").trim() && (!Number.isFinite(toNum(set.kg))||toNum(set.kg)<0))problems.push("Kg non valido nello storico");
     if(String(set.reps??"").trim() && (!Number.isFinite(toNum(set.reps))||toNum(set.reps)<0))problems.push("Ripetizioni non valide nello storico");
   }}
 }
 for(const row of data.grocery?.rows||[]){if(!row||!Number.isFinite(Number(row.qty))||Number(row.qty)<0)problems.push("Quantità non valida nella spesa");}
 for(const row of data.pantry||[]){if(!row||!Number.isFinite(row.qty)||row.qty<0)problems.push("Quantità non valida nella dispensa");}
 return [...new Set(problems)];
}
function renderBackupStatus(){
 const el=$("backupStatus");if(!el)return;
 const last=Number(state.meta?.lastExportStartedAt);
 const days=last?Math.floor((Date.now()-last)/86400000):null;
 el.textContent=!last?"Non risulta un'esportazione avviata da questa versione. Conserva un JSON in File o iCloud Drive.":
  `Ultima esportazione avviata: ${displayDate(localISO(new Date(last)))}.${days>=30?" È consigliabile crearne una nuova.":""}`;
 const recovery=$("btnPreImportRestore");if(recovery){let exists=false;try{exists=Boolean(localStorage.getItem(PRE_IMPORT_KEY));}catch{}recovery.hidden=!exists;}
}
$("btnIntegrityCheck")?.addEventListener("click",()=>{
 const errors=integrityIssues();
 alert(errors.length?"Controlli da verificare:\n• "+errors.join("\n• "):"Controllo completato: nessuna anomalia strutturale rilevata. Questo non sostituisce un backup.");
});
$("btnPreImportRestore")?.addEventListener("click",()=>{
 let raw;try{raw=localStorage.getItem(PRE_IMPORT_KEY);}catch{}
 const previous=safeParse(raw);
 if(!validDataShape(previous)){alert("Nessuna copia di recupero valida.");return;}
 if(!confirm("Ripristinare i dati precedenti all'ultima importazione? I dati attuali saranno sostituiti. Prima esporta un backup."))return;
 const current=state;
 try{state=clone(previous);if(!saveState())throw Error("Salvataggio non riuscito");boot();setView("settings");toast("Dati precedenti recuperati");}
 catch(e){state=current;saveState();alert("Ripristino non riuscito: "+e.message);}
});
/* ---------------- backup ---------------- */
$("btnExport")?.addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`fitplanner_backup_${displayDate(todayISO()).replaceAll("/","-")}.json`;
  a.click();
  state.meta.lastExportStartedAt=Date.now();saveState();renderBackupStatus();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
$("fileImport")?.addEventListener("change", async (e)=>{
  const f=e.target.files?.[0]; if(!f) return;
  if(f.size > 15 * 1024 * 1024){alert("Backup troppo grande (max 15 MB)."); e.target.value=""; return;}
  let txt;
  try{txt=await f.text();}catch{toast("Impossibile leggere il file");return;}
  const obj=safeParse(txt);
  if(!validDataShape(obj)){ alert("Backup non valido o incompleto: dati attuali invariati.");e.target.value=""; return; }
  const issues=integrityIssues(obj);
  if(issues.length){alert("Backup con dati anomali. Importazione annullata:\n"+issues.join("\n"));e.target.value="";return;}
  const info=`${obj.plans?.length||0} schede, ${obj.diets?.length||0} diete, ${obj.sessions?.length||0} sessioni`;
  if(!confirm(`Importare questo backup (${info})?\n\nATTENZIONE: i dati correnti saranno sostituiti. Esportali prima per sicurezza.`)){e.target.value="";return;}
  const previous=state, wasBlocked=storageBlocked;
  try{
    // Conserva una copia prima di qualunque sovrascrittura; se non c'e' spazio, annulla.
    const previousRaw=localStorage.getItem(KEY);
    localStorage.setItem(PRE_IMPORT_KEY,previousRaw??JSON.stringify(previous));
    state=clone(obj); storageBlocked=false;
    if(!saveState()) throw Error("Scrittura non riuscita");
    boot();setView("settings");renderBackupStatus();
    toast("Backup ripristinato");
  }catch(err){ state=previous; storageBlocked=wasBlocked;try{if(!wasBlocked)localStorage.setItem(KEY,JSON.stringify(previous));}catch{}alert("Importazione fallita: "+err.message); }
  finally{ e.target.value=""; }
});

/* ---------------- init helpers ---------------- */
function ensureBaseData(){
  if(!Array.isArray(state.plans)) state.plans = [];
  if(!Array.isArray(state.diets)) state.diets = [];
  if(!Array.isArray(state.sessions)) state.sessions = [];
  if(!state.ui || typeof state.ui!=="object") state.ui = clone(DEFAULT.ui);
  if(!state.settings || typeof state.settings!=="object") state.settings=clone(DEFAULT.settings);
  state.ui={...clone(DEFAULT.ui),...state.ui};
  if(!state.consumed || typeof state.consumed!=="object" || Array.isArray(state.consumed)) state.consumed={};
  if(!state.grocery || !Array.isArray(state.grocery.rows)) state.grocery=clone(DEFAULT.grocery);
  if(!Array.isArray(state.mealFavorites)) state.mealFavorites=[];
  state.mealFavorites=state.mealFavorites.filter(f=>f&&typeof f.name==="string"&&Array.isArray(f.items));
  if(!state.meta || typeof state.meta!=="object" || Array.isArray(state.meta))state.meta={};
  if(!Array.isArray(state.pantry)){
    state.pantry=[];
    // Migrazione conservativa delle scorte gia' indicate nella v42.
    for(const r of state.grocery.rows){if(finiteNumber(r.stock)>0)setPantry(r.food,r.stock,r.unit);}
  }
  state.pantry=state.pantry.filter(r=>r&&typeof r.food==="string"&&["g","ml","pz"].includes(r.unit)&&Number.isFinite(r.qty)&&r.qty>=0);
  pantryReconcile();
  // Data migration additive, preserva tutto il resto del documento originale.
  state.plans.forEach(p=>(p.days||[]).forEach(d=>{
    if(d.weekday===undefined){
      const days={mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};
      const key=String(d.id||"").toLowerCase();
      if(Object.hasOwn(days,key)) d.weekday=days[key];
    }
  }));

  // ✅ normalizza ID (per compatibilità con dati vecchi: number/string)
  state.plans.forEach(p=>{p.id=sid(p.id);(p.days||[]).forEach(d=>d.id=sid(d.id));});
  state.diets.forEach(d=>{d.id=sid(d.id); ensureDietMealNames(d);});
  if(state.activePlanId!=null) state.activePlanId=sid(state.activePlanId);
  if(state.activeDietId!=null) state.activeDietId=sid(state.activeDietId);
  state.sessions.forEach(s=>{
    if(!s) return;
    if(s.id!==undefined) s.id = sid(s.id);
    if(s.planId!==undefined) s.planId = sid(s.planId);
    if(s.dayId!==undefined) s.dayId = sid(s.dayId);
    if(s.closed===undefined) s.closed = false;
    if(s.progressExIndex===undefined) s.progressExIndex = 0;
    if(s.progressSetIndex===undefined) s.progressSetIndex = 0;
    // normalizza set payload
    (s.items||[]).forEach(it=>{
      if(!it || !Array.isArray(it.sets)) return;
      it.sets.forEach(st=>{
        if(!st) return;
        if(st.kg===undefined) st.kg = "";
        if(st.reps===undefined) st.reps = "";
      });
    });
    if(!s.ts) s.ts = Date.now();
  });

  if(state.activeSessionId!==undefined && state.activeSessionId!==null) state.activeSessionId = sid(state.activeSessionId);
  if(state.ui && state.ui.sessionOpenId!==undefined && state.ui.sessionOpenId!==null) state.ui.sessionOpenId = sid(state.ui.sessionOpenId);

  // indici numerici
  state.activeExIndex = Number(state.activeExIndex||0) || 0;
  state.activeSetIndex = Number(state.activeSetIndex||0) || 0;


  if(!state.activePlanId) state.activePlanId = state.plans[0]?.id || null;
  if(!state.activeDietId) state.activeDietId = state.diets[0]?.id || null;

  // migrazioni leggere (se arrivassi da versioni vecchie)
  if(state.workoutPlan && !state.plans.length){
    const p = clone(state.workoutPlan);
    p.id = uid().slice(0,8);
    state.plans = [p];
    state.activePlanId = p.id;
    delete state.workoutPlan;
  }
  if(state.dietPlan && !state.diets.length){
    const d = clone(state.dietPlan);
    d.id = uid().slice(0,8);
    state.diets = [d];
    state.activeDietId = d.id;
    delete state.dietPlan;
  }

  // ✅ MIGRAZIONE: aggiungi ts alle vecchie sessioni senza ts
  let base = Date.now() - (state.sessions.length * 1000);
  for (let i=0;i<state.sessions.length;i++){
    const s = state.sessions[i];
    if (!s.ts){
      base += 1000;
      s.ts = base;
    }
  }

  if (state.ui.sessionOpenId === undefined) state.ui.sessionOpenId = null;
}

function boot(){
  ensureBaseData();

  // se la sessione attiva non esiste più, pulisci
  if(state.activeSessionId && !findSessionById(state.activeSessionId)){
    state.activeSessionId = null;
    state.ui.sessionOpenId = null;
    state.activeExIndex = 0;
    state.activeSetIndex = 0;
  }

  populateActivePlanSelect();
  populateDays();
  renderDayPreview();

  populateActiveDietSelect();
  populateDietDays();
  renderDietPreview();

  renderSettings();
  renderHistory();
  renderPR();
  homeRefresh();

  // non aprire automaticamente la sessione: mostra solo il tasto "Riprendi/Modifica" in Home
  closeSessionUI();
  clearInterval(timer.interval); timer.running=false; timer.remaining=0; timerRestore();
  refreshHomeSessionButton();
  renderDietWeek();
  renderGrocery();
  renderPantry();renderMealFavorites();renderBackupStatus();
  const warning=$("storageWarning");
  if(warning && storageIssue){
    warning.hidden=false; warning.textContent=storageIssue;
    if(unreadableRaw && !$("btnRawBackup")){
      const button=document.createElement("button");button.id="btnRawBackup";button.className="btn";
      button.textContent="Scarica una copia dei dati originali";
      button.addEventListener("click",()=>{
        const blob=new Blob([unreadableRaw],{type:"application/json"});
        const a=document.createElement("a");a.href=URL.createObjectURL(blob);
        a.download="fitplanner_dati_originali_da_recuperare.json";a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      });
      warning.append(" ",button);
    }
  }
  renderExerciseProgressUI();

  // aggiorna appbar coerentemente con la view attiva
  setAppBar(currentView);
  saveState();
}

boot();
