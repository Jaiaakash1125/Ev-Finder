import React, { useState, useEffect, useRef } from "react";

// Web Audio API funny synthesizer sound effects
function playSound(type: "horn" | "charge" | "turbo" | "panic") {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "horn") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "charge") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "turbo") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.7);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } else if (type === "panic") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Ignore audio context errors if blocked by browser policy
  }
}

const FUNNY_QUOTES = [
  "1% Battery: AC bandh kar bhai, paseena chalega! 🥵⚡",
  "Where is Tata Power EZ Charge?! I'm pushing! 🏃‍♂️💨",
  "150 kW DC Fast Plugged In! Zzzzap! ⚡😎",
  "Petrol pump wale uncle looking at me like 👁️👄👁️",
  "Bro this EV has more torque than my morning coffee! 🚀🔋",
  "Regenerative braking activated: Free electricity unlocked! 🤑",
  "FastTag automatic deduct ho gaya, ab samosa khane ka time! ☕🛺",
  "Battery at 99%... Waiting for that last 1% like UPSC result! 😂",
];

export function FunnyEvAnimation() {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [vehicleState, setVehicleState] = useState<"cruising" | "charging" | "turbo" | "panic">("panic");
  const [carX, setCarX] = useState(10);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<"rickshaw" | "cybercar">("rickshaw");

  // Animation frame motion
  useEffect(() => {
    const interval = setInterval(() => {
      setCarX((prev) => {
        const speed = vehicleState === "turbo" ? 3.5 : vehicleState === "panic" ? 0.4 : 1.2;
        const next = prev + speed;
        return next > 92 ? 2 : next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [vehicleState]);

  // Quote rotator
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % FUNNY_QUOTES.length);
    }, 4500);
    return () => clearInterval(quoteInterval);
  }, []);

  const triggerTurbo = () => {
    setVehicleState("turbo");
    setBatteryLevel(100);
    playSound("turbo");

    // Spawn sparks
    const newSparks = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 60 - 30,
      y: Math.random() * 40 - 20,
    }));
    setSparks(newSparks);

    setTimeout(() => {
      setVehicleState("cruising");
      setSparks([]);
    }, 3000);
  };

  const triggerPanic = () => {
    setVehicleState("panic");
    setBatteryLevel(1);
    playSound("panic");
  };

  const triggerCharge = () => {
    setVehicleState("charging");
    playSound("charge");
    let lvl = batteryLevel;
    const chargeTimer = setInterval(() => {
      lvl += 15;
      if (lvl >= 100) {
        lvl = 100;
        clearInterval(chargeTimer);
        setVehicleState("cruising");
      }
      setBatteryLevel(lvl);
    }, 200);
  };

  const triggerHorn = () => {
    playSound("horn");
    setQuoteIdx((prev) => (prev + 1) % FUNNY_QUOTES.length);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[999] rounded-2xl border border-accent/40 bg-[#070e0a]/90 backdrop-blur-xl px-4 py-2.5 shadow-2xl shadow-accent/30 text-xs font-black flex items-center gap-2 text-accent hover:scale-105 transition active:scale-95 group"
      >
        <span className="text-lg animate-bounce">⚡🛺</span>
        <span>Open Desi EV Simulator</span>
        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/40 font-bold animate-pulse">
          {batteryLevel}%
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-[460px] z-[999] rounded-3xl border border-[#00ff87]/40 bg-[#060b08]/95 backdrop-blur-2xl p-4 shadow-2xl shadow-[#00ff87]/20 transition-all duration-300">
      {/* Top control bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#00ff87]/20 text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#00ff87] animate-ping" />
          <span className="font-display font-black text-foreground tracking-tight text-sm">
            ⚡ Desi EV Simulator 2.0
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
              batteryLevel <= 10
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-[#00ff87]/20 text-[#00ff87] border-[#00ff87]/40"
            }`}
          >
            🔋 {batteryLevel}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveVehicle(activeVehicle === "rickshaw" ? "cybercar" : "rickshaw")}
            className="rounded-lg border border-border bg-ink2/80 px-2 py-1 text-[11px] font-bold text-frost hover:text-foreground transition"
            title="Switch Vehicle"
          >
            {activeVehicle === "rickshaw" ? "🏎️ Cyber EV" : "🛺 Volt Auto"}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="size-6 rounded-lg border border-border bg-ink2/80 text-frost hover:text-foreground flex items-center justify-center font-bold text-xs"
            title="Minimize"
          >
            —
          </button>
        </div>
      </div>

      {/* Comic Speech Bubble */}
      <div className="relative mt-2 mb-1 min-h-[36px] flex items-center">
        <div className="w-full rounded-xl border border-[#ff007f]/40 bg-[#ff007f]/10 px-3 py-1.5 text-xs font-bold text-[#ff80bf] flex items-center gap-2 shadow-inner">
          <span className="text-base shrink-0">💬</span>
          <span className="line-clamp-1 italic tracking-tight">{FUNNY_QUOTES[quoteIdx]}</span>
        </div>
      </div>

      {/* Interactive Road Canvas Track */}
      <div className="relative h-20 w-full overflow-hidden rounded-2xl border border-[#00ff87]/30 bg-gradient-to-b from-[#0a140f] to-[#040805] shadow-inner my-2.5">
        {/* Animated Road Lines */}
        <div className="absolute bottom-2 left-0 right-0 h-1 border-b-2 border-dashed border-[#00ff87]/30" />

        {/* Speed wind streaks when turbo */}
        {vehicleState === "turbo" && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-around opacity-70">
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00ff87] to-transparent animate-pulse" />
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#ff007f] to-transparent animate-pulse delay-75" />
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#00ff87] to-transparent animate-pulse delay-150" />
          </div>
        )}

        {/* Realistic Sparks FX */}
        {sparks.map((s) => (
          <div
            key={s.id}
            style={{ left: `calc(${carX}% + ${s.x}px)`, top: `calc(40% + ${s.y}px)` }}
            className="absolute size-2 rounded-full bg-[#ff007f] shadow-[0_0_12px_#00ff87] animate-ping pointer-events-none"
          />
        ))}

        {/* Animated EV Vehicle */}
        <div
          style={{ left: `${carX}%` }}
          className={`absolute bottom-2 -translate-x-1/2 transition-all duration-75 flex flex-col items-center select-none ${
            vehicleState === "panic"
              ? "animate-bounce"
              : vehicleState === "turbo"
              ? "scale-110"
              : ""
          }`}
        >
          {/* Overhead Battery & Emoji Status */}
          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-black/80 border border-[#00ff87]/40 text-foreground shadow-lg">
            {vehicleState === "turbo" && "⚡🔥 150kW!"}
            {vehicleState === "charging" && "⚡ Plugg'd In!"}
            {vehicleState === "panic" && "😱 1% Low!"}
            {vehicleState === "cruising" && "😎 Pure EV"}
          </div>

          {activeVehicle === "rickshaw" ? (
            /* Custom Styled Animated Electric Auto-Rickshaw SVG */
            <svg
              width="58"
              height="38"
              viewBox="0 0 64 42"
              fill="none"
              className="drop-shadow-[0_4px_10px_rgba(0,255,135,0.4)]"
            >
              {/* Auto Body */}
              <path
                d="M10 26 L16 10 L44 10 L52 20 L56 26 L54 32 L12 32 Z"
                fill="#059669"
                stroke="#00ff87"
                strokeWidth="2"
              />
              {/* Yellow Canopy */}
              <path
                d="M16 10 L44 10 L48 18 L14 18 Z"
                fill="#facc15"
                stroke="#fef08a"
                strokeWidth="1.5"
              />
              {/* Windshield */}
              <polygon points="45,11 51,19 44,19 41,11" fill="#38bdf8" fillOpacity="0.8" />
              {/* Driver Seat & Battery Box */}
              <rect x="22" y="20" width="18" height="10" rx="2" fill="#ff007f" fillOpacity="0.8" />
              <text x="25" y="27" fontSize="6" fontWeight="900" fill="#ffffff">
                ⚡ EV
              </text>
              {/* Headlight Beam */}
              <polygon
                points="56,25 64,21 64,31 56,29"
                fill="#00ff87"
                fillOpacity="0.35"
              />
              {/* Back Wheel */}
              <circle
                cx="18"
                cy="34"
                r="6"
                fill="#0f172a"
                stroke="#00ff87"
                strokeWidth="2"
                className={vehicleState === "turbo" ? "animate-spin" : ""}
              />
              <circle cx="18" cy="34" r="2" fill="#ffffff" />
              {/* Front Wheel */}
              <circle
                cx="48"
                cy="34"
                r="6"
                fill="#0f172a"
                stroke="#00ff87"
                strokeWidth="2"
                className={vehicleState === "turbo" ? "animate-spin" : ""}
              />
              <circle cx="48" cy="34" r="2" fill="#ffffff" />
            </svg>
          ) : (
            /* Custom Styled Animated Cyber Electric Car SVG */
            <svg
              width="68"
              height="32"
              viewBox="0 0 74 36"
              fill="none"
              className="drop-shadow-[0_4px_12px_rgba(255,0,127,0.5)]"
            >
              {/* Cyber Car Body */}
              <path
                d="M8 24 L20 8 L50 8 L66 18 L70 24 L68 28 L10 28 Z"
                fill="#1e1b4b"
                stroke="#ff007f"
                strokeWidth="2"
              />
              {/* Cyber Windows */}
              <polygon points="22,10 48,10 58,18 20,18" fill="#00ff87" fillOpacity="0.3" />
              {/* Neon Underglow */}
              <line x1="12" y1="28" x2="66" y2="28" stroke="#ff007f" strokeWidth="2.5" />
              {/* Headlight beam */}
              <polygon
                points="69,21 74,18 74,27 69,25"
                fill="#38bdf8"
                fillOpacity="0.6"
              />
              {/* Back Wheel */}
              <circle
                cx="20"
                cy="28"
                r="6"
                fill="#0f172a"
                stroke="#00ff87"
                strokeWidth="2"
                className={vehicleState === "turbo" ? "animate-spin" : ""}
              />
              <circle cx="20" cy="28" r="2" fill="#ff007f" />
              {/* Front Wheel */}
              <circle
                cx="56"
                cy="28"
                r="6"
                fill="#0f172a"
                stroke="#00ff87"
                strokeWidth="2"
                className={vehicleState === "turbo" ? "animate-spin" : ""}
              />
              <circle cx="56" cy="28" r="2" fill="#ff007f" />
            </svg>
          )}
        </div>
      </div>

      {/* Interactive Action Buttons */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 text-[11px] font-extrabold">
        <button
          onClick={triggerTurbo}
          className="rounded-xl border border-[#00ff87]/50 bg-gradient-to-r from-[#00ff87]/30 to-[#ff007f]/30 py-2 text-foreground hover:scale-102 active:scale-98 transition flex flex-col items-center justify-center gap-0.5 shadow-md shadow-[#00ff87]/20"
        >
          <span className="text-sm">🚀</span>
          <span>Turbo!</span>
        </button>

        <button
          onClick={triggerCharge}
          className="rounded-xl border border-[#00ff87]/40 bg-[#00ff87]/15 py-2 text-[#00ff87] hover:bg-[#00ff87]/25 active:scale-98 transition flex flex-col items-center justify-center gap-0.5"
        >
          <span className="text-sm">🔌</span>
          <span>Plug In</span>
        </button>

        <button
          onClick={triggerPanic}
          className="rounded-xl border border-red-500/40 bg-red-500/15 py-2 text-red-400 hover:bg-red-500/25 active:scale-98 transition flex flex-col items-center justify-center gap-0.5"
        >
          <span className="text-sm">😱</span>
          <span>1% Panic</span>
        </button>

        <button
          onClick={triggerHorn}
          className="rounded-xl border border-[#ff007f]/40 bg-[#ff007f]/15 py-2 text-[#ff80bf] hover:bg-[#ff007f]/25 active:scale-98 transition flex flex-col items-center justify-center gap-0.5"
        >
          <span className="text-sm">📢</span>
          <span>Peep Horn</span>
        </button>
      </div>
    </div>
  );
}
