import { useState, useEffect, useRef } from "react";
import { storageGet, storageSet, storageIsCloud } from "./storage.js";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       "#F7F4EF",   // warm off-white
  bgCard:   "#FFFFFF",
  bgMuted:  "#F0EDE7",
  border:   "#E2DDD6",
  text:     "#1C1917",
  textMid:  "#6B5E52",
  textSoft: "#A8998C",
  accent:   "#E05C2A",   // terracotta
  accentBg: "#FEF0EB",
  green:    "#2D7A4F",
  greenBg:  "#EBF5EF",
  blue:     "#2563EB",
  blueBg:   "#EFF4FF",
  yellow:   "#D97706",
  yellowBg: "#FEF9EB",
};

// ── Constants ─────────────────────────────────────────────────────────────────
const RACE_DATE  = new Date("2026-03-07T00:00:00");
const DISC_EMOJI = { swim:"🏊", bike:"🚴", run:"🏃", strength:"💪", rest:"😴", transition:"🔄" };
const DISC_COLOR = { swim:T.blue, bike:T.yellow, run:T.green, strength:"#7C3AED", rest:T.textSoft, transition:"#0891B2" };

function daysUntil()   { return Math.max(0, Math.ceil((RACE_DATE - new Date()) / 86400000)); }
function weeksUntil()  { return (daysUntil() / 7).toFixed(1); }
function progressPct() {
  const total = Math.ceil((RACE_DATE - new Date("2025-09-01")) / 86400000);
  return Math.min(100, Math.max(0, Math.round(((total - daysUntil()) / total) * 100)));
}
function today() { return new Date().toISOString().slice(0,10); }
function fmt(d)  { return new Date(d+"T12:00:00").toLocaleDateString("es-UY",{weekday:"short",day:"numeric",month:"short"}); }
function normDisc(s="") {
  s = s.toLowerCase();
  if (s.includes("cicl")||s.includes("bici")||s.includes("bike")) return "bike";
  if (s.includes("run")||s.includes("corre")) return "run";
  if (s.includes("nat")||s.includes("swim")) return "swim";
  if (s.includes("fuerz")||s.includes("core")||s.includes("flex")||s.includes("movil")) return "strength";
  if (s.includes("transi")) return "transition";
  return "rest";
}

