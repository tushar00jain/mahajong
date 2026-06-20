import { useState } from "react";

function suitEmoji(suit) {
  if (suit === "bamboo") return "B";
  if (suit === "circle") return "C";
  if (suit === "character") return "M";
  if (suit === "wind") return "W";
  if (suit === "dragon") return "D";
  if (suit === "flower") return "FL";
  return "?";
}
const SUIT_COLOR  = { bamboo:"#4ade80", circle:"#f87171", character:"#facc15", wind:"#67e8f9", dragon:"#c084fc", flower:"#fb923c", unknown:"#94a3b8" };

function tileKey(t) { return t.suit + ":" + t.value; }

function TileBadge({ tile, highlight }) {
  const suit = tile?.suit || "unknown";
  return (
    <span style={{
      display:"inline-flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      width:44, height:56, borderRadius:6, margin:"2px", flexShrink:0, position:"relative",
      border: highlight ? "2px solid #f59e0b" : "1.5px solid rgba(255,255,255,0.12)",
      background: highlight ? "linear-gradient(135deg,#78350f,#92400e)" : "rgba(255,255,255,0.08)",
      color: SUIT_COLOR[suit], fontWeight:700,
      boxShadow: highlight ? "0 0 12px #f59e0b88" : "none",
    }}>
      <span style={{ fontSize:18, lineHeight:1 }}>{suitEmoji(suit)}</span>
      <span style={{ fontSize:11, marginTop:2 }}>{tile?.value ?? "?"}</span>
      {highlight && (
        <span style={{ position:"absolute", top:-9, left:"50%", transform:"translateX(-50%)",
          fontSize:9, background:"#f59e0b", color:"#000", borderRadius:4, padding:"1px 4px",
          fontWeight:800, whiteSpace:"nowrap" }}>DISCARD</span>
      )}
    </span>
  );
}

function shantenForHand(hand) {
  if (!hand || hand.length === 0) return 8;
  const counts = {};
  hand.forEach(t => { const k = tileKey(t); counts[k] = (counts[k]||0)+1; });
  const keys = Object.keys(counts);
  let bestShanten = 8;
  for (const pairKey of keys) {
    if (counts[pairKey] < 2) continue;
    const rem = { ...counts };
    rem[pairKey] -= 2;
    if (rem[pairKey] === 0) delete rem[pairKey];
    let melds = 0, partials = 0;
    const r = { ...rem };
    for (const k of Object.keys(r).sort()) {
      const parts = k.split(":");
      const suit = parts[0], val = parseInt(parts[1]);
      while ((r[k]||0) >= 3) { r[k] -= 3; melds++; }
      if (["bamboo","circle","character"].includes(suit) && !isNaN(val)) {
        const k2 = suit+":"+(val+1), k3 = suit+":"+(val+2);
        while ((r[k]||0)>0 && (r[k2]||0)>0 && (r[k3]||0)>0) { r[k]--; r[k2]--; r[k3]--; melds++; }
      }
    }
    for (const k of Object.keys(r).sort()) {
      const parts = k.split(":");
      const suit = parts[0], val = parseInt(parts[1]);
      if ((r[k]||0) >= 2) { partials++; r[k] -= 2; }
      if (["bamboo","circle","character"].includes(suit) && !isNaN(val)) {
        const k2 = suit+":"+(val+1);
        if ((r[k]||0)>0 && (r[k2]||0)>0) { partials++; r[k]--; r[k2]--; }
      }
    }
    bestShanten = Math.min(bestShanten, 8 - 2*melds - Math.min(partials, 4-melds) - 1);
  }
  return bestShanten;
}

function runShanten(hand) {
  let bestDiscard=null, bestS=99, secondDiscard=null, secondS=99;
  for (let i=0; i<hand.length; i++) {
    const reduced = [...hand.slice(0,i), ...hand.slice(i+1)];
    const s = shantenForHand(reduced);
    if (s < bestS) { secondDiscard=bestDiscard; secondS=bestS; bestS=s; bestDiscard=hand[i]; }
    else if (s < secondS && tileKey(hand[i]) !== tileKey(bestDiscard||{})) { secondS=s; secondDiscard=hand[i]; }
  }
  return {
    recommendedDiscard: bestDiscard, alternativeDiscard: secondDiscard, shantenNumber: bestS,
    handAssessment: bestS<=0 ? "🔥 TENPAI — one tile away from winning!" : "Hand is " + bestS + " tile" + (bestS===1?"":"s") + " away from winning.",
    reasoning: "Discarding " + (bestDiscard?.value) + " (" + (bestDiscard?.suit) + ") reduces shanten to " + bestS + ", maximising draw efficiency.",
    alternativeReasoning: secondDiscard ? secondDiscard.value + " (" + secondDiscard.suit + ") gives shanten " + secondS + " — slightly slower but may preserve a high-value meld." : null,
  };
}

