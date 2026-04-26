import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Storage (localStorage wrapper) ──────────────────────────────────────────
const storage = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, val); } catch {} },
  delete: (key) => { try { localStorage.removeItem(key); } catch {} },
};

// ─── Constants ───────────────────────────────────────────────────────────────
const USD_TO_DKK = 6.88;
const fmtDKK = (usd) => usd ? `${Math.round(usd * USD_TO_DKK)} kr.` : "—";

// Kendte sætstørrelser (antal kort i sættet ekskl. secret rares)
const SET_SIZES={
  "Journey Together":159,"Surging Sparks":191,"Stellar Crown":175,
  "Twilight Masquerade":167,"Paldean Fates":245,"Paradox Rift":182,
  "Obsidian Flames":197,"Scarlet & Violet":198,"Paldea Evolved":193,
  "151":165,"Crown Zenith":159,"Silver Tempest":195,"Lost Origin":196,
  "Astral Radiance":189,"Brilliant Stars":172,"Fusion Strike":264,
  "Evolving Skies":203,"Chilling Reign":198,"Battle Styles":163,
  "Shining Fates":195,"Vivid Voltage":185,"Champion's Path":73,
  "Darkness Ablaze":185,"Rebel Clash":192,"Sword & Shield":202,
  "XY — Flash Fire":106,"XY — Phantom Forces":119,
};

const typeColors = {
  Fire:"#FF6B35",Water:"#4A90D9",Grass:"#5BAD6F",Electric:"#F5C518",
  Psychic:"#C77DFF",Fighting:"#C0392B",Dark:"#8B9BB4",Steel:"#95A5A6",
  Dragon:"#6C3483",Fairy:"#FF85A1",Normal:"#A0A0A0",Ice:"#85C1E9",
  Ghost:"#7D3C98",Rock:"#8D6E63",Ground:"#D4A857",Bug:"#82AE46",
  Poison:"#8E44AD",Flying:"#87CEEB",
};


async function toJpegBase64(dataUrl) {
  return new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement("canvas");
      c.width=img.width;c.height=img.height;
      c.getContext("2d").drawImage(img,0,0);
      resolve(c.toDataURL("image/jpeg",0.92).split(",")[1]);
    };
    img.src=dataUrl;
  });
}

// ─── Small components ─────────────────────────────────────────────────────────
function StarRating({count}){
  return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5,6].map(i=><span key={i} style={{fontSize:13,color:i<=count?"#F5C518":"#2a2a3a",textShadow:i<=count?"0 0 8px #F5C51888":"none"}}>★</span>)}</div>;
}

function PriceBar({label,value,max,color,animate}){
  const pct=value&&max>0?Math.min((value/max)*100,100):0;
  return(
    <div style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11,color:"#888"}}>
        <span>{label}</span><span style={{color:"#fff",fontWeight:700}}>{fmtDKK(value)}</span>
      </div>
      <div style={{height:5,background:"#111128",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:animate?`${pct}%`:"0%",height:"100%",background:`linear-gradient(90deg,${color}66,${color})`,borderRadius:3,transition:"width 1.2s cubic-bezier(0.4,0,0.2,1)"}}/>
      </div>
    </div>
  );
}

function TypeBadge({type}){
  const c=typeColors[type]||"#888";
  return <span style={{background:`${c}22`,border:`1px solid ${c}44`,borderRadius:6,padding:"4px 10px",fontSize:10,color:c,fontWeight:700}}>{type}</span>;
}

function Tag({children}){
  return <span style={{background:"#111128",border:"1px solid #1e1e38",borderRadius:5,padding:"3px 8px",fontSize:9,color:"#777"}}>{children}</span>;
}

function Btn({onClick,disabled,gradient,children,style={}}){
  return(
    <button onClick={onClick} disabled={disabled} style={{
      padding:"13px 16px",border:"none",borderRadius:10,
      background:disabled?"#1a1a2e":gradient||"#0d0d22",
      color:disabled?"#333":"#fff",fontSize:11,fontWeight:700,
      letterSpacing:"0.08em",textTransform:"uppercase",
      cursor:disabled?"not-allowed":"pointer",
      fontFamily:"'Space Mono',monospace",transition:"all 0.2s",
      boxShadow:(!disabled&&gradient)?`0 4px 20px ${gradient.includes("F5C518")?"#F5C51844":"#C77DFF44"}`:"none",
      ...style,
    }}>{children}</button>
  );
}

// ─── Set progress ─────────────────────────────────────────────────────────────
function bulbapediaUrl(setName){
  return`https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(setName.replace(/ /g,"_"))}_(TCG)`;
}

function setMotivation(owned,total,pct){
  if(pct===100) return"Sæt komplet! 🎉";
  const left=total-owned;
  if(pct>=76) return`Kun ${left} kort tilbage! 😱`;
  if(pct>=51) return"Mere end halvvejs! 🔥";
  if(pct>=26) return"Du er halvvejs der! 💪";
  if(pct>=11) return"Du er på vej! ⚡";
  return"Godt begyndt! 🚀";
}