// ── Storage ───────────────────────────────────────────────────────────────────
async function load(key) {
  try { return await storageGet(key); } catch { return null; }
}
async function save(key, val) {
  try { await storageSet(key, val); } catch {}
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude({ system, messages, maxTokens=1200, imageBase64=null }) {
  const msgs = imageBase64
    ? [{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:imageBase64 }},
        { type:"text", text: messages[messages.length-1].content }
      ]}]
    : messages;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system, messages: msgs })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]             = useState("home");
  const [workouts, setWorkouts]   = useState({});
  const [health,   setHealth]     = useState({});
  const [notes,    setNotes]      = useState([]);
  const [nutrition,setNutrition]  = useState([]);
  const [recipes,  setRecipes]    = useState([]);
  const [medical,  setMedical]    = useState(null);
  const [plan,     setPlan]       = useState(null);
  const [aiChat,   setAiChat]     = useState([]);
  const [routes,   setRoutes]     = useState([]);
  const [booting,  setBooting]    = useState(true);

  useEffect(() => {
    (async () => {
      const [w,h,n,nut,r,med,pl,routes_] = await Promise.all([
        load("workouts"),load("health"),load("notes"),load("nutrition"),
        load("recipes"),load("medical"),load("plan"),load("routes")
      ]);
      if (w) setWorkouts(w); if (h) setHealth(h); if (n) setNotes(n);
      if (nut) setNutrition(nut); if (r) setRecipes(r);
      if (med) setMedical(med); if (pl) setPlan(pl);
      if (routes_) setRoutes(routes_);
      setBooting(false);
    })();
  }, []);

  const saveWorkouts  = async w => { setWorkouts(w);  await save("workouts",w); };
  const saveHealth    = async h => { setHealth(h);    await save("health",h); };
  const saveNotes     = async n => { setNotes(n);     await save("notes",n); };
  const saveNutrition = async n => { setNutrition(n); await save("nutrition",n); };
  const saveRecipes   = async r => { setRecipes(r);   await save("recipes",r); };
  const saveMedical   = async m => { setMedical(m);   await save("medical",m); };
  const savePlan      = async p => { setPlan(p);      await save("plan",p); };
  const saveRoutes    = async r => { setRoutes(r);    await save("routes",r); };

  if (booting) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg,color:T.accent,fontFamily:"Georgia,serif",fontSize:18,letterSpacing:1}}>
      Cargando…
    </div>
  );

  const TABS = [
    {id:"home",      icon:"⌂",  label:"Inicio"},
    {id:"plan",      icon:"📋", label:"Plan"},
    {id:"log",       icon:"+",  label:"Registrar"},
    {id:"history",   icon:"↗",  label:"Historial"},
    {id:"health",    icon:"♥",  label:"Salud"},
    {id:"nutrition", icon:"◍",  label:"Nutrición"},
    {id:"coach",     icon:"✦",  label:"Coach"},
    {id:"notes",     icon:"✎",  label:"Notas"},
    {id:"routes",    icon:"🗺",  label:"Rutas"},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Georgia','Times New Roman',serif",maxWidth:520,margin:"0 auto",paddingBottom:82}}>

      {/* HEADER */}
      <div style={{background:T.accent,padding:"16px 20px 14px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
        <div style={{position:"absolute",bottom:-30,right:40,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",letterSpacing:4,textTransform:"uppercase",fontFamily:"system-ui,sans-serif"}}>Ironman 70.3</div>
        <div style={{fontSize:22,fontWeight:400,color:"#fff",letterSpacing:0.5,marginTop:2}}>Punta del Este</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1,fontFamily:"system-ui,sans-serif"}}>
          07 · 03 · 2026 &nbsp;·&nbsp; {daysUntil()} días restantes
          &nbsp;·&nbsp; {storageIsCloud() ? "☁️ sync" : "📱 local"}
        </div>
      </div>

      {/* PAGE */}
      <div>
        {tab==="home"      && <HomeTab workouts={workouts} health={health} notes={notes} plan={plan}/>}
        {tab==="plan"      && <PlanTab plan={plan} onSave={savePlan} workouts={workouts} onSaveWorkout={saveWorkouts}/>}
        {tab==="log"       && <LogTab  workouts={workouts} health={health} onSaveWorkout={saveWorkouts} onSaveHealth={saveHealth}/>}
        {tab==="history"   && <HistoryTab workouts={workouts}/>}
        {tab==="health"    && <HealthTab health={health}/>}
        {tab==="nutrition" && <NutritionTab nutrition={nutrition} onSave={saveNutrition} recipes={recipes} onSaveRecipes={saveRecipes} medical={medical} onSaveMedical={saveMedical}/>}
        {tab==="coach"     && <CoachTab workouts={workouts} health={health} notes={notes} plan={plan} medical={medical} chat={aiChat} setChat={setAiChat}/>}
        {tab==="notes"     && <NotesTab notes={notes} onSave={saveNotes}/>}
        {tab==="routes"    && <RoutesTab routes={routes} onSave={saveRoutes}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:"#fff",borderTop:`1px solid ${T.border}`,display:"flex",zIndex:100,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:"0 0 auto",minWidth:52,padding:"10px 6px 8px",background:"none",border:"none",cursor:"pointer",
              color:tab===t.id?T.accent:T.textSoft,
              borderTop:tab===t.id?`2px solid ${T.accent}`:"2px solid transparent",
              fontSize:tab===t.id?17:16,display:"flex",flexDirection:"column",alignItems:"center",gap:1,transition:"color .2s"}}>
            <span style={{fontFamily:"system-ui"}}>{t.icon}</span>
            <span style={{fontSize:8,letterSpacing:.8,textTransform:"uppercase",whiteSpace:"nowrap",fontFamily:"system-ui,sans-serif"}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════════════════════
function HomeTab({ workouts, health, notes, plan }) {
  const pct      = progressPct();
  const todayKey = today();
  const allW     = Object.values(workouts);
  const totalSwim= allW.filter(w=>w.discipline==="swim").reduce((a,w)=>a+(Number(w.distance)||0),0);
  const totalBike= allW.filter(w=>w.discipline==="bike").reduce((a,w)=>a+(Number(w.distance)||0),0);
  const totalRun = allW.filter(w=>w.discipline==="run").reduce((a,w)=>a+(Number(w.distance)||0),0);
  const todayH   = health[todayKey]||{};
  const now      = new Date();
  const wStart   = new Date(now); wStart.setDate(now.getDate()-now.getDay());
  const thisWeek = allW.filter(w=>new Date(w.date+"T12:00:00")>=wStart);
  const todayPlan= plan?.sessions?.filter(s=>s.date===todayKey)||[];

  return (
    <div>
      {/* HERO COUNTDOWN */}
      <div style={{background:"#fff",margin:"16px 16px 0",borderRadius:16,padding:"22px 20px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:64,fontWeight:400,color:T.accent,lineHeight:1,letterSpacing:-2}}>{daysUntil()}</div>
            <div style={{fontSize:11,color:T.textSoft,letterSpacing:3,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginTop:2}}>días · {weeksUntil()} semanas</div>
          </div>
          <div style={{flex:1,paddingBottom:6}}>
            <div style={{fontSize:12,color:T.textMid,marginBottom:8,fontStyle:"italic"}}>Progreso del ciclo</div>
            <div style={{background:T.bgMuted,borderRadius:6,height:6,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",background:`linear-gradient(90deg,${T.accent},#F5883A)`,borderRadius:6,transition:"width 1.2s ease"}}/>
            </div>
            <div style={{marginTop:5,fontSize:11,color:T.textSoft,fontFamily:"system-ui,sans-serif"}}>{pct}% completado</div>
          </div>
        </div>

        {/* Volumen pills */}
        <div style={{display:"flex",gap:8}}>
          {[
            {icon:"🏊",label:"Swim",val:(totalSwim/1000).toFixed(1)+"km",c:T.blue,bg:T.blueBg},
            {icon:"🚴",label:"Bike",val:totalBike.toFixed(0)+"km",c:T.yellow,bg:T.yellowBg},
            {icon:"🏃",label:"Run", val:totalRun.toFixed(1)+"km",c:T.green,bg:T.greenBg},
          ].map(({icon,label,val,c,bg})=>(
            <div key={label} style={{flex:1,background:bg,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${c}22`}}>
              <div style={{fontSize:17}}>{icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:c,marginTop:3}}>{val}</div>
              <div style={{fontSize:9,color:T.textSoft,textTransform:"uppercase",letterSpacing:1,fontFamily:"system-ui,sans-serif"}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOY */}
      <Card title={"Hoy · "+fmt(todayKey)}>
        {todayPlan.length>0
          ? todayPlan.map((s,i)=><PlanSessionRow key={i} s={s} compact/>)
          : <div style={{fontSize:13,color:T.textSoft,fontStyle:"italic"}}>Sin sesiones planificadas. Cargá tu plantilla en 📋</div>
        }
        {todayH.sleep && (
          <div style={{marginTop:10,background:T.bgMuted,borderRadius:10,padding:"9px 13px",fontSize:12,color:T.textMid,display:"flex",gap:16,flexWrap:"wrap",fontFamily:"system-ui,sans-serif"}}>
            {todayH.sleep    && <span>😴 <b>{todayH.sleep}h</b></span>}
            {todayH.hrv      && <span>💓 HRV <b>{todayH.hrv}</b></span>}
            {todayH.restingHR&& <span>❤️ <b>{todayH.restingHR}bpm</b></span>}
          </div>
        )}
      </Card>

      {/* SEMANA */}
      <Card title="Esta semana">
        <WeekStrip workouts={workouts} plan={plan}/>
        {thisWeek.length>0 && (
          <div style={{marginTop:12}}>
            {thisWeek.slice(-3).map((w,i)=><WorkoutRow key={i} w={w}/>)}
          </div>
        )}
      </Card>

      {notes.length>0 && (
        <Card title="Última nota">
          <div style={{background:T.accentBg,borderRadius:10,padding:"11px 13px",fontSize:13,color:T.textMid,borderLeft:`3px solid ${T.accent}`,lineHeight:1.65}}>
            <div style={{fontSize:10,color:T.accent,marginBottom:4,fontFamily:"system-ui,sans-serif",textTransform:"uppercase",letterSpacing:1}}>{fmt(notes[notes.length-1].date)}</div>
            {notes[notes.length-1].text}
          </div>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PLAN TAB
// ════════════════════════════════════════════════════════════════════════════
function PlanTab({ plan, onSave, workouts, onSaveWorkout }) {
  const [imgPreview,setImgPreview]=useState(null);
  const [imgBase64, setImgBase64] =useState(null);
  const [scanning,  setScanning]  =useState(false);
  const [error,     setError]     =useState("");
  const fileRef=useRef();

  const handleImg = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{setImgPreview(ev.target.result);setImgBase64(ev.target.result.split(",")[1]);};
    r.readAsDataURL(f);
  };

  const scanPlan = async () => {
    if(!imgBase64) return;
    setScanning(true); setError("");
    const system=`Sos un asistente de análisis de planillas de entrenamiento de triatlón.
Extraés datos de imágenes de planillas Excel y devolvés SOLO JSON válido sin markdown ni backticks.
Estructura exacta:
{"weekLabel":"25 may - 1 jun","sessions":[{"date":"YYYY-MM-DD","day":"Lunes","sport":"Ciclismo","task":"Calidad: Intervalos","description":"descripción completa","zone":"Z4/Z5","rpe":null,"completed":false,"actualRpe":null,"actualSleepHours":null,"actualSleepQuality":null,"feelingNote":""}]}
Si no hay año en la imagen, asumí 2026. SOLO el JSON.`;
    try {
      const raw=await callClaude({system,messages:[{role:"user",content:"Extraé todos los entrenamientos. SOLO JSON."}],maxTokens:2000,imageBase64});
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      await onSave({...parsed,uploadedAt:today(),imgPreview});
      setImgPreview(null);setImgBase64(null);
    } catch(e){setError("No pude leer la plantilla. Intentá con mejor iluminación.");}
    setScanning(false);
  };

  const markComplete=async(idx,field,value)=>{
    const updated={...plan,sessions:plan.sessions.map((s,i)=>i===idx?{...s,[field]:value}:s)};
    await onSave(updated);
  };

  const logFromPlan=async(s)=>{
    const disc=normDisc(s.sport);
    const key=s.date+"_"+Date.now();
    await onSaveWorkout({...workouts,[key]:{id:key,date:s.date,discipline:disc,task:s.task,description:s.description,zone:s.zone,rpe:s.actualRpe||"",distance:"",duration:"",avgHR:"",maxHR:"",calories:"",notes:s.feelingNote||"",fromPlan:true}});
    await markComplete(plan.sessions.indexOf(s),"completed",true);
  };

  const grouped=plan?.sessions?plan.sessions.reduce((acc,s,i)=>{
    const k=s.date+"_"+s.day;
    if(!acc[k]) acc[k]={date:s.date,day:s.day,items:[]};
    acc[k].items.push({...s,_idx:i});
    return acc;
  },{}): {};

  return (
    <div style={{padding:"16px 16px"}}>
      {/* UPLOAD */}
      <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>Subir plantilla semanal</div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
        <div style={{background:T.bgMuted,borderRadius:10,padding:"16px",textAlign:"center",marginBottom:10,border:`1px dashed ${T.border}`}}>
          {imgPreview
            ? <img src={imgPreview} alt="plantilla" style={{width:"100%",borderRadius:8,maxHeight:180,objectFit:"cover"}}/>
            : <div style={{fontSize:13,color:T.textSoft,fontStyle:"italic"}}>Foto del Excel que te manda el coach</div>
          }
          <button onClick={()=>fileRef.current.click()}
            style={{marginTop:10,background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",color:T.textMid,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13}}>
            {imgPreview?"Cambiar foto":"📸 Subir foto"}
          </button>
        </div>
        {imgPreview&&(
          <button onClick={scanPlan} disabled={scanning}
            style={{width:"100%",background:scanning?T.bgMuted:T.accent,color:scanning?T.textSoft:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"system-ui,sans-serif",transition:"all .2s"}}>
            {scanning?"🔍 Leyendo plantilla…":"🔍 Escanear con IA"}
          </button>
        )}
        {error&&<div style={{marginTop:8,fontSize:12,color:"#DC2626",textAlign:"center",fontFamily:"system-ui,sans-serif"}}>{error}</div>}
      </div>

      {plan&&(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingLeft:2}}>
            <div style={{fontSize:14,color:T.text,fontStyle:"italic"}}>{plan.weekLabel||"Semana activa"}</div>
            <div style={{fontSize:10,color:T.textSoft,fontFamily:"system-ui,sans-serif"}}>Cargada: {fmt(plan.uploadedAt||today())}</div>
          </div>

          {Object.values(grouped).map(({date,day,items})=>{
            const isToday_=date===today();
            const allDone=items.every(s=>s.completed);
            return(
              <div key={date+"_"+day} style={{background:"#fff",borderRadius:14,marginBottom:10,overflow:"hidden",
                border:`1px solid ${isToday_?T.accent:T.border}`,
                boxShadow:isToday_?"0 2px 8px rgba(224,92,42,0.12)":"0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{background:isToday_?T.accentBg:T.bgMuted,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <span style={{fontSize:13,color:isToday_?T.accent:T.textMid,fontWeight:600,fontFamily:"system-ui,sans-serif"}}>{day}</span>
                    <span style={{fontSize:11,color:T.textSoft,marginLeft:8,fontFamily:"system-ui,sans-serif"}}>{fmt(date)}</span>
                  </div>
                  {allDone&&<span style={{fontSize:11,color:T.green,fontFamily:"system-ui,sans-serif",fontWeight:600}}>✓ Completado</span>}
                  {isToday_&&!allDone&&<span style={{fontSize:10,color:T.accent,background:"#fff",padding:"2px 8px",borderRadius:10,fontFamily:"system-ui,sans-serif",fontWeight:600}}>HOY</span>}
                </div>
                {items.map((s,i)=>(
                  <PlanSessionRow key={i} s={s}
                    onComplete={val=>markComplete(s._idx,"completed",val)}
                    onRpe={val=>markComplete(s._idx,"actualRpe",val)}
                    onSleep={val=>markComplete(s._idx,"actualSleepHours",val)}
                    onSleepQ={val=>markComplete(s._idx,"actualSleepQuality",val)}
                    onFeel={val=>markComplete(s._idx,"feelingNote",val)}
                    onLog={()=>logFromPlan(s)}
                  />
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function PlanSessionRow({s,compact,onComplete,onRpe,onSleep,onSleepQ,onFeel,onLog}){
  const [open,setOpen]=useState(false);
  const disc=normDisc(s.sport);
  const color=DISC_COLOR[disc]||T.textSoft;

  if(compact) return(
    <div style={{background:T.bgMuted,borderRadius:10,padding:"10px 12px",marginBottom:6,borderLeft:`3px solid ${color}`}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:17}}>{DISC_EMOJI[disc]}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:T.text,fontWeight:600}}>{s.task}</div>
          <div style={{fontSize:11,color:T.textSoft,fontFamily:"system-ui,sans-serif"}}>{s.sport}{s.zone?` · ${s.zone}`:""}</div>
        </div>
        {s.completed&&<span style={{fontSize:15}}>✅</span>}
      </div>
    </div>
  );

  return(
    <div style={{borderTop:`1px solid ${T.bgMuted}`}}>
      <div style={{padding:"12px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:20,lineHeight:1.2}}>{DISC_EMOJI[disc]}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600,color:s.completed?T.green:T.text}}>{s.task}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {s.zone&&<span style={{fontSize:10,color:color,background:color+"18",padding:"2px 7px",borderRadius:6,fontFamily:"system-ui,sans-serif",fontWeight:600}}>{s.zone}</span>}
                {s.completed?<span>✅</span>:<span style={{fontSize:12,color:T.textSoft}}>{open?"▲":"▼"}</span>}
              </div>
            </div>
            <div style={{fontSize:11,color:T.textSoft,marginTop:2,fontFamily:"system-ui,sans-serif"}}>{s.sport}</div>
            {!open&&s.description&&<div style={{fontSize:11,color:T.textSoft,marginTop:3,lineHeight:1.5}}>{s.description.slice(0,80)}{s.description.length>80?"…":""}</div>}
          </div>
        </div>
      </div>

      {open&&(
        <div style={{padding:"0 16px 16px",borderTop:`1px solid ${T.bgMuted}`}}>
          {s.description&&(
            <div style={{fontSize:12,color:T.textMid,lineHeight:1.75,marginBottom:14,background:T.bgMuted,borderRadius:10,padding:"12px",fontFamily:"system-ui,sans-serif"}}>
              {s.description}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <LabeledInput label="RPE real (1–10)" type="number" value={s.actualRpe||""} onChange={e=>onRpe&&onRpe(e.target.value)} placeholder={s.rpe||"—"}/>
            <LabeledInput label="Sueño (h)" type="number" step="0.5" value={s.actualSleepHours||""} onChange={e=>onSleep&&onSleep(e.target.value)}/>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:T.textSoft,letterSpacing:1,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:6}}>Calidad sueño</div>
            <div style={{display:"flex",gap:6}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>onSleepQ&&onSleepQ(n)}
                  style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${s.actualSleepQuality===n?T.accent:T.border}`,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13,
                    background:s.actualSleepQuality===n?T.accentBg:"#fff",color:s.actualSleepQuality===n?T.accent:T.textMid,fontWeight:s.actualSleepQuality===n?700:400}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <textarea value={s.feelingNote||""} onChange={e=>onFeel&&onFeel(e.target.value)}
            placeholder="¿Cómo te sentiste? ¿Alguna dolencia?" rows={2}
            style={{width:"100%",background:T.bgMuted,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 11px",color:T.text,fontSize:13,fontFamily:"system-ui,sans-serif",boxSizing:"border-box",resize:"vertical",marginBottom:10}}/>
          <div style={{display:"flex",gap:8}}>
            {!s.completed&&(
              <button onClick={()=>{onComplete&&onComplete(true);setOpen(false);}}
                style={{flex:1,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,padding:"9px",color:T.green,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13,fontWeight:600}}>
                ✓ Marcar hecha
              </button>
            )}
            {!s.completed&&onLog&&(
              <button onClick={()=>{onLog();setOpen(false);}}
                style={{flex:1,background:T.bgMuted,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px",color:T.textMid,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13}}>
                + Logear
              </button>
            )}
            {s.completed&&(
              <button onClick={()=>onComplete&&onComplete(false)}
                style={{flex:1,background:"#FEF2F2",border:"1px solid #FCA5A544",borderRadius:8,padding:"9px",color:"#DC2626",cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:12}}>
                ↩ Desmarcar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOG TAB
// ════════════════════════════════════════════════════════════════════════════
function LogTab({workouts,health,onSaveWorkout,onSaveHealth}){
  const [mode,setMode]=useState("workout");
  const [form,setForm]=useState({date:today(),discipline:"swim",distance:"",duration:"",avgHR:"",maxHR:"",calories:"",rpe:"5",notes:"",fitFile:null});
  const [hForm,setHForm]=useState({date:today(),sleep:"",hrv:"",restingHR:"",stress:"",weight:"",notes:"",fitFile:null});
  const [saved,setSaved]=useState(false);
  const fileRef=useRef(); const hFileRef=useRef();

  const flash=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const handleFit=e=>{const f=e.target.files[0];if(!f)return;setForm(p=>({...p,fitFile:f.name}));};
  const handleHFit=e=>{const f=e.target.files[0];if(!f)return;setHForm(p=>({...p,fitFile:f.name}));};

  const saveWorkout=()=>{
    if(!form.distance&&!form.duration)return;
    const key=form.date+"_"+Date.now();
    onSaveWorkout({...workouts,[key]:{...form,id:key}});
    flash();
    setForm({date:today(),discipline:"swim",distance:"",duration:"",avgHR:"",maxHR:"",calories:"",rpe:"5",notes:"",fitFile:null});
  };
  const saveH=()=>{onSaveHealth({...health,[hForm.date]:{...hForm}});flash();};

  return(
    <div style={{padding:"16px"}}>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[["workout","🏋️ Entrenamiento"],["health","❤️ Salud"]].map(([m,l])=>(
          <button key={m} onClick={()=>setMode(m)}
            style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${mode===m?T.accent:T.border}`,cursor:"pointer",
              background:mode===m?T.accentBg:"#fff",color:mode===m?T.accent:T.textMid,
              fontFamily:"system-ui,sans-serif",fontWeight:600,fontSize:13,transition:"all .2s"}}>
            {l}
          </button>
        ))}
      </div>

      {mode==="workout"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <LabeledInput label="Fecha" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
            <div>
              <div style={{fontSize:10,color:T.textSoft,letterSpacing:1,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:5}}>Deporte</div>
              <select value={form.discipline} onChange={e=>setForm(p=>({...p,discipline:e.target.value}))}
                style={{width:"100%",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",color:T.text,fontSize:14,fontFamily:"system-ui,sans-serif"}}>
                <option value="swim">🏊 Natación</option>
                <option value="bike">🚴 Bicicleta</option>
                <option value="run">🏃 Running</option>
                <option value="strength">💪 Fuerza</option>
                <option value="transition">🔄 Transición</option>
                <option value="rest">😴 Descanso</option>
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <LabeledInput label="Distancia (km/m)" type="number" value={form.distance} onChange={e=>setForm(p=>({...p,distance:e.target.value}))}/>
            <LabeledInput label="Duración (min)"   type="number" value={form.duration} onChange={e=>setForm(p=>({...p,duration:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <LabeledInput label="FC Prom" type="number" value={form.avgHR}    onChange={e=>setForm(p=>({...p,avgHR:e.target.value}))}/>
            <LabeledInput label="FC Máx"  type="number" value={form.maxHR}    onChange={e=>setForm(p=>({...p,maxHR:e.target.value}))}/>
            <LabeledInput label="Calorías" type="number" value={form.calories} onChange={e=>setForm(p=>({...p,calories:e.target.value}))}/>
          </div>
          <div style={{background:"#fff",borderRadius:10,padding:"12px",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,color:T.textSoft,letterSpacing:1,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:8}}>RPE {form.rpe}/10</div>
            <input type="range" min="1" max="10" value={form.rpe} onChange={e=>setForm(p=>({...p,rpe:e.target.value}))}
              style={{width:"100%",accentColor:T.accent}}/>
          </div>
          <LabeledInput label="Notas" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Sensaciones, observaciones…"/>
          <FitUpload fileRef={fileRef} onChange={handleFit} fileName={form.fitFile} label="Subir .fit de entrenamiento"/>
          <Btn onClick={saveWorkout} saved={saved}>Guardar entrenamiento</Btn>
        </div>
      )}

      {mode==="health"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <LabeledInput label="Fecha" type="date" value={hForm.date} onChange={e=>setHForm(p=>({...p,date:e.target.value}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <LabeledInput label="Horas sueño" type="number" value={hForm.sleep}     onChange={e=>setHForm(p=>({...p,sleep:e.target.value}))}/>
            <LabeledInput label="HRV"          type="number" value={hForm.hrv}       onChange={e=>setHForm(p=>({...p,hrv:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <LabeledInput label="FC reposo"  type="number" value={hForm.restingHR} onChange={e=>setHForm(p=>({...p,restingHR:e.target.value}))}/>
            <LabeledInput label="Estrés 1–10" type="number" value={hForm.stress}    onChange={e=>setHForm(p=>({...p,stress:e.target.value}))}/>
          </div>
          <LabeledInput label="Peso (kg)" type="number" value={hForm.weight} onChange={e=>setHForm(p=>({...p,weight:e.target.value}))}/>
          <LabeledInput label="Notas"     value={hForm.notes}  onChange={e=>setHForm(p=>({...p,notes:e.target.value}))} placeholder="Cómo te sentiste hoy…"/>
          <FitUpload fileRef={hFileRef} onChange={handleHFit} fileName={hForm.fitFile} label="Subir .fit de salud (Garmin 745)" note="Incluye sueño, HRV y FC reposo del día"/>
          <Btn onClick={saveH} saved={saved}>Guardar salud</Btn>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY
// ════════════════════════════════════════════════════════════════════════════
function HistoryTab({workouts}){
  const [filter,setFilter]=useState("all");
  const all=Object.values(workouts).sort((a,b)=>b.date>a.date?1:-1);
  const filtered=filter==="all"?all:all.filter(w=>w.discipline===filter);
  const byDisc=d=>all.filter(w=>w.discipline===d);
  const sum=(arr,f)=>arr.reduce((a,w)=>a+(Number(w[f])||0),0);

  return(
    <div style={{padding:"16px"}}>
      <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:12}}>Volumen total acumulado</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
          {[
            {l:"Sesiones",v:all.length,c:T.accent},
            {l:"Swim (m)", v:sum(byDisc("swim"),"distance").toFixed(0),c:T.blue},
            {l:"Bike (km)",v:sum(byDisc("bike"),"distance").toFixed(0),c:T.yellow},
            {l:"Run (km)", v:sum(byDisc("run"),"distance").toFixed(1),c:T.green},
            {l:"Fuerza",   v:byDisc("strength").length+" ses",c:"#7C3AED"},
            {l:"Calorías", v:sum(all,"calories").toFixed(0),c:T.textMid},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:T.bgMuted,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:c}}>{v||"0"}</div>
              <div style={{fontSize:9,color:T.textSoft,marginTop:2,fontFamily:"system-ui,sans-serif"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {["all","swim","bike","run","strength"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${filter===f?T.accent:T.border}`,cursor:"pointer",whiteSpace:"nowrap",
              background:filter===f?T.accentBg:"#fff",color:filter===f?T.accent:T.textMid,fontSize:12,fontFamily:"system-ui,sans-serif"}}>
            {f==="all"?"Todos":DISC_EMOJI[f]+" "+f}
          </button>
        ))}
      </div>

      {filtered.length===0
        ?<div style={{fontSize:13,color:T.textSoft,fontStyle:"italic",padding:"8px 0"}}>Sin registros.</div>
        :filtered.map((w,i)=><WorkoutRow key={i} w={w} expanded/>)
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════════════════════
function HealthTab({health}){
  const entries=Object.entries(health).sort((a,b)=>b[0]>a[0]?1:-1).slice(0,14);
  const vals=f=>entries.map(([,v])=>Number(v[f])||0).filter(Boolean);
  const avg=arr=>arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1):"—";

  return(
    <div style={{padding:"16px"}}>
      <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:12}}>Promedios · 14 días</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {icon:"😴",label:"Sueño",    val:avg(vals("sleep"))+"h",    c:"#7C3AED",bg:"#F5F3FF"},
            {icon:"💓",label:"HRV",      val:avg(vals("hrv")),           c:"#DC2626",bg:"#FEF2F2"},
            {icon:"❤️",label:"FC reposo",val:avg(vals("restingHR"))+"bpm",c:T.yellow,bg:T.yellowBg},
            {icon:"😰",label:"Estrés",   val:avg(vals("stress"))+"/10", c:T.textMid,bg:T.bgMuted},
          ].map(({icon,label,val,c,bg})=>(
            <div key={label} style={{background:bg,borderRadius:12,padding:"14px 12px",textAlign:"center",border:`1px solid ${c}22`}}>
              <div style={{fontSize:22}}>{icon}</div>
              <div style={{fontSize:18,fontWeight:700,color:c,marginTop:4}}>{val}</div>
              <div style={{fontSize:9,color:T.textSoft,marginTop:2,letterSpacing:1,textTransform:"uppercase",fontFamily:"system-ui,sans-serif"}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10,paddingLeft:2}}>Historial</div>
      {entries.length===0
        ?<div style={{fontSize:13,color:T.textSoft,fontStyle:"italic"}}>Sin datos. Registrá en ➕</div>
        :entries.map(([date,v])=>(
          <div key={date} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,color:T.accent,marginBottom:6,fontFamily:"system-ui,sans-serif",textTransform:"uppercase",letterSpacing:1}}>{fmt(date)}</div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:13,color:T.textMid}}>
              {v.sleep&&<span>😴 <b style={{color:T.text}}>{v.sleep}h</b></span>}
              {v.hrv&&<span>💓 <b style={{color:T.text}}>{v.hrv}</b></span>}
              {v.restingHR&&<span>❤️ <b style={{color:T.text}}>{v.restingHR}bpm</b></span>}
              {v.weight&&<span>⚖️ <b style={{color:T.text}}>{v.weight}kg</b></span>}
              {v.stress&&<span>😰 <b style={{color:T.text}}>{v.stress}/10</b></span>}
            </div>
            {v.notes&&<div style={{fontSize:11,color:T.textSoft,marginTop:5,fontStyle:"italic"}}>{v.notes}</div>}
          </div>
        ))
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NUTRITION
// ════════════════════════════════════════════════════════════════════════════
function NutritionTab({nutrition,onSave,recipes,onSaveRecipes,medical,onSaveMedical}){
  const [sub,setSub]=useState("log");
  const [busy,setBusy]=useState(false);
  const [imgPrev,setImgPrev]=useState(null);
  const [imgB64,setImgB64]=useState(null);
  const [medFile,setMedFile]=useState(null);
  const [medB64,setMedB64]=useState(null);
  const [rPrompt,setRPrompt]=useState("");
  const [genR,setGenR]=useState(null);
  const imgRef=useRef(); const medRef=useRef();

  const handleImg=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setImgPrev(ev.target.result);setImgB64(ev.target.result.split(",")[1]);};r.readAsDataURL(f);};
  const handleMed=e=>{const f=e.target.files[0];if(!f)return;setMedFile(f.name);const r=new FileReader();r.onload=ev=>setMedB64(ev.target.result.split(",")[1]);r.readAsDataURL(f);};

  const analyzeFood=async()=>{
    if(!imgB64)return;setBusy(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,system:"Sos nutricionista deportivo para triatletas. Analizás fotos de comidas. Devolvé: calorías, proteínas/carbos/grasas en g, micronutrientes clave, y adecuación para un triatleta en entrenamiento. Conciso y práctico.",messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:imgB64}},{type:"text",text:"Analiza esta comida para un triatleta preparando Ironman 70.3."}]}]})});
      const d=await res.json();
      onSave([...nutrition,{date:today(),imgPreview:imgPrev,analysis:d.content?.[0]?.text||""}]);
      setImgPrev(null);setImgB64(null);
    }catch(e){}
    setBusy(false);
  };

  const analyzeMed=async()=>{
    if(!medB64)return;setBusy(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,system:"Sos nutricionista deportivo para triatletas. Analizás estudios médicos y dás recomendaciones nutricionales para Ironman 70.3.",messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:medB64}},{type:"text",text:"Analizá mis estudios y dá recomendaciones nutricionales para preparación Ironman 70.3."}]}]})});
      const d=await res.json();
      onSaveMedical({fileName:medFile,analysis:d.content?.[0]?.text||"",date:today()});
    }catch(e){}
    setBusy(false);
  };

  const generateRecipe=async()=>{
    if(!rPrompt)return;setBusy(true);
    const med=medical?.analysis?`\nDatos del atleta: ${medical.analysis.slice(0,400)}`:"";
    try{const r=await callClaude({system:"Sos chef nutricionista para triatletas. Recetas prácticas, nutritivas y específicas para deportistas de resistencia. Ingredientes, pasos simples y aporte nutricional.",messages:[{role:"user",content:rPrompt+med}],maxTokens:1100});setGenR(r);}catch(e){}
    setBusy(false);
  };

  const SUBS=[["log","📸 Foto comida"],["recipes","🍽️ Recetas"],["medical","🩺 Estudios"]];

  return(
    <div style={{padding:"16px"}}>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {SUBS.map(([s,l])=>(
          <button key={s} onClick={()=>setSub(s)}
            style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${sub===s?T.accent:T.border}`,cursor:"pointer",
              background:sub===s?T.accentBg:"#fff",color:sub===s?T.accent:T.textMid,fontSize:11,fontFamily:"system-ui,sans-serif",fontWeight:sub===s?600:400}}>
            {l}
          </button>
        ))}
      </div>

      {sub==="log"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`,textAlign:"center"}}>
            <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleImg} style={{display:"none"}}/>
            {imgPrev?<img src={imgPrev} alt="comida" style={{width:"100%",borderRadius:10,maxHeight:200,objectFit:"cover"}}/>
              :<div style={{fontSize:13,color:T.textSoft,padding:"20px 0",fontStyle:"italic"}}>📷 Fotografiá tu comida</div>}
            <button onClick={()=>imgRef.current.click()} style={{marginTop:10,background:T.bgMuted,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",color:T.textMid,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13}}>
              {imgPrev?"Cambiar":"Tomar / subir foto"}
            </button>
          </div>
          {imgPrev&&<button onClick={analyzeFood} disabled={busy} style={{width:"100%",background:busy?T.bgMuted:T.accent,color:busy?T.textSoft:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"system-ui,sans-serif",marginBottom:14}}>
            {busy?"Analizando…":"🔍 Analizar nutrición con IA"}</button>}
          <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>Registro de comidas</div>
          {nutrition.length===0?<div style={{fontSize:13,color:T.textSoft,fontStyle:"italic"}}>Sin registros.</div>
            :nutrition.slice().reverse().slice(0,8).map((n,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:"12px",marginBottom:8,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,color:T.accent,marginBottom:5,fontFamily:"system-ui,sans-serif",textTransform:"uppercase",letterSpacing:1}}>{fmt(n.date)}</div>
                {n.imgPreview&&<img src={n.imgPreview} alt="" style={{width:72,height:56,objectFit:"cover",borderRadius:8,float:"right",marginLeft:10}}/>}
                <div style={{fontSize:12,color:T.textMid,lineHeight:1.65,fontFamily:"system-ui,sans-serif"}}>{n.analysis?.slice(0,200)}…</div>
              </div>
            ))
          }
        </div>
      )}

      {sub==="recipes"&&(
        <div>
          <textarea value={rPrompt} onChange={e=>setRPrompt(e.target.value)} rows={3}
            placeholder="Ej: Receta alta en carbos para la noche antes de un fondo largo…"
            style={{width:"100%",background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px",color:T.text,fontSize:14,fontFamily:"system-ui,sans-serif",boxSizing:"border-box",resize:"vertical"}}/>
          <button onClick={generateRecipe} disabled={busy||!rPrompt}
            style={{width:"100%",marginTop:8,background:busy||!rPrompt?T.bgMuted:T.accent,color:busy||!rPrompt?T.textSoft:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:600,cursor:"pointer",fontFamily:"system-ui,sans-serif",marginBottom:14}}>
            {busy?"Generando…":"🍳 Generar receta con IA"}
          </button>
          {genR&&(
            <div style={{background:"#fff",borderRadius:12,padding:"14px",marginBottom:14,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:13,color:T.textMid,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"system-ui,sans-serif"}}>{genR}</div>
              <button onClick={()=>{onSaveRecipes([...recipes,{title:rPrompt,content:genR,date:today()}]);setGenR(null);setRPrompt("");}}
                style={{marginTop:10,background:T.greenBg,border:`1px solid ${T.green}44`,borderRadius:8,padding:"8px 16px",color:T.green,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13,fontWeight:600}}>
                ✓ Guardar receta
              </button>
            </div>
          )}
          <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>Guardadas</div>
          {recipes.length===0?<div style={{fontSize:13,color:T.textSoft,fontStyle:"italic"}}>Sin recetas guardadas.</div>
            :recipes.slice().reverse().map((r,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:"12px",marginBottom:8,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:13,color:T.accent,marginBottom:5}}>🍽️ {r.title}</div>
                <div style={{fontSize:12,color:T.textMid,lineHeight:1.6,fontFamily:"system-ui,sans-serif"}}>{r.content?.slice(0,130)}…</div>
              </div>
            ))
          }
        </div>
      )}

      {sub==="medical"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`,textAlign:"center"}}>
            <input ref={medRef} type="file" accept=".pdf,image/*" onChange={handleMed} style={{display:"none"}}/>
            <div style={{fontSize:13,color:T.textSoft,marginBottom:10,fontStyle:"italic"}}>Subí tus estudios (PDF o imagen) para recomendaciones personalizadas</div>
            <button onClick={()=>medRef.current.click()} style={{background:T.bgMuted,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 18px",color:T.textMid,cursor:"pointer",fontFamily:"system-ui,sans-serif"}}>
              📄 Subir estudios
            </button>
            {medFile&&<div style={{marginTop:8,fontSize:12,color:T.green,fontFamily:"system-ui,sans-serif"}}>✓ {medFile}</div>}
          </div>
          {medB64&&<button onClick={analyzeMed} disabled={busy}
            style={{width:"100%",background:busy?T.bgMuted:T.accent,color:busy?T.textSoft:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:600,cursor:"pointer",fontFamily:"system-ui,sans-serif",marginBottom:14}}>
            {busy?"Analizando…":"🩺 Analizar con IA"}</button>}
          {medical?.analysis&&(
            <div style={{background:"#fff",borderRadius:12,padding:"14px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.accent,marginBottom:8,fontFamily:"system-ui,sans-serif",textTransform:"uppercase",letterSpacing:1}}>Análisis · {fmt(medical.date)}</div>
              <div style={{fontSize:12,color:T.textMid,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"system-ui,sans-serif"}}>{medical.analysis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COACH
// ════════════════════════════════════════════════════════════════════════════
function CoachTab({workouts,health,notes,plan,medical,chat,setChat}){
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const bottomRef=useRef();
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  const buildCtx=()=>{
    const allW=Object.values(workouts).sort((a,b)=>b.date>a.date?1:-1).slice(0,12);
    const recentH=Object.entries(health).sort((a,b)=>b[0]>a[0]?1:-1).slice(0,7).map(([d,v])=>`${d}: sueño ${v.sleep}h HRV ${v.hrv} FC ${v.restingHR}`).join("; ");
    const planCtx=plan?.sessions?`\nPLANTILLA (${plan.weekLabel}):\n`+plan.sessions.map(s=>`${s.date} ${s.sport} "${s.task}" Zona:${s.zone} ${s.completed?"✅":"pendiente"}`).join("\n"):"";
    const lastNote=notes.length?notes[notes.length-1].text:"";
    return `Atleta: Lucas. Triatleta preparando Ironman 70.3 Punta del Este el 07/03/2026 (${daysUntil()} días / ${weeksUntil()} semanas).
Estructura: Lun(Nat+Fuerza) Mar(Bici) Mié(Run+Nat) Jue(Bici) Vie(Run+Nat) Sáb(descanso) Dom(Fondo bici).
Últimos entrenos: ${allW.map(w=>`${w.date} ${w.discipline} ${w.distance||""}${w.duration?"("+w.duration+"min)":""} RPE${w.rpe||"-"}`).join("; ")}.
Salud reciente: ${recentH}.
Última nota: ${lastNote}.${planCtx}
${medical?.analysis?"Datos médicos: "+medical.analysis.slice(0,400):""}`;
  };

  const send=async()=>{
    if(!input.trim())return;
    const userMsg={role:"user",content:input};
    const newChat=[...chat,userMsg];
    setChat(newChat);setInput("");setBusy(true);
    const sys=`Sos coach experto en triatlón de alto rendimiento. Tenés acceso completo a los datos del atleta. Consejos directos, concretos y basados en evidencia. Cuando hay plantilla activa, la considerás.\n\nCONTEXTO:\n${buildCtx()}`;
    try{
      const r=await callClaude({system:sys,messages:newChat,maxTokens:1200});
      setChat(prev=>[...prev,{role:"assistant",content:r}]);
    }catch{setChat(prev=>[...prev,{role:"assistant",content:"Error de conexión."}]);}
    setBusy(false);
  };

  const quickies=["¿Cómo estoy esta semana?","Feedback de la plantilla actual","¿Debo aumentar el volumen?","Evaluá mi recuperación","¿Qué priorizar esta semana?"];

  return(
    <div style={{padding:"16px",display:"flex",flexDirection:"column",minHeight:"72vh"}}>
      <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:12}}>
        Coach IA · {daysUntil()} días para la carrera
      </div>
      {chat.length===0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:T.textSoft,marginBottom:8,fontStyle:"italic",fontFamily:"system-ui,sans-serif"}}>Preguntas rápidas:</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {quickies.map((q,i)=>(
              <button key={i} onClick={()=>setInput(q)}
                style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 13px",color:T.textMid,textAlign:"left",cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13,transition:"border-color .2s"}}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{flex:1,marginBottom:10}}>
        {chat.map((m,i)=>(
          <div key={i} style={{marginBottom:12,display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"86%",
              background:m.role==="user"?T.accent:"#fff",
              color:m.role==="user"?"#fff":T.text,
              border:m.role==="user"?"none":`1px solid ${T.border}`,
              borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
              padding:"11px 14px",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",
              fontFamily:"system-ui,sans-serif",
              boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
              {m.content}
            </div>
          </div>
        ))}
        {busy&&<div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"12px 16px",display:"inline-block",fontSize:13,color:T.textSoft,fontStyle:"italic",fontFamily:"system-ui,sans-serif"}}>Analizando tus datos…</div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Preguntale a tu coach…"
          style={{flex:1,background:"#fff",border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",color:T.text,fontSize:14,fontFamily:"system-ui,sans-serif"}}/>
        <button onClick={send} disabled={busy||!input.trim()}
          style={{background:busy||!input.trim()?T.bgMuted:T.accent,border:"none",borderRadius:12,padding:"0 18px",color:busy||!input.trim()?T.textSoft:"#fff",fontWeight:700,cursor:"pointer",fontSize:18,transition:"all .2s"}}>
          →
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NOTES
// ════════════════════════════════════════════════════════════════════════════
function NotesTab({notes,onSave}){
  const [text,setText]=useState("");
  const [date,setDate]=useState(today());
  const [tag,setTag]=useState("general");
  const tags=[["general","#6B5E52"],["dolencia","#DC2626"],["motivación","#D97706"],["plan",T.blue],["reflexión","#7C3AED"]];

  return(
    <div style={{padding:"16px"}}>
      <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>Nueva nota</div>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{width:"100%",background:T.bgMuted,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",color:T.text,fontSize:14,fontFamily:"system-ui,sans-serif",boxSizing:"border-box",marginBottom:10}}/>
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          {tags.map(([t,c])=>(
            <button key={t} onClick={()=>setTag(t)}
              style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${tag===t?c:T.border}`,cursor:"pointer",
                background:tag===t?c+"18":"#fff",color:tag===t?c:T.textSoft,fontSize:12,fontFamily:"system-ui,sans-serif",fontWeight:tag===t?600:400}}>
              {t}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={4}
          placeholder="Dolencia, sensación del entreno, reflexión…"
          style={{width:"100%",background:T.bgMuted,border:`1px solid ${T.border}`,borderRadius:10,padding:"11px",color:T.text,fontSize:14,fontFamily:"system-ui,sans-serif",boxSizing:"border-box",resize:"vertical",marginBottom:10}}/>
        <button onClick={()=>{if(!text.trim())return;onSave([...notes,{date,text,tag}]);setText("");}}
          style={{width:"100%",background:T.accent,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:600,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:14}}>
          Guardar nota
        </button>
      </div>

      <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>Notas ({notes.length})</div>
      {notes.length===0?<div style={{fontSize:13,color:T.textSoft,fontStyle:"italic"}}>Sin notas.</div>
        :notes.slice().reverse().map((n,i)=>{
          const tagColor=tags.find(([t])=>t===n.tag)?.[1]||T.textMid;
          return(
            <div key={i} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`,borderLeft:`3px solid ${tagColor}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:T.accent,fontFamily:"system-ui,sans-serif",textTransform:"uppercase",letterSpacing:1}}>{fmt(n.date)}</span>
                <span style={{fontSize:10,color:tagColor,background:tagColor+"18",padding:"2px 8px",borderRadius:10,fontFamily:"system-ui,sans-serif"}}>{n.tag}</span>
              </div>
              <div style={{fontSize:13,color:T.textMid,lineHeight:1.65}}>{n.text}</div>
            </div>
          );
        })
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
function Card({title,children}){
  return(
    <div style={{background:"#fff",margin:"12px 16px 0",borderRadius:14,padding:"16px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",border:`1px solid ${T.border}`}}>
      <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:12}}>{title}</div>
      {children}
    </div>
  );
}