function runDefensive(hand, discardPile) {
  const discardedKeys = new Set((discardPile||[]).map(tileKey));
  function safetyScore(tile) {
    let s=0;
    if (discardedKeys.has(tileKey(tile))) s+=3;
    if (["wind","dragon","flower"].includes(tile.suit)) s+=1;
    const v=parseInt(tile.value);
    if (!isNaN(v) && (v===1||v===9)) s+=1;
    return s;
  }
  const scored = hand.map((tile,i) => {
    const reduced=[...hand.slice(0,i),...hand.slice(i+1)];
    return { tile, shanten:shantenForHand(reduced), safety:safetyScore(tile) };
  });
  scored.sort((a,b) => (a.shanten - a.safety*0.4) - (b.shanten - b.safety*0.4));
  const best=scored[0], second=scored.find(s=>tileKey(s.tile)!==tileKey(best.tile));
  return {
    recommendedDiscard: best.tile, alternativeDiscard: second?.tile||null, shantenNumber: best.shanten,
    handAssessment: best.shanten<=0 ? "🔥 TENPAI — playing defensively while ready to win." : "Hand is " + best.shanten + " step" + (best.shanten===1?"":"s") + " from winning. Defensive mode active.",
    reasoning: "Discarding " + best.tile.value + " (" + best.tile.suit + ") is safest — " + (discardedKeys.has(tileKey(best.tile)) ? "already in discard pile, very unlikely to complete an opponent hand" : "low connectivity and low risk to opponents") + ". Shanten: " + best.shanten + ".",
    alternativeReasoning: second ? second.tile.value + " (" + second.tile.suit + ") is an alternative — " + (second.shanten<=best.shanten?"equal efficiency":"slightly worse for your hand") + " but " + (discardedKeys.has(tileKey(second.tile))?"also safe":"moderate risk") + "." : null,
  };
}

// Prompt uses a backtick code block so Claude outputs clean copyable JSON
const BACKTICK = String.fromCharCode(96);
const PROMPT = [
  "Please read this mahjong image and output a " + BACKTICK+BACKTICK+BACKTICK + "json code block exactly like this example:",
  "",
  BACKTICK+BACKTICK+BACKTICK+"json",
  '{"hand":[{"suit":"bamboo","value":"2"},{"suit":"circle","value":"5"}],"melds":[],"discardPile":[]}',
  BACKTICK+BACKTICK+BACKTICK,
  "",
  "Rules:",
  "- suit: bamboo / circle / character / wind / dragon / flower",
  "- value: 1-9 for suited tiles, East/South/West/North for winds, Red/Green/White for dragons",
  "- melds: list exposed sets on rack, each with type (pung/kong/chow) and tiles array",
  "- discardPile: all tiles discarded on the table",
  "- No explanation outside the code block.",
].join("\n");