function SetProgressCard({setName,owned,total,compact=false}){
  const pct=total?Math.round((owned/total)*100):null;
  const barColor=pct===100?"#5BAD6F":pct>=50?"#F5C518":"#C77DFF";
  return(
    <div style={{background:"#0d0d22",border:`1px solid ${barColor}33`,borderRadius:16,padding:compact?"14px 16px":"20px",marginBottom:compact?0:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:compact?10:13,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{setName}</p>
          {pct!==null&&<p style={{margin:"3px 0 0",fontSize:9,color:barColor}}>{setMotivation(owned,total,pct)}</p>}
        </div>
        <a href={bulbapediaUrl(setName)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{flexShrink:0,marginLeft:10,fontSize:9,color:"#4A90D9",textDecoration:"none",border:"1px solid #4A90D933",borderRadius:6,padding:"3px 8px",whiteSpace:"nowrap"}}>Kortliste ↗</a>
      </div>

      <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:10}}>
        <span style={{fontSize:compact?28:36,fontWeight:700,color:barColor,textShadow:`0 0 24px ${barColor}55`,lineHeight:1}}>{owned}</span>
        {total&&<span style={{fontSize:compact?11:14,color:"#444"}}>af {total} kort</span>}
      </div>

      {total&&<>
        <div style={{height:compact?10:16,background:"#111128",borderRadius:20,overflow:"hidden",boxShadow:"inset 0 2px 6px #00000055"}}>
          <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,#C77DFF88,${barColor})`,borderRadius:20,transition:"width 1.3s cubic-bezier(0.4,0,0.2,1)",boxShadow:`0 0 12px ${barColor}66`}}/>
        </div>
        <p style={{margin:"5px 0 0",fontSize:9,color:"#333",textAlign:"right"}}>{pct}%</p>
      </>}
    </div>
  );
}