function LabeledInput({label,type="text",value,onChange,placeholder,step}){
  return(
    <div>
      {label&&<div style={{fontSize:10,color:T.textSoft,letterSpacing:1,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:5}}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder||""} step={step}
        style={{width:"100%",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",color:T.text,fontSize:14,fontFamily:"system-ui,sans-serif",boxSizing:"border-box"}}/>
    </div>
  );
}

function FitUpload({fileRef,onChange,fileName,label,note}){
  return(
    <div style={{background:T.bgMuted,border:`1px dashed ${T.border}`,borderRadius:10,padding:"13px",textAlign:"center"}}>
      <input ref={fileRef} type="file" accept=".fit" onChange={onChange} style={{display:"none"}}/>
      <button onClick={()=>fileRef.current.click()}
        style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 16px",color:T.textMid,cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:13}}>
        📎 {label||"Subir .fit"}
      </button>
      {fileName&&<div style={{marginTop:6,fontSize:12,color:T.green,fontFamily:"system-ui,sans-serif"}}>✓ {fileName}</div>}
      {note&&<div style={{marginTop:4,fontSize:11,color:T.textSoft,fontFamily:"system-ui,sans-serif"}}>{note}</div>}
    </div>
  );
}

function Btn({onClick,saved,children}){
  return(
    <button onClick={onClick}
      style={{background:saved?T.greenBg:T.accent,color:saved?T.green:"#fff",border:saved?`1px solid ${T.green}44`:"none",borderRadius:10,padding:"14px",fontWeight:600,fontSize:15,cursor:"pointer",fontFamily:"system-ui,sans-serif",transition:"all .3s"}}>
      {saved?"✓ Guardado":children}
    </button>
  );
}

function WorkoutRow({w,expanded}){
  const disc=w.discipline||"run";
  const color=DISC_COLOR[disc]||T.textSoft;
  return(
    <div style={{background:"#fff",borderRadius:10,padding:"11px 13px",marginBottom:7,display:"flex",alignItems:"flex-start",gap:11,border:`1px solid ${T.border}`,borderLeft:`3px solid ${color}`}}>
      <span style={{fontSize:20,lineHeight:1.2}}>{DISC_EMOJI[disc]||"🏋️"}</span>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:13,fontWeight:600,color:T.text}}>{w.task||disc.charAt(0).toUpperCase()+disc.slice(1)}</span>
          <span style={{fontSize:10,color:T.textSoft,fontFamily:"system-ui,sans-serif"}}>{fmt(w.date)}</span>
        </div>
        <div style={{fontSize:11,color:T.textSoft,marginTop:2,display:"flex",gap:9,flexWrap:"wrap",fontFamily:"system-ui,sans-serif"}}>
          {w.distance&&<span>📏 {w.distance}{disc==="swim"?"m":"km"}</span>}
          {w.duration&&<span>⏱ {w.duration}min</span>}
          {w.avgHR&&<span>❤️ {w.avgHR}bpm</span>}
          {w.rpe&&<span>💥 RPE {w.rpe}</span>}
          {w.zone&&<span>🎯 {w.zone}</span>}
        </div>
        {expanded&&w.notes&&<div style={{fontSize:11,color:T.textSoft,marginTop:4,fontStyle:"italic"}}>{w.notes}</div>}
      </div>
    </div>
  );
}

