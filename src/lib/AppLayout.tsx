import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Sparkles, Vault, Zap, Fingerprint, Gem } from "lucide-react";
import { cn } from "./utils";
import { useSYNK } from "./Store";
import { motion, AnimatePresence } from "motion/react";

// Lazy load tabs to dramatically decrease initial bundle size and boost rendering speed
const RitualDashboard = lazy(() => import("./tabs/RitualDashboard"));
const GoalVault = lazy(() => import("./tabs/GoalVault"));
const SynkOracle = lazy(() => import("./tabs/SynkOracle"));
const IdentityCard = lazy(() => import("./tabs/IdentityCard"));

const TABS = [
  { id: "ritual", label: "PORTAL", subLabel: "共鳴中心", icon: Sparkles },
  { id: "vault", label: "DIRECTIVES", subLabel: "核心指令", icon: Vault },
  { id: "oracle", label: "ORACLE", subLabel: "靈魂神諭", icon: Gem },
  { id: "identity", label: "IDENTITY", subLabel: "數位通行", icon: Fingerprint },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AppLayout() {
  const { stats, achievement, customBackground, bias, roomAtmosphere } = useSYNK();
  const [activeTab, setActiveTab] = useState<TabId>("ritual");
  const [direction, setDirection] = useState(0);

  const handleNav = (id: TabId) => {
    if (id === activeTab) return;
    
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    const nextIndex = TABS.findIndex(t => t.id === id);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(id);
  };

  const getBiasColor = () => {
    switch(bias) {
      case 'Karina': return 'bg-blue-600';
      case 'Winter': return 'bg-cyan-400';
      case 'Giselle': return 'bg-synk-pink';
      case 'Ningning': return 'bg-purple-600';
      default: return 'bg-synk-blue';
    }
  };

  return (
    <div className={cn(
      "relative w-full h-screen text-white overflow-hidden flex flex-col font-sans z-0 transition-colors duration-1000",
      roomAtmosphere === 'Void' ? 'bg-black' : 'bg-synk-bg'
    )}>
      {/* Immersive Background */}
      {customBackground && (
        <div 
          className={cn(
            "absolute inset-0 z-[-20] bg-cover bg-center transition-all duration-1000",
            roomAtmosphere === 'Void' ? 'opacity-10 grayscale' : 'opacity-30 grayscale-[0.5] contrast-[1.2]',
            roomAtmosphere === 'Neon' && 'opacity-60 saturate-[2]'
          )}
          style={{ backgroundImage: `url(${customBackground})` }}
        />
      )}

      {/* Atmospheric Overlays */}
      <div className={cn(
        "absolute inset-0 pointer-events-none z-[-15] transition-opacity duration-1000",
        roomAtmosphere === 'Neon' ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="absolute inset-0 bg-gradient-to-tr from-synk-blue/20 via-synk-pink/10 to-synk-lavender/20 mix-blend-color-dodge" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(167,139,250,0.1),transparent_70%)] animate-pulse" />
      </div>

      <div className={cn(
        "absolute inset-0 pointer-events-none z-[-15] transition-opacity duration-1000",
        roomAtmosphere === 'Void' ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="absolute inset-0 bg-black/60 backdrop-brightness-[0.3]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_50%,rgba(0,0,0,0.8)_100%)]" />
      </div>
      
      {/* Floating Metallic Decorative Orbs */}
      <div className={cn(
        "absolute inset-0 pointer-events-none z-[-5] overflow-hidden transition-all duration-1000",
        (roomAtmosphere === 'Void' || activeTab === 'oracle') ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      )}>
        <motion.div 
          animate={{ 
            y: [0, -40, 0],
            x: [0, 30, 0],
            rotate: [0, 360],
          }}
          style={{
            x: direction * -50,
            transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[15%] right-[10%] w-40 h-40 rounded-full bg-gradient-to-tr from-synk-blue/30 via-white/10 to-synk-pink/30 border border-white/30 backdrop-blur-xl shadow-[inset_0_0_40px_rgba(255,255,255,0.2),0_0_30px_rgba(96,165,250,0.2)]"
        />
        <motion.div 
          animate={{ 
            y: [0, 60, 0],
            x: [0, -30, 0],
            rotate: [360, 0],
          }}
          style={{
            x: direction * -100,
            transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] left-[5%] w-64 h-64 rounded-full bg-gradient-to-bl from-synk-pink/20 via-white/5 to-synk-blue/20 border border-white/20 backdrop-blur-2xl shadow-[inset_0_0_50px_rgba(255,255,255,0.1),0_0_40px_rgba(255,77,204,0.1)]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[50%] left-[40%] w-[500px] h-[500px] rounded-full bg-synk-lavender/10 blur-[100px]"
        />
      </div>

      {/* Nebulas */}
      <div className={cn("absolute top-[-150px] left-[-150px] w-[800px] h-[800px] rounded-full blur-[150px] opacity-25 -z-10 pointer-events-none mix-blend-screen", getBiasColor())} />
      <div className={cn("absolute bottom-[-150px] right-[-150px] w-[800px] h-[800px] rounded-full blur-[150px] opacity-25 -z-10 pointer-events-none mix-blend-screen", bias === 'None' ? 'bg-synk-pink' : 'bg-black')} />
      <div className="absolute top-[300px] left-[400px] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 bg-synk-lavender -z-10 pointer-events-none" />
      
      {/* Top Bar */}
      <header className="relative z-20 h-[72px] md:h-[88px] flex justify-between items-center px-6 md:px-16 border-b border-synk-border backdrop-blur-xl bg-black/20">
        <div className="flex flex-col">
          <div className="vogue-title-nav text-white">SYNKIFY</div>
          <div className="text-[7px] md:text-[9px] uppercase tracking-[0.4em] text-synk-lavender/60 mt-0.5 md:mt-1">
            靈魂精煉系統 <span className="hidden md:inline opacity-30 ml-2">AURA REFINEMENT</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-6 py-1.5 md:py-2.5 rounded-full bg-white/5 border border-white/10 font-mono text-[9px] md:text-[11px] text-white/80 shadow-inner">
          <Zap className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-synk-blue" />
          <span className="uppercase font-bold tracking-[0.2em]">{stats.crystals} <span className="hidden xs:inline">CRYSTALS</span> <span className="opacity-30">/ 能量</span></span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 overflow-hidden w-full">
        <div className="w-full h-full">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={{
                initial: (direction: number) => ({
                  opacity: 0,
                  x: direction > 0 ? 50 : -50,
                  scale: 0.98,
                  filter: "blur(4px)"
                }),
                animate: {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: {
                    duration: 0.4,
                    ease: [0.23, 1, 0.32, 1]
                  }
                },
                exit: (direction: number) => ({
                  opacity: 0,
                  x: direction > 0 ? -50 : 50,
                  scale: 1.02,
                  filter: "blur(4px)",
                  transition: {
                    duration: 0.3,
                    ease: [0.23, 1, 0.32, 1]
                  }
                })
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 tracking-[0.5em] uppercase">Calibrating...</div>}>
                {activeTab === "ritual" && <RitualDashboard />}
                {activeTab === "vault" && <GoalVault />}
                {activeTab === "oracle" && <SynkOracle />}
                {activeTab === "identity" && <IdentityCard />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="relative z-20 h-[72px] md:h-[88px] flex justify-around md:justify-center items-center md:gap-14 border-t border-synk-border backdrop-blur-3xl bg-black/60 px-2 md:px-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => handleNav(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all p-0 flex-1 md:flex-none md:min-w-[64px] bg-transparent border-none group",
                isActive 
                  ? "text-white" 
                  : "text-white/30 hover:text-white/60"
              )}
            >
              <div 
                className={cn(
                  "flex items-center justify-center w-7 h-7 md:w-8 md:h-8 border-[0.5px] transition-all rounded-full",
                  tab.id === "oracle" ? "bg-synk-lavender text-white border-transparent shadow-[0_0_15px_rgba(167,139,250,0.4)]" : "border-current",
                  isActive && tab.id !== "oracle" ? "bg-white/10 border-white" : "group-hover:border-white/40"
                )}
              >
                  <Icon className="w-3 w-3.5 md:w-3.5 md:h-3.5" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[7px] md:text-[9px] font-serif font-medium tracking-[0.1em] md:tracking-[0.15em] transition-opacity uppercase leading-none">{tab.label}</span>
                <span className="hidden md:block text-[7px] tracking-widest text-synk-lavender/50 font-medium leading-none mt-0.5">{tab.subLabel}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {achievement.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center p-4 rounded-2xl bg-black/60 border border-synk-lavender/30 backdrop-blur-xl shadow-[0_0_30px_rgba(167,139,250,0.2)]"
          >
            <Sparkles className="w-8 h-8 text-synk-lavender mb-2 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-synk-lavender drop-shadow-[0_0_5px_rgba(167,139,250,0.8)]">
              {achievement.title}
            </h3>
            <p className="text-xs text-white/70 uppercase tracking-widest mt-1">
              {achievement.sub}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