function SetsSection({portfolio}){
  const sets=[...new Set(portfolio.map(c=>c.set).filter(Boolean))]
    .map(name=>({
      name,
      owned:new Set(portfolio.filter(c=>c.set===name).map(c=>c.cardNumber)).size,
      total:SET_SIZES[name]||null,
    }))
    .sort((a,b)=>{
      const pa=a.total?(a.owned/a.total):0;
      const pb=b.total?(b.owned/b.total):0;
      return pb-pa;
    });
  if(!sets.length) return null;
  return(
    <div style={{marginTop:24}}>
      <p style={{fontSize:9,color:"#444",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 12px"}}>Dine sæt</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {sets.map(s=><SetProgressCard key={s.name} setName={s.name} owned={s.owned} total={s.total}/>)}
      </div>
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS=["#F5C518","#FF6B35","#C77DFF","#4A90D9","#5BAD6F","#FF85A1","#fff","#FF3860"];
function Confetti({big,onDone}){
  const particles=useMemo(()=>Array.from({length:big?90:55},(_,i)=>({
    id:i,
    x:Math.random()*100,
    delay:Math.random()*0.9,
    dur:2.4+Math.random()*1.8,
    size:big?8+Math.random()*10:5+Math.random()*7,
    color:CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)],
    rot:Math.random()*360,
    circle:Math.random()>0.4,
    drift:(Math.random()-0.5)*120,
  })),[]);
  useEffect(()=>{const t=setTimeout(onDone,4000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:200,overflow:"hidden"}}>
      {particles.map(p=>(
        <div key={p.id} style={{
          position:"absolute",left:`${p.x}%`,top:-16,
          width:p.size,height:p.circle?p.size:p.size*0.5,
          background:p.color,borderRadius:p.circle?"50%":"2px",
          animation:`confettiFall ${p.dur}s ${p.delay}s cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
          "--drift":`${p.drift}px`,
          boxShadow:p.color==="#F5C518"?`0 0 6px ${p.color}`:"none",
        }}/>
      ))}
    </div>
  );
}

// ─── Scanning overlay ─────────────────────────────────────────────────────────
function ScanningOverlay({image}){
  const[step,setStep]=useState(0);
  const[tick,setTick]=useState(0);
  const steps=[
    {icon:"🔍",label:"Genkender Pokémon-kort"},
    {icon:"📡",label:"Søger TCG-database"},
    {icon:"💰",label:"Beregner markedsværdi"},
    {icon:"🏆",label:"Tjekker PSA-graderinger"},
    {icon:"✨",label:"Færdiggør analyse"},
  ];
  // Random-looking price ticker
  const seeds=[142,387,256,489,73,318,95,441,207,364];
  const fakePrice=seeds[tick%seeds.length]+Math.floor(tick*1.7)%200;

  useEffect(()=>{
    const si=setInterval(()=>setStep(s=>Math.min(s+1,steps.length-1)),780);
    const ti=setInterval(()=>setTick(t=>t+1),110);
    return()=>{clearInterval(si);clearInterval(ti);};
  },[]);

  return(
    <div style={{position:"fixed",inset:0,zIndex:50,background:"#08081a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 28px",fontFamily:"'Space Mono',monospace"}}>
      {/* bg glow */}
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% 35%,#2a0a5a 0%,transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",inset:0,backgroundImage:"radial-gradient(circle at 1px 1px,#ffffff04 1px,transparent 0)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>

      {/* Title */}
      <p style={{position:"relative",margin:"0 0 20px",fontSize:10,letterSpacing:"0.25em",color:"#C77DFF",textTransform:"uppercase",animation:"pulse 1.5s ease-in-out infinite"}}>⚡ Analyserer kort</p>

      {/* Card with scan line */}
      <div style={{position:"relative",width:148,height:207,marginBottom:24,borderRadius:10,overflow:"hidden",boxShadow:"0 0 0 2px #C77DFF44,0 0 40px #C77DFF33,0 0 80px #C77DFF11",flexShrink:0}}>
        {image&&<img src={image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
        {/* Scan line */}
        <div style={{position:"absolute",left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#C77DFFcc,#fff,#C77DFFcc,transparent)",boxShadow:"0 0 12px #C77DFF,0 0 24px #C77DFF88",animation:"scanCard 1.6s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Overlay tint */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#C77DFF08,#4A90D908)",pointerEvents:"none"}}/>
      </div>

      {/* Price ticker */}
      <div style={{marginBottom:28,textAlign:"center"}}>
        <p style={{margin:"0 0 2px",fontSize:9,color:"#444",letterSpacing:"0.2em",textTransform:"uppercase"}}>Estimeret værdi</p>
        <p style={{margin:0,fontSize:38,fontWeight:700,color:"#F5C518",textShadow:"0 0 30px #F5C51888,0 0 60px #F5C51844",letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums",animation:"flicker 0.11s step-end infinite"}}>
          {step<steps.length-1?`${fakePrice} kr.`:"— kr."}
        </p>
      </div>

      {/* Steps */}
      <div style={{width:"100%",maxWidth:260,position:"relative"}}>
        {steps.map((s,i)=>{
          const done=i<step;
          const active=i===step;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,opacity:done||active?1:0.18,transition:"opacity 0.5s"}}>
              <span style={{fontSize:13,width:20,textAlign:"center",flexShrink:0,filter:active?"drop-shadow(0 0 6px #C77DFF)":"none"}}>
                {done?"✓":active?"⚡":s.icon}
              </span>
              <span style={{fontSize:10,color:done?"#5BAD6F":active?"#fff":"#333",flex:1,transition:"color 0.4s",letterSpacing:"0.04em"}}>
                {s.label}{active&&<span style={{animation:"blink 0.8s step-end infinite"}}>_</span>}
              </span>
              {done&&<span style={{fontSize:9,color:"#5BAD6F44"}}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Camera viewfinder ────────────────────────────────────────────────────────
function CameraViewfinder({onCapture}){
  const videoRef=useRef();
  const[ready,setReady]=useState(false);
  const[camErr,setCamErr]=useState(null);
  const[focusPt,setFocusPt]=useState(null); // {x,y} in px relative to container

  useEffect(()=>{
    let stream;
    (async()=>{
      try{
        stream=await navigator.mediaDevices.getUserMedia({
          video:{
            facingMode:"environment",
            width:{ideal:1920},
            height:{ideal:1440},
            advanced:[{focusMode:"continuous"}],
          },
        });
        videoRef.current.srcObject=stream;
        videoRef.current.play();
        setReady(true);
      }catch(e){setCamErr("Kamera ikke tilgængeligt — brug fil-upload.");}
    })();
    return()=>{if(stream)stream.getTracks().forEach(t=>t.stop());};
  },[]);

  const tapToFocus=async(e)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const px=e.clientX-rect.left;
    const py=e.clientY-rect.top;
    // normalized [0,1] — x/y relative to the video element
    const nx=px/rect.width;
    const ny=py/rect.height;

    setFocusPt({x:px,y:py});
    setTimeout(()=>setFocusPt(null),1400);

    const track=videoRef.current?.srcObject?.getVideoTracks()[0];
    if(!track) return;
    try{
      const caps=track.getCapabilities?.()??{};
      const adv={};
      if(caps.focusMode?.includes("single-shot")) adv.focusMode="single-shot";
      else if(caps.focusMode?.includes("manual")) adv.focusMode="manual";
      if(caps.pointsOfInterest) adv.pointsOfInterest=[{x:nx,y:ny}];
      if(Object.keys(adv).length) await track.applyConstraints({advanced:[adv]});
    }catch{}
  };

  const capture=()=>{
    const v=videoRef.current;
    const c=document.createElement("canvas");
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    onCapture(c.toDataURL("image/jpeg",0.92));
  };

  return(
    <div onClick={tapToFocus} style={{position:"relative",width:"100%",aspectRatio:"3/4",maxHeight:440,background:"#060610",borderRadius:14,overflow:"hidden",cursor:"crosshair"}}>
      <video ref={videoRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>
      {ready&&<>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,#000000bb 0%,transparent 18%,transparent 82%,#000000bb 100%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,#000000bb 0%,transparent 12%,transparent 88%,#000000bb 100%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"8%",left:"12%",right:"12%",bottom:"12%",pointerEvents:"none"}}>
          <div style={{position:"absolute",inset:0,borderRadius:10,boxShadow:"0 0 0 2px #F5C51866,0 0 20px #F5C51833",animation:"pulse 2s ease-in-out infinite"}}/>
          {[{top:0,left:0,borderTop:"3px solid #F5C518",borderLeft:"3px solid #F5C518",borderRadius:"6px 0 0 0"},{top:0,right:0,borderTop:"3px solid #F5C518",borderRight:"3px solid #F5C518",borderRadius:"0 6px 0 0"},{bottom:0,left:0,borderBottom:"3px solid #F5C518",borderLeft:"3px solid #F5C518",borderRadius:"0 0 0 6px"},{bottom:0,right:0,borderBottom:"3px solid #F5C518",borderRight:"3px solid #F5C518",borderRadius:"0 0 6px 0"}].map((s,i)=><div key={i} style={{position:"absolute",width:28,height:28,...s}}/>)}
          <div style={{position:"absolute",left:4,right:4,height:2,background:"linear-gradient(90deg,transparent,#F5C518cc,transparent)",animation:"scanline 2.5s ease-in-out infinite",borderRadius:1}}/>
        </div>

        {/* Tap-to-focus ring */}
        {focusPt&&(
          <div style={{position:"absolute",left:focusPt.x,top:focusPt.y,transform:"translate(-50%,-50%)",width:56,height:56,borderRadius:"50%",border:"2px solid #F5C518",boxShadow:"0 0 0 1px #00000066",pointerEvents:"none",animation:"focusRing 1.4s ease-out forwards"}}/>
        )}

        {/* Distance hint */}
        <div style={{position:"absolute",bottom:90,left:0,right:0,textAlign:"center",pointerEvents:"none"}}>
          <span style={{fontSize:10,color:"#ffffff55",letterSpacing:"0.1em",textShadow:"0 1px 4px #000"}}>Hold 15–20 cm fra kortet · tryk for fokus</span>
        </div>

        <button onClick={e=>{e.stopPropagation();capture();}} style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",width:62,height:62,borderRadius:"50%",background:"linear-gradient(135deg,#F5C518,#FF6B35)",border:"3px solid #fff",cursor:"pointer",boxShadow:"0 4px 20px #00000088,0 0 20px #F5C51866",fontSize:22}}>📸</button>
      </>}
      {camErr&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><p style={{color:"#555",fontSize:12,lineHeight:1.6,textAlign:"center"}}>{camErr}</p></div>}
      {!ready&&!camErr&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#333",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase"}}>Starter kamera...</p></div>}
    </div>
  );
}

// ─── Portfolio view ───────────────────────────────────────────────────────────
function Portfolio({cards,onScanNew,onDelete}){
  const total=cards.reduce((s,c)=>s+(c.estimatedValue||0),0);
  const sorted=[...cards].sort((a,b)=>b.estimatedValue-a.estimatedValue);
  return(
    <div>
      <div style={{background:"linear-gradient(135deg,#F5C51811,#FF6B3511)",border:"1px solid #F5C51822",borderRadius:16,padding:"20px 20px",marginBottom:16}}>
        <p style={{margin:"0 0 4px",fontSize:9,color:"#555",letterSpacing:"0.15em",textTransform:"uppercase"}}>Samlet Porteføljeværdi</p>
        <p style={{margin:"0 0 12px",fontSize:34,fontWeight:700,color:"#F5C518",textShadow:"0 0 30px #F5C51855"}}>{fmtDKK(total)}</p>
        <div style={{display:"flex",gap:16}}>
          <div><p style={{margin:0,fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em"}}>Kort</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#fff"}}>{cards.length}</p></div>
          <div><p style={{margin:0,fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em"}}>Snit/kort</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#fff"}}>{fmtDKK(cards.length?total/cards.length:0)}</p></div>
          <div><p style={{margin:0,fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.1em"}}>Mest værd</p><p style={{margin:"2px 0 0",fontSize:16,fontWeight:700,color:"#fff"}}>{fmtDKK(sorted[0]?.estimatedValue)}</p></div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {sorted.map((card,idx)=>{
          const tc=typeColors[card.type]||"#888";
          return(
            <div key={card.id} style={{background:"#0d0d22",border:`1px solid ${tc}22`,borderRadius:14,overflow:"hidden",display:"flex",alignItems:"stretch"}}>
              <div style={{width:72,flexShrink:0,background:"repeating-conic-gradient(#111128 0% 25%,#0d0d22 0% 50%) 0 0/12px 12px",display:"flex",alignItems:"center",justifyContent:"center",borderRight:`1px solid ${tc}11`,position:"relative",minHeight:80}}>
                {card.image?(
                  <img src={card.image} alt={card.name} style={{width:"100%",height:"100%",objectFit:"contain",filter:`drop-shadow(0 2px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 6px ${tc}33)`,padding:4}}/>
                ):(
                  <div style={{fontSize:22,opacity:0.15}}>🃏</div>
                )}
                <div style={{position:"absolute",bottom:3,left:0,right:0,textAlign:"center",fontSize:8,color:tc,fontWeight:700,textShadow:"0 1px 4px #000"}}>{idx+1}</div>
              </div>
              <div style={{flex:1,minWidth:0,padding:"12px 12px",display:"flex",flexDirection:"column",justifyContent:"center",gap:3}}>
                <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.name}</p>
                  <span style={{fontSize:9,color:tc,flexShrink:0}}>Nr. {card.cardNumber?.split("/")[0]}</span>
                </div>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <span style={{fontSize:9,color:"#555"}}>{card.set}</span>
                  <span style={{fontSize:9,color:"#2a2a3a"}}>·</span>
                  <span style={{fontSize:9,color:"#555"}}>{card.condition}</span>
                </div>
                <span style={{background:`${tc}11`,border:`1px solid ${tc}22`,borderRadius:4,padding:"1px 6px",fontSize:8,color:tc,alignSelf:"flex-start"}}>{card.rarity}</span>
              </div>
              <div style={{textAlign:"right",flexShrink:0,padding:"12px 14px",display:"flex",flexDirection:"column",justifyContent:"center",gap:6}}>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:tc}}>{fmtDKK(card.estimatedValue)}</p>
                <p style={{margin:0,fontSize:9,color:"#333"}}>est. værdi</p>
                <button onClick={()=>onDelete(card.id)} style={{background:"transparent",border:"none",color:"#2a2a3a",fontSize:14,cursor:"pointer",padding:0,lineHeight:1}} title="Slet">🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onScanNew} style={{
        width:"100%",padding:14,border:"none",borderRadius:12,
        background:"linear-gradient(135deg,#F5C518,#FF6B35)",
        color:"#000",fontSize:12,fontWeight:700,letterSpacing:"0.1em",
        cursor:"pointer",fontFamily:"'Space Mono',monospace",
        boxShadow:"0 4px 20px #F5C51844",
      }}>⚡ Scan nyt kort</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PokemonScanner(){
  const[portfolio,setPortfolio]=useState([]);
  const[appView,setAppView]=useState("home");

  const[rawImage,setRawImage]=useState(null);
  const[imageBase64,setImageBase64]=useState(null);
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[animateBars,setAnimateBars]=useState(false);
  const[showConfetti,setShowConfetti]=useState(false);
  const[isRecord,setIsRecord]=useState(false);
  const[isDuplicate,setIsDuplicate]=useState(false);

  const fileRef=useRef();

  useEffect(()=>{
    const saved=storage.get("portfolio");
    if(saved){try{setPortfolio(JSON.parse(saved.value));}catch{}}
  },[]);

  const handleCapture=useCallback(async(dataUrl)=>{
    setRawImage(dataUrl);setAppView("preview");
    setError(null);setResult(null);setAnimateBars(false);
    const b64=await toJpegBase64(dataUrl);
    setImageBase64(b64);
  },[]);

  const handleFile=useCallback(async(file)=>{
    if(!file||!file.type.startsWith("image/"))return;
    const reader=new FileReader();
    reader.onload=(e)=>handleCapture(e.target.result);
    reader.readAsDataURL(file);
  },[handleCapture]);

  const runLive=async()=>{
    if(!imageBase64)return;
    setLoading(true);setError(null);setResult(null);setAnimateBars(false);
    try{
      const response=await fetch("/api/scan",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({imageBase64}),
      });
      const text=await response.text();
      if(!response.ok){let msg=`API fejl ${response.status}`;try{msg=JSON.parse(text).error||msg;}catch{}throw new Error(msg);}
      let parsed;
      try{parsed=JSON.parse(text);}catch{throw new Error(`Uventet svar: ${text.slice(0,120)}`);}
      setResult(parsed);
      setTimeout(()=>setAnimateBars(true),100);
      setAppView("result");
      const val=parsed.estimatedValue||0;
      const maxInPortfolio=portfolio.reduce((m,c)=>Math.max(m,c.estimatedValue||0),0);
      setIsRecord(portfolio.length>0&&val>maxInPortfolio);
      setIsDuplicate(portfolio.some(c=>c.name?.toLowerCase()===parsed.name?.toLowerCase()));
      if(val*USD_TO_DKK>=50){setShowConfetti(true);}
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  };

  const deleteFromPortfolio=(id)=>{
    const updated=portfolio.filter(c=>c.id!==id);
    setPortfolio(updated);
    storage.set("portfolio",JSON.stringify(updated));
  };

  const saveToPortfolio=()=>{
    const card={...result,id:Date.now().toString(),scannedAt:new Date().toISOString(),image:rawImage};
    const updated=[card,...portfolio];
    setPortfolio(updated);
    storage.set("portfolio",JSON.stringify(updated));
    setAppView("portfolio");
  };

  const scanNew=()=>{
    setAppView("camera");setResult(null);setRawImage(null);setError(null);setAnimateBars(false);setShowConfetti(false);setIsRecord(false);setIsDuplicate(false);
  };

  const tc=result?.type&&typeColors[result.type]?typeColors[result.type]:"#F5C518";
  const rarityStars={Common:1,Uncommon:2,Rare:3,"Rare Holo":4,"Ultra Rare":5,"Secret Rare":6,"Full Art":5,"Rainbow Rare":6,Promo:3};
  const prices=result?.prices||{};
  const maxPrice=Math.max(prices.poor||0,prices.played||0,prices.nearMint||0,prices.mint||0,prices.psa10||0)*1.1||10;

  return(
    <div style={{minHeight:"100vh",background:"#0a0a1a",fontFamily:"'Space Mono',monospace",color:"#fff",padding:"0 0 80px",position:"relative"}}>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 20% 20%,#1a0533 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,#001a3a 0%,transparent 50%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",inset:0,backgroundImage:"radial-gradient(circle at 1px 1px,#ffffff05 1px,transparent 0)",backgroundSize:"40px 40px",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:520,margin:"0 auto",padding:"0 20px"}}>

        {/* ── TOP BAR ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"24px 0 16px"}}>
          <div style={{cursor:"pointer"}} onClick={()=>setAppView("home")}>
            <span style={{fontSize:18,fontWeight:700,background:"linear-gradient(135deg,#F5C518,#FF6B35)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.08em"}}>⚡ PokéScanner</span>
          </div>
          {portfolio.length>0&&(
            <button onClick={()=>setAppView("portfolio")} style={{background:"transparent",border:"1px solid #1e1e3a",borderRadius:8,padding:"6px 12px",color:"#666",fontSize:10,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>
              📁 {portfolio.length} kort
            </button>
          )}
        </div>

        {/* ── HOME ── */}
        {appView==="home"&&(
          <>
            <div style={{textAlign:"center",padding:"20px 0 28px"}}>
              <div style={{fontSize:44,marginBottom:8}}>⚡</div>
              <h1 style={{fontSize:24,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 8px",background:"linear-gradient(135deg,#F5C518,#FF6B35,#C77DFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>PokéScanner</h1>
              <p style={{color:"#444",fontSize:10,letterSpacing:"0.15em",margin:0,textTransform:"uppercase"}}>TCG Card Appraisal · Powered by AI</p>
            </div>

            <button onClick={()=>setAppView("camera")} style={{
              width:"100%",padding:18,border:"none",borderRadius:14,
              background:"linear-gradient(135deg,#F5C518,#FF6B35)",
              color:"#000",fontSize:13,fontWeight:700,letterSpacing:"0.1em",
              cursor:"pointer",fontFamily:"'Space Mono',monospace",
              boxShadow:"0 4px 24px #F5C51855",marginBottom:10,
            }}>📸 Scan et kort</button>

            {portfolio.length===0?(
              <div style={{marginTop:24,background:"#0d0d22",border:"1px solid #1a1a3a",borderRadius:14,padding:20,textAlign:"center"}}>
                <p style={{color:"#2a2a3a",fontSize:11,margin:"0 0 8px"}}>Din portefølje er tom</p>
                <p style={{color:"#1e1e3a",fontSize:10,margin:0}}>Scan dit første kort for at komme i gang</p>
              </div>
            ):(
              <>
                <div style={{marginTop:16,background:"#0d0d22",border:"1px solid #1a1a3a",borderRadius:14,padding:"14px 16px",cursor:"pointer"}} onClick={()=>setAppView("portfolio")}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <p style={{margin:"0 0 2px",fontSize:18,fontWeight:700,color:"#F5C518"}}>{fmtDKK(portfolio.reduce((s,c)=>s+(c.estimatedValue||0),0))}</p>
                      <p style={{margin:0,fontSize:10,color:"#555"}}>{portfolio.length} kort skannet</p>
                    </div>
                    <span style={{color:"#333",fontSize:18}}>›</span>
                  </div>
                </div>
                <SetsSection portfolio={portfolio}/>
              </>
            )}
          </>
        )}

        {/* ── CAMERA ── */}
        {appView==="camera"&&(
          <>
            <button onClick={()=>setAppView("home")} style={{background:"transparent",border:"none",color:"#444",fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace",marginBottom:12}}>← Tilbage</button>
            <div style={{marginTop:4}}><CameraViewfinder onCapture={handleCapture}/></div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button onClick={()=>fileRef.current?.click()} style={{flex:1,padding:13,background:"#0d0d22",border:"1px solid #1e1e3a",borderRadius:10,color:"#666",fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>📁 Vælg fil</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          </>
        )}

        {/* ── PREVIEW ── */}
        {appView==="preview"&&(
          <>
            {loading&&<ScanningOverlay image={rawImage}/>}
            <button onClick={()=>setAppView("camera")} style={{background:"transparent",border:"none",color:"#444",fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace",marginBottom:12}}>← Scan igen</button>
            <div style={{background:"repeating-conic-gradient(#111128 0% 25%,#0d0d22 0% 50%) 0 0/20px 20px",borderRadius:16,overflow:"hidden",minHeight:200,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #1e1e3a"}}>
              <img src={rawImage} alt="Pokemon kort" style={{maxWidth:"80%",maxHeight:420,objectFit:"contain",display:"block",margin:"20px auto",filter:"drop-shadow(0 8px 24px rgba(0,0,0,0.8))"}}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn onClick={runLive} disabled={loading||!imageBase64} gradient="linear-gradient(135deg,#F5C518,#FF6B35)" style={{flex:1,color:"#000"}}>⚡ Vurder Kort</Btn>
            </div>
            {error&&<div style={{marginTop:12,padding:12,background:"#1a0000",border:"1px solid #440000",borderRadius:10,color:"#ff6666",fontSize:11}}>⚠️ {error}</div>}
          </>
        )}

        {/* ── RESULT ── */}
        {appView==="result"&&result&&(
          <>
            {showConfetti&&<Confetti big={(result.estimatedValue||0)*USD_TO_DKK>=200} onDone={()=>setShowConfetti(false)}/>}
            {isRecord&&(
              <div style={{marginBottom:12,padding:"10px 16px",background:"linear-gradient(135deg,#F5C51822,#FF6B3522)",border:"1px solid #F5C51866",borderRadius:12,display:"flex",alignItems:"center",gap:10,animation:"recordPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275)"}}>
                <span style={{fontSize:22}}>🏆</span>
                <div>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#F5C518",letterSpacing:"0.05em"}}>NY REKORD!</p>
                  <p style={{margin:0,fontSize:10,color:"#888"}}>Dit dyreste kort nogensinde</p>
                </div>
              </div>
            )}
            {isDuplicate&&(
              <div style={{marginBottom:12,padding:"10px 16px",background:"#1a1000",border:"1px solid #FF6B3566",borderRadius:12,display:"flex",alignItems:"center",gap:10,animation:"recordPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)"}}>
                <span style={{fontSize:20}}>⚠️</span>
                <div>
                  <p style={{margin:0,fontSize:12,fontWeight:700,color:"#FF6B35",letterSpacing:"0.05em"}}>Du har dette kort</p>
                  <p style={{margin:0,fontSize:10,color:"#888"}}>Dette kort er allerede i din portefølje</p>
                </div>
              </div>
            )}
            {rawImage&&(
              <div style={{background:"repeating-conic-gradient(#111128 0% 25%,#0d0d22 0% 50%) 0 0/20px 20px",borderRadius:16,border:`1px solid ${tc}33`,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <img src={rawImage} alt={result.name} style={{maxWidth:"72%",maxHeight:340,objectFit:"contain",display:"block",margin:"20px auto",filter:`drop-shadow(0 8px 32px rgba(0,0,0,0.9)) drop-shadow(0 0 20px ${tc}44)`}}/>
              </div>
            )}

            <div style={{background:"#0d0d22",border:`1px solid ${tc}33`,borderRadius:20,overflow:"hidden",marginBottom:12}}>
              <div style={{background:`linear-gradient(135deg,${tc}1a,#0d0d22)`,padding:"20px 20px 14px",borderBottom:"1px solid #151528"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1}}>
                    <h2 style={{margin:0,fontSize:19,fontWeight:700,color:"#fff"}}>{result.name}</h2>
                    <p style={{margin:"4px 0 0",color:"#555",fontSize:10}}>{[result.set,result.cardNumber&&`#${result.cardNumber}`,result.year].filter(Boolean).join(" · ")}</p>
                  </div>
                  <TypeBadge type={result.type}/>
                </div>
                <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
                  {[result.rarity,result.condition,result.isHolo&&"Holo",result.isFirstEdition&&"1st Edition"].filter(Boolean).map(t=><Tag key={t}>{t}</Tag>)}
                </div>
                <div style={{marginTop:10}}><StarRating count={rarityStars[result.rarity]||2}/></div>
              </div>

              <div style={{padding:"16px 20px",borderBottom:"1px solid #151528",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{margin:0,fontSize:9,color:"#444",letterSpacing:"0.15em",textTransform:"uppercase"}}>Estimeret Markedsværdi</p>
                  <p style={{margin:"4px 0 0",fontSize:28,fontWeight:700,color:tc,textShadow:`0 0 20px ${tc}55`}}>{fmtDKK(result.estimatedValue)}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:9,color:"#444",letterSpacing:"0.15em",textTransform:"uppercase"}}>Tillid</p>
                  <p style={{margin:"4px 0 0",fontSize:12,fontWeight:700,color:result.confidence==="high"?"#5BAD6F":result.confidence==="medium"?"#F5C518":"#FF6B35"}}>{result.confidence==="high"?"HØJ ✓":result.confidence==="medium"?"MIDDEL ~":"LAV ⚠"}</p>
                </div>
              </div>

              <div style={{padding:"16px 20px",borderBottom:"1px solid #151528"}}>
                <p style={{margin:"0 0 12px",fontSize:9,color:"#444",letterSpacing:"0.15em",textTransform:"uppercase"}}>Prisoversigt (DKK)</p>
                <PriceBar label="Poor"      value={prices.poor}     max={maxPrice} color="#666"    animate={animateBars}/>
                <PriceBar label="Played"    value={prices.played}   max={maxPrice} color="#FF6B35" animate={animateBars}/>
                <PriceBar label="Near Mint" value={prices.nearMint} max={maxPrice} color="#F5C518" animate={animateBars}/>
                <PriceBar label="Mint"      value={prices.mint}     max={maxPrice} color="#5BAD6F" animate={animateBars}/>
                <PriceBar label="PSA 10"    value={prices.psa10}    max={maxPrice} color="#C77DFF" animate={animateBars}/>
              </div>

              {result.set&&SET_SIZES[result.set]&&(()=>{
                const owned=new Set(portfolio.filter(c=>c.set===result.set).map(c=>c.cardNumber)).size;
                return owned>0?<div style={{borderTop:"1px solid #151528"}}><div style={{padding:"14px 20px"}}><SetProgressCard setName={result.set} owned={owned} total={SET_SIZES[result.set]} compact/></div></div>:null;
              })()}

              {result.notes&&<div style={{padding:"12px 20px",borderBottom:"1px solid #151528"}}>
                <p style={{margin:"0 0 6px",fontSize:9,color:"#444",letterSpacing:"0.15em",textTransform:"uppercase"}}>Ekspert Note</p>
                <p style={{margin:0,fontSize:11,color:"#777",lineHeight:1.8,fontStyle:"italic"}}>{result.notes}</p>
              </div>}

              <div style={{padding:"10px 20px",background:"#08081a"}}>
                <p style={{margin:0,fontSize:9,color:"#2a2a3a"}}>⚠ AI-estimater · DKK (USD×6,88) · verificér med TCGPlayer</p>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <button onClick={saveToPortfolio} style={{
                flex:1,padding:13,border:"none",borderRadius:10,
                background:"linear-gradient(135deg,#5BAD6F,#3d8b50)",
                color:"#fff",fontSize:11,fontWeight:700,letterSpacing:"0.08em",
                cursor:"pointer",fontFamily:"'Space Mono',monospace",
                boxShadow:"0 4px 20px #5BAD6F44",
              }}>💾 Gem i portefølje</button>
              <button onClick={scanNew} style={{padding:"13px 16px",background:"#0d0d22",border:"1px solid #1e1e3a",borderRadius:10,color:"#555",fontSize:10,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>Scan ny</button>
            </div>
          </>
        )}

        {/* ── PORTFOLIO ── */}
        {appView==="portfolio"&&(
          <>
            <button onClick={()=>setAppView("home")} style={{background:"transparent",border:"none",color:"#444",fontSize:11,cursor:"pointer",fontFamily:"'Space Mono',monospace",marginBottom:16}}>← Tilbage</button>
            {portfolio.length>0?(
              <Portfolio cards={portfolio} onScanNew={scanNew} onDelete={deleteFromPortfolio}/>
            ):(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:40,marginBottom:12,opacity:0.3}}>📁</div>
                <p style={{color:"#333",fontSize:12,margin:"0 0 20px"}}>Ingen kort i porteføljen endnu</p>
                <button onClick={scanNew} style={{padding:"13px 24px",border:"none",borderRadius:10,background:"linear-gradient(135deg,#F5C518,#FF6B35)",color:"#000",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>⚡ Scan første kort</button>
              </div>
            )}
          </>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 2px #F5C51844,0 0 20px #F5C51822}50%{box-shadow:0 0 0 2px #F5C518aa,0 0 30px #F5C51855}}
        @keyframes scanline{0%{top:8%;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:92%;opacity:0}}
        @keyframes confettiFall{0%{transform:translateY(0) rotate(0deg) translateX(0);opacity:1}100%{transform:translateY(105vh) rotate(720deg) translateX(var(--drift,0px));opacity:0}}
        @keyframes recordPop{0%{transform:scale(0.6);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes scanCard{0%{top:-3px}100%{top:100%}}
        @keyframes flicker{0%,100%{opacity:1}50%{opacity:0.85}}
        @keyframes focusRing{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}60%{opacity:1;transform:translate(-50%,-50%) scale(0.75)}100%{opacity:0;transform:translate(-50%,-50%) scale(0.7)}}
      `}</style>
    </div>
  );
}