function WeekStrip({workouts,plan}){
  const days=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const now=new Date();
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(now.getDate()-now.getDay()+i);return d.toISOString().slice(0,10);});
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
      {weekDays.map((date,i)=>{
        const hasW=Object.values(workouts).some(w=>w.date===date);
        const isToday_=date===today();
        const planItems=plan?.sessions?.filter(s=>s.date===date)||[];
        const allDone=planItems.length>0&&planItems.every(s=>s.completed);
        const disc=planItems.length>0?normDisc(planItems[0].sport):null;
        return(
          <div key={date} style={{textAlign:"center"}}>
            <div style={{fontSize:8,color:T.textSoft,marginBottom:3,fontFamily:"system-ui,sans-serif"}}>{days[i]}</div>
            <div style={{
              background:hasW||allDone?T.greenBg:isToday_?T.accentBg:T.bgMuted,
              borderRadius:8,padding:"7px 2px",
              border:`1px solid ${isToday_?T.accent:hasW||allDone?T.green+"44":T.border}`,
              position:"relative"}}>
              {hasW||allDone
                ?<span style={{fontSize:13,color:T.green}}>✓</span>
                :disc?<span style={{fontSize:11}}>{DISC_EMOJI[disc]}</span>
                :<span style={{fontSize:10,color:T.border}}>—</span>
              }
              {planItems.length>1&&!hasW&&(
                <span style={{position:"absolute",top:-4,right:-4,fontSize:9,background:T.accent,color:"#fff",borderRadius:"50%",width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontFamily:"system-ui,sans-serif"}}>
                  {planItems.length}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTES TAB  — GPX upload + Leaflet map
// ════════════════════════════════════════════════════════════════════════════

// ── GPX parser ────────────────────────────────────────────────────────────────
function parseGPX(xmlStr) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlStr, "application/xml");
  const pts    = Array.from(doc.querySelectorAll("trkpt"));
  if (!pts.length) return null;

  const coords = pts.map(p => ({
    lat: parseFloat(p.getAttribute("lat")),
    lon: parseFloat(p.getAttribute("lon")),
    ele: parseFloat(p.querySelector("ele")?.textContent || 0),
    time: p.querySelector("time")?.textContent || null,
  }));

  // Stats
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    const R = 6371000;
    const dLat = (coords[i].lat - coords[i-1].lat) * Math.PI/180;
    const dLon = (coords[i].lon - coords[i-1].lon) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(coords[i-1].lat*Math.PI/180)*Math.cos(coords[i].lat*Math.PI/180)*Math.sin(dLon/2)**2;
    dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const eles  = coords.map(c=>c.ele).filter(Boolean);
  const gains = [];
  for (let i=1;i<eles.length;i++) { const d=eles[i]-eles[i-1]; if(d>0) gains.push(d); }
  const elevGain = gains.reduce((a,b)=>a+b,0);

  const name = doc.querySelector("name")?.textContent || doc.querySelector("trk > name")?.textContent || "Sin nombre";

  let durationMin = null;
  if (coords[0]?.time && coords[coords.length-1]?.time) {
    durationMin = Math.round((new Date(coords[coords.length-1].time) - new Date(coords[0].time)) / 60000);
  }

  const bounds = {
    minLat: Math.min(...coords.map(c=>c.lat)),
    maxLat: Math.max(...coords.map(c=>c.lat)),
    minLon: Math.min(...coords.map(c=>c.lon)),
    maxLon: Math.max(...coords.map(c=>c.lon)),
  };

  return { coords, dist, elevGain, name, durationMin, bounds,
    center: [(bounds.minLat+bounds.maxLat)/2, (bounds.minLon+bounds.maxLon)/2] };
}

// ── Leaflet map component ─────────────────────────────────────────────────────
function RouteMap({ route, height=320 }) {
  const mapRef  = useRef(null);
  const instRef = useRef(null);
  const id      = useRef("map_" + Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!route || !mapRef.current) return;

    // Load Leaflet CSS once
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id  = "leaflet-css";
      link.rel = "stylesheet";
      link.href= "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (instRef.current) { instRef.current.remove(); instRef.current = null; }
      const L   = window.L;
      const map = L.map(id.current, { zoomControl:true, scrollWheelZoom:false });
      instRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom:19
      }).addTo(map);

      const disc = route.discipline;
      const color= disc==="bike"?"#D97706":disc==="run"?"#2D7A4F":disc==="swim"?"#2563EB":"#E05C2A";

      const latlngs = route.coords.map(c=>[c.lat,c.lon]);
      const poly = L.polyline(latlngs, { color, weight:4, opacity:.85 }).addTo(map);

      // Start / end markers
      const dotIcon = (fill) => L.divIcon({
        html:`<div style="width:12px;height:12px;border-radius:50%;background:${fill};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        className:"", iconSize:[12,12], iconAnchor:[6,6]
      });
      L.marker(latlngs[0], {icon:dotIcon(color)}).addTo(map)
        .bindPopup("<b>Inicio</b>");
      L.marker(latlngs[latlngs.length-1], {icon:dotIcon("#1C1917")}).addTo(map)
        .bindPopup("<b>Fin</b>");

      map.fitBounds(poly.getBounds(), {padding:[18,18]});
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => { if (instRef.current) { instRef.current.remove(); instRef.current = null; } };
  }, [route]);

  return (
    <div ref={mapRef} id={id.current}
      style={{width:"100%",height,borderRadius:12,overflow:"hidden",zIndex:0,position:"relative",border:`1px solid ${T.border}`}}/>
  );
}

// ── Elevation mini-chart ──────────────────────────────────────────────────────
function ElevChart({ coords, color="#E05C2A" }) {
  const W=320, H=56, PAD=4;
  const eles = coords.map(c=>c.ele).filter(e=>e>0);
  if (eles.length < 2) return null;
  const mn=Math.min(...eles), mx=Math.max(...eles);
  if (mx===mn) return null;
  const pts = eles.map((e,i)=>{
    const x = PAD + (i/(eles.length-1))*(W-PAD*2);
    const y = PAD + (1-(e-mn)/(mx-mn))*(H-PAD*2);
    return `${x},${y}`;
  }).join(" ");
  const area = `${PAD},${H-PAD} ` + pts + ` ${W-PAD},${H-PAD}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}>
      <polygon points={area} fill={color+"22"}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main RoutesTab ─────────────────────────────────────────────────────────────
function RoutesTab({ routes, onSave }) {
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [uploading,setUploading]= useState(false);
  const [error,    setError]    = useState("");
  const fileRef = useRef();

  const DISC_OPTIONS = [
    {id:"all",   label:"Todas",    emoji:"🗺"},
    {id:"bike",  label:"Bici",     emoji:"🚴"},
    {id:"run",   label:"Running",  emoji:"🏃"},
    {id:"swim",  label:"Natación", emoji:"🏊"},
    {id:"other", label:"Otras",    emoji:"🏋️"},
  ];

  const handleGPX = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true); setError("");
    const newRoutes = [];
    for (const f of files) {
      try {
        const txt  = await f.text();
        const data = parseGPX(txt);
        if (!data) { setError(`No se pudo parsear ${f.name}`); continue; }
        // guess discipline from filename / name
        const lower = (f.name + data.name).toLowerCase();
        const disc  = lower.includes("bike")||lower.includes("bici")||lower.includes("ciclismo")||lower.includes("ride") ? "bike"
          : lower.includes("run")||lower.includes("corre") ? "run"
          : lower.includes("swim")||lower.includes("nat") ? "swim"
          : "other";
        newRoutes.push({ id:Date.now()+"_"+Math.random().toString(36).slice(2),
          name:data.name, date:today(), discipline:disc,
          dist:data.dist, elevGain:data.elevGain, durationMin:data.durationMin,
          center:data.center, bounds:data.bounds,
          // store a sampled version of coords to keep storage light (max 500 pts)
          coords: data.coords.filter((_,i,a)=>i===0||i===a.length-1||i%Math.max(1,Math.floor(a.length/500))===0),
          fileName:f.name });
      } catch(err) { setError("Error leyendo "+f.name); }
    }
    if (newRoutes.length) {
      const updated = [...routes, ...newRoutes];
      await onSave(updated);
      setSelected(newRoutes[0].id);
    }
    setUploading(false);
    e.target.value = "";
  };

  const deleteRoute = async (id) => {
    const updated = routes.filter(r=>r.id!==id);
    await onSave(updated);
    if (selected===id) setSelected(updated.length?updated[updated.length-1].id:null);
  };

  const filtered = filter==="all" ? routes : routes.filter(r=>r.discipline===filter);
  const activeRoute = routes.find(r=>r.id===selected) || filtered[0] || null;

  const disc_color = d => d==="bike"?T.yellow:d==="run"?T.green:d==="swim"?T.blue:"#7C3AED";
  const fmtDist = (m,d) => d==="swim" ? (m).toFixed(0)+"m" : (m/1000).toFixed(2)+"km";
  const fmtDur  = min => min==null?"—":`${Math.floor(min/60)}h ${min%60}min`;

  return (
    <div style={{padding:"16px"}}>

      {/* UPLOAD */}
      <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>Subir rutas GPX</div>
        <input ref={fileRef} type="file" accept=".gpx" multiple onChange={handleGPX} style={{display:"none"}}/>
        <button onClick={()=>fileRef.current.click()} disabled={uploading}
          style={{width:"100%",background:uploading?T.bgMuted:T.accentBg,color:uploading?T.textSoft:T.accent,border:`1px solid ${T.accent}44`,borderRadius:10,padding:"12px",fontSize:14,fontFamily:"system-ui,sans-serif",fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
          {uploading?"Procesando…":"📍 Subir archivo(s) .gpx de Garmin Connect"}
        </button>
        {error&&<div style={{marginTop:6,fontSize:12,color:"#DC2626",fontFamily:"system-ui,sans-serif"}}>{error}</div>}
        <div style={{marginTop:8,fontSize:11,color:T.textSoft,fontFamily:"system-ui,sans-serif",lineHeight:1.6}}>
          En Garmin Connect: Actividad → ··· → Exportar GPX. Podés subir varias a la vez.
        </div>
      </div>

      {routes.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:T.textSoft,fontStyle:"italic",fontSize:14}}>
          Todavía no hay rutas cargadas.<br/>Exportá un GPX de Garmin Connect y subilo arriba.
        </div>
      ) : (
        <>
          {/* FILTER PILLS */}
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
            {DISC_OPTIONS.map(o=>{
              const count = o.id==="all" ? routes.length : routes.filter(r=>r.discipline===o.id).length;
              if (o.id!=="all" && count===0) return null;
              return (
                <button key={o.id} onClick={()=>setFilter(o.id)}
                  style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${filter===o.id?T.accent:T.border}`,cursor:"pointer",whiteSpace:"nowrap",
                    background:filter===o.id?T.accentBg:"#fff",color:filter===o.id?T.accent:T.textMid,
                    fontSize:12,fontFamily:"system-ui,sans-serif",display:"flex",gap:4,alignItems:"center"}}>
                  {o.emoji} {o.label} <span style={{fontSize:10,opacity:.7}}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE MAP */}
          {activeRoute && (
            <div style={{background:"#fff",borderRadius:14,marginBottom:14,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
              {/* Route header */}
              <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${T.bgMuted}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <span style={{display:"inline-block",background:disc_color(activeRoute.discipline)+"18",color:disc_color(activeRoute.discipline),fontSize:10,padding:"2px 8px",borderRadius:10,fontFamily:"system-ui,sans-serif",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
                      {DISC_EMOJI[activeRoute.discipline]} {activeRoute.discipline}
                    </span>
                    <div style={{fontSize:15,fontWeight:600,color:T.text}}>{activeRoute.name}</div>
                    <div style={{fontSize:11,color:T.textSoft,fontFamily:"system-ui,sans-serif",marginTop:2}}>{fmt(activeRoute.date)} · {activeRoute.fileName}</div>
                  </div>
                </div>
                {/* Stats row */}
                <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
                  {[
                    {label:"Distancia",val:fmtDist(activeRoute.dist,activeRoute.discipline)},
                    {label:"Duración", val:fmtDur(activeRoute.durationMin)},
                    {label:"Desnivel", val:activeRoute.elevGain>0?"+"+activeRoute.elevGain.toFixed(0)+"m":"—"},
                  ].map(({label,val})=>(
                    <div key={label} style={{textAlign:"center"}}>
                      <div style={{fontSize:16,fontWeight:700,color:disc_color(activeRoute.discipline)}}>{val}</div>
                      <div style={{fontSize:9,color:T.textSoft,textTransform:"uppercase",letterSpacing:1,fontFamily:"system-ui,sans-serif"}}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MAP */}
              <RouteMap route={activeRoute} height={280}/>

              {/* Elevation */}
              {activeRoute.coords.some(c=>c.ele>0) && (
                <div style={{padding:"10px 16px 14px"}}>
                  <div style={{fontSize:9,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:4}}>Perfil de elevación</div>
                  <ElevChart coords={activeRoute.coords} color={disc_color(activeRoute.discipline)}/>
                </div>
              )}
            </div>
          )}

          {/* ROUTE LIST */}
          <div style={{fontSize:11,color:T.textSoft,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui,sans-serif",marginBottom:10}}>
            {filtered.length} ruta{filtered.length!==1?"s":""} · {filter==="all"?"todas":filter}
          </div>
          {filtered.slice().reverse().map(r=>(
            <div key={r.id}
              onClick={()=>setSelected(r.id)}
              style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",
                border:`1px solid ${selected===r.id?disc_color(r.discipline):T.border}`,
                borderLeft:`3px solid ${disc_color(r.discipline)}`,
                boxShadow:selected===r.id?"0 2px 8px rgba(0,0,0,0.08)":"0 1px 3px rgba(0,0,0,0.04)",
                transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{DISC_EMOJI[r.discipline]||"🗺"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                  <div style={{fontSize:11,color:T.textSoft,fontFamily:"system-ui,sans-serif",marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span>📏 {fmtDist(r.dist,r.discipline)}</span>
                    {r.durationMin&&<span>⏱ {fmtDur(r.durationMin)}</span>}
                    {r.elevGain>0&&<span>↑ {r.elevGain.toFixed(0)}m</span>}
                    <span>{fmt(r.date)}</span>
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();deleteRoute(r.id);}}
                  style={{background:"none",border:"none",cursor:"pointer",color:T.textSoft,fontSize:16,padding:"4px",flexShrink:0}}
                  title="Eliminar ruta">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