export default function MahjongAdvisor() {
  const [jsonInput, setJsonInput] = useState("");
  const [algorithm, setAlgorithm] = useState("shanten");
  const [result, setResult] = useState(null);
  const [hand, setHand] = useState(null);
  const [melds, setMelds] = useState([]);
  const [error, setError] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const analyze = () => {
    setError(null);
    try {
      // Strip invisible unicode chars and code block fences
      const cleaned = jsonInput
        .replace(/```json|```/g, "")
        .replace(/[\u200B-\u200D\uFEFF\u00A0\u2028\u2029]/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed.hand || !Array.isArray(parsed.hand)) throw new Error("Missing 'hand' array");
      setHand(parsed.hand);
      setMelds(parsed.melds || []);
      const res = algorithm==="shanten" ? runShanten(parsed.hand) : runDefensive(parsed.hand, parsed.discardPile||[]);
      setResult(res);
    } catch(e) { setError("Invalid JSON: " + e.message); }
  };

  const reset = () => { setJsonInput(""); setResult(null); setHand(null); setMelds([]); setError(null); };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0a0f1a 0%,#0f1f14 50%,#0a0f1a 100%)", fontFamily:"'Noto Serif','Georgia',serif", color:"#e2e8f0", paddingBottom:48 }}>
      <div style={{ textAlign:"center", padding:"28px 24px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"linear-gradient(180deg,rgba(16,185,129,0.07) 0%,transparent 100%)" }}>
        <div style={{ fontSize:32, marginBottom:4 }}>🀄</div>
        <h1 style={{ margin:0, fontSize:"clamp(18px,5vw,26px)", fontWeight:700, letterSpacing:"0.04em", background:"linear-gradient(90deg,#4ade80,#a3e635,#facc15)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          HK Mahjong Advisor
        </h1>
        <p style={{ margin:"5px 0 0", color:"#475569", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase" }}>廣東麻將 · Local Strategy Engine · Free</p>
      </div>

      <div style={{ maxWidth:640, margin:"0 auto", padding:"0 16px" }}>
        <div style={{ marginTop:18, background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:"14px 16px" }}>
          <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:"#4ade80" }}>📸 How to use — no API needed</p>
          <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.9 }}>
            <div>1. Upload your mahjong photo to <strong style={{color:"#e2e8f0"}}>Claude chat</strong></div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span>2. Ask Claude to read tiles using this prompt:</span>
              <button onClick={()=>setShowPrompt(p=>!p)} style={{ background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.3)", borderRadius:4, padding:"2px 8px", color:"#4ade80", cursor:"pointer", fontSize:11 }}>
                {showPrompt ? "hide ▲" : "show prompt ▼"}
              </button>
            </div>
            <div>3. Copy the <strong style={{color:"#e2e8f0"}}>entire code block</strong> Claude returns and paste below</div>
          </div>
          {showPrompt && (
            <div style={{ marginTop:10, background:"rgba(0,0,0,0.35)", borderRadius:8, padding:"10px 12px", fontSize:11, color:"#94a3b8", fontFamily:"monospace", whiteSpace:"pre-wrap", lineHeight:1.7, userSelect:"all", cursor:"text" }}>
              {PROMPT}
            </div>
          )}
        </div>

        <div style={{ marginTop:16, marginBottom:14 }}>
          <p style={{ fontSize:11, letterSpacing:"0.12em", color:"#475569", textTransform:"uppercase", marginBottom:8 }}>Strategy Algorithm</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { id:"shanten", icon:"⚡", label:"Shanten Minimization", desc:"Offensive: minimize tiles-to-win distance." },
              { id:"defensive", icon:"🛡️", label:"Defensive Safety", desc:"Balance hand progress with safe discards." },
            ].map(alg => (
              <button key={alg.id} onClick={()=>setAlgorithm(alg.id)} style={{
                background: algorithm===alg.id ? "linear-gradient(135deg,rgba(74,222,128,0.15),rgba(74,222,128,0.04))" : "rgba(255,255,255,0.04)",
                border: algorithm===alg.id ? "1.5px solid #4ade80" : "1.5px solid rgba(255,255,255,0.1)",
                borderRadius:10, padding:"12px", cursor:"pointer", textAlign:"left", color:"#e2e8f0",
              }}>
                <div style={{ fontSize:17, marginBottom:3 }}>{alg.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:algorithm===alg.id?"#4ade80":"#e2e8f0", marginBottom:2 }}>{alg.label}</div>
                <div style={{ fontSize:11, color:"#64748b", lineHeight:1.4 }}>{alg.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {!result ? (
          <div>
            <p style={{ fontSize:11, letterSpacing:"0.1em", color:"#475569", textTransform:"uppercase", marginBottom:6 }}>
              Paste JSON or code block from Claude
            </p>
            <textarea
              value={jsonInput}
              onChange={e=>setJsonInput(e.target.value)}
              placeholder={"Paste the ```json code block or raw JSON here..."}
              style={{ width:"100%", minHeight:140, background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px", color:"#e2e8f0", fontSize:12, fontFamily:"monospace", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }}
            />
            {error && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"9px 12px", marginTop:8, color:"#fca5a5", fontSize:13 }}>⚠️ {error}</div>}
            <button onClick={analyze} disabled={!jsonInput.trim()} style={{ width:"100%", marginTop:8, background:jsonInput.trim()?"linear-gradient(135deg,#166534,#15803d)":"rgba(255,255,255,0.05)", border:"none", borderRadius:8, padding:"12px", color:jsonInput.trim()?"#fff":"#475569", fontSize:15, cursor:jsonInput.trim()?"pointer":"not-allowed", fontWeight:700 }}>
              ⚡ Analyze Hand
            </button>
          </div>
        ) : (
          <div style={{ marginTop:4 }}>
            <div style={{ background:"linear-gradient(135deg,rgba(74,222,128,0.1),rgba(163,230,53,0.05))", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, letterSpacing:"0.1em", color:"#4ade80", textTransform:"uppercase" }}>Hand Assessment</span>
                <span style={{ background:result.shantenNumber<=0?"#fbbf24":"rgba(74,222,128,0.2)", color:result.shantenNumber<=0?"#000":"#4ade80", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                  {result.shantenNumber<=0 ? "🔥 TENPAI" : "Shanten: " + result.shantenNumber}
                </span>
              </div>
              <p style={{ margin:0, fontSize:14, color:"#cbd5e1", lineHeight:1.6 }}>{result.handAssessment}</p>
            </div>

            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, letterSpacing:"0.1em", color:"#475569", textTransform:"uppercase", marginBottom:6 }}>Your Hand ({hand.length} tiles)</p>
              <div style={{ display:"flex", flexWrap:"wrap" }}>
                {hand.map((tile,i) => {
                  const isDiscard = result.recommendedDiscard && tile.suit===result.recommendedDiscard.suit && tile.value===result.recommendedDiscard.value;
                  return <TileBadge key={i} tile={tile} highlight={isDiscard} />;
                })}
              </div>
            </div>

            {melds && melds.length>0 && (
              <div style={{ marginBottom:12 }}>
                <p style={{ fontSize:11, letterSpacing:"0.1em", color:"#475569", textTransform:"uppercase", marginBottom:6 }}>Exposed Melds</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {melds.map((meld,mi) => (
                    <div key={mi} style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"5px 10px" }}>
                      <span style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginRight:4 }}>{meld.type}</span>
                      {meld.tiles?.map((t,ti) => <TileBadge key={ti} tile={t} />)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))", border:"1.5px solid rgba(245,158,11,0.4)", borderRadius:14, padding:"16px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>🎯</span>
                <div>
                  <p style={{ margin:0, fontSize:11, letterSpacing:"0.1em", color:"#f59e0b", textTransform:"uppercase" }}>{algorithm==="shanten"?"Shanten Minimization":"Defensive Safety"} — Best Discard</p>
                  {result.recommendedDiscard && (
                    <p style={{ margin:"2px 0 0", fontSize:19, fontWeight:700, color:"#fef9c3" }}>
                      {suitEmoji(result.recommendedDiscard.suit)} {result.recommendedDiscard.value} <span style={{ fontSize:13, color:"#f59e0b", textTransform:"capitalize" }}>({result.recommendedDiscard.suit})</span>
                    </p>
                  )}
                </div>
              </div>
              <p style={{ margin:0, fontSize:14, color:"#e2e8f0", lineHeight:1.7 }}>{result.reasoning}</p>
            </div>

            {result.alternativeDiscard && (
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                <p style={{ margin:"0 0 3px", fontSize:11, letterSpacing:"0.1em", color:"#475569", textTransform:"uppercase" }}>Alternative</p>
                <p style={{ margin:"0 0 3px", fontSize:15, fontWeight:600, color:"#94a3b8" }}>
                  {suitEmoji(result.alternativeDiscard.suit)} {result.alternativeDiscard.value} <span style={{ fontSize:12, color:"#475569", textTransform:"capitalize" }}>({result.alternativeDiscard.suit})</span>
                </p>
                <p style={{ margin:0, fontSize:13, color:"#64748b", lineHeight:1.6 }}>{result.alternativeReasoning}</p>
              </div>
            )}

            <button onClick={reset} style={{ width:"100%", marginTop:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px", color:"#64748b", fontSize:14, cursor:"pointer" }}>
              ↩ Analyze Another Hand
            </button>
          </div>
        )}

        {!result && (
          <div style={{ marginTop:24, fontSize:13, color:"#334155", lineHeight:1.8 }}>
            <p style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, color:"#1e293b" }}>Algorithms</p>
            <p style={{ margin:"0 0 6px" }}><span style={{color:"#4ade80"}}>⚡ Shanten</span> — picks the discard that leaves you fewest steps from a winning hand.</p>
            <p style={{ margin:0 }}><span style={{color:"#67e8f9"}}>🛡️ Defensive</span> — factors in which tiles are safe to throw based on the discard pile. Best late game.</p>
          </div>
        )}
      </div>
    </div>
  );
}
