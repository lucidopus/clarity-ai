'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Zap, MessageSquare, Brain, GitGraph, Target,
  FileText, Headphones, Video, Sparkles,
  Play, FlaskConical, Lightbulb, PenTool,
  HelpCircle, ListChecks
} from 'lucide-react';

// ─── Shared sub-components ───────────────────────────────────────────────────

function HeroShell({ children, id, title, number }: { children: React.ReactNode; id: string; title: string; number: number }) {
  return (
    <section id={id} className="min-h-screen relative flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-24 border-b border-border overflow-hidden">
      <div className="absolute top-6 left-6 flex items-center gap-3 z-30">
        <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1">
          #{number}
        </span>
        <span className="text-sm font-medium text-secondary">{title}</span>
      </div>
      {children}
    </section>
  );
}

function HeroText({ headline, sub }: { headline: React.ReactNode; sub: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-12 relative z-10">
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-foreground">
        {headline}
      </h2>
      <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto">{sub}</p>
    </div>
  );
}

// ─── 1. PRISM SPLIT ──────────────────────────────────────────────────────────
// One beam in → prism → five beams out to different material types

function HeroPrismSplit() {
  const materials = [
    { icon: BookOpen, label: 'Flashcards', color: '#06B6D4', angle: -40, delay: 0.6 },
    { icon: HelpCircle, label: 'Quizzes', color: '#8B5CF6', angle: -20, delay: 0.75 },
    { icon: GitGraph, label: 'Mind Maps', color: '#10B981', angle: 0, delay: 0.9 },
    { icon: FileText, label: 'Notes', color: '#F59E0B', angle: 20, delay: 1.05 },
    { icon: MessageSquare, label: 'AI Tutor', color: '#EC4899', angle: 40, delay: 1.2 },
  ];

  return (
    <HeroShell id="prism-split" title="Prism Split" number={1}>
      <HeroText
        headline={<>One Source. <span className="text-gradient">Five Superpowers.</span></>}
        sub="Paste any video and watch it refract into everything you need to ace the exam."
      />
      <div className="relative w-full max-w-4xl mx-auto h-[350px] md:h-[400px]">
        {/* Incoming beam */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-accent to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: '42%' }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Prism */}
        <motion.div
          className="absolute left-[40%] top-1/2 -translate-y-1/2 -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rotate-45 bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/40 backdrop-blur-md rounded-lg shadow-[0_0_40px_rgba(6,182,212,0.3)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
        </motion.div>

        {/* Output beams + material nodes */}
        {materials.map((mat) => {
          const Icon = mat.icon;
          const yOffset = mat.angle * 3.5;
          return (
            <motion.div
              key={mat.label}
              className="absolute flex items-center gap-3"
              style={{ left: '48%', top: `calc(50% + ${yOffset}px)` }}
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 200 }}
              transition={{ duration: 0.8, delay: mat.delay, ease: 'easeOut' }}
            >
              {/* Beam line */}
              <div
                className="h-0.5 w-32 md:w-40 rounded-full"
                style={{ background: `linear-gradient(to right, ${mat.color}80, ${mat.color})` }}
              />
              {/* Material chip */}
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-lg whitespace-nowrap"
                style={{
                  borderColor: `${mat.color}40`,
                  background: `${mat.color}10`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: mat.delay + 0.4, type: 'spring' }}
              >
                <Icon className="w-4 h-4" style={{ color: mat.color }} />
                <span className="text-sm font-medium" style={{ color: mat.color }}>{mat.label}</span>
              </motion.div>
            </motion.div>
          );
        })}

        {/* Input label */}
        <motion.div
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-accent/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Video className="w-5 h-5" />
          <span className="text-sm font-mono">youtube.com/watch?v=...</span>
        </motion.div>
      </div>
    </HeroShell>
  );
}

// ─── 2. BENTO SNAP ───────────────────────────────────────────────────────────
// Scattered raw assets snap into a clean bento grid

function HeroBentoSnap() {
  const [snapped, setSnapped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSnapped(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const cards = [
    { icon: BookOpen, label: 'Flashcards', span: 'col-span-1 row-span-2', color: 'from-cyan-500/20 to-cyan-500/5' },
    { icon: HelpCircle, label: 'Quiz', span: 'col-span-1 row-span-1', color: 'from-violet-500/20 to-violet-500/5' },
    { icon: GitGraph, label: 'Mind Map', span: 'col-span-2 row-span-1', color: 'from-emerald-500/20 to-emerald-500/5' },
    { icon: MessageSquare, label: 'Clara AI', span: 'col-span-1 row-span-1', color: 'from-pink-500/20 to-pink-500/5' },
    { icon: FileText, label: 'Notes', span: 'col-span-1 row-span-1', color: 'from-amber-500/20 to-amber-500/5' },
    { icon: Target, label: 'Prereqs', span: 'col-span-1 row-span-1', color: 'from-red-500/20 to-red-500/5' },
  ];

  const scattered = [
    { x: -180, y: -120, r: 15 },
    { x: 200, y: -80, r: -20 },
    { x: -100, y: 140, r: 25 },
    { x: 250, y: 100, r: -15 },
    { x: -220, y: 40, r: 10 },
    { x: 150, y: 180, r: -25 },
  ];

  return (
    <HeroShell id="bento-snap" title="Bento Snap" number={2}>
      <HeroText
        headline={<>Everything. <span className="text-gradient">Organized.</span></>}
        sub="Raw content snaps into a perfectly structured study dashboard."
      />
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-3 grid-rows-3 gap-3 md:gap-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
            const s = scattered[i];
            return (
              <motion.div
                key={card.label}
                className={`${card.span} bg-gradient-to-br ${card.color} border border-border/50 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between min-h-[100px]`}
                initial={{
                  x: s.x,
                  y: s.y,
                  rotate: s.r,
                  opacity: 0,
                  scale: 0.8,
                }}
                animate={snapped ? {
                  x: 0,
                  y: 0,
                  rotate: 0,
                  opacity: 1,
                  scale: 1,
                } : {
                  x: s.x,
                  y: s.y,
                  rotate: s.r,
                  opacity: 0.5,
                  scale: 0.8,
                }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.08,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <Icon className="w-6 h-6 text-foreground/60" />
                <span className="text-sm font-medium text-foreground/80 mt-2">{card.label}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </HeroShell>
  );
}

// ─── 3. X-RAY SCANNER ───────────────────────────────────────────────────────
// A scanning line reveals structured content from blurred text

function HeroXRayScanner() {
  const [scanX, setScanX] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanX((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const rawLines = [
    "um so today we're going to talk about photosynthesis right",
    "it's basically the process by which plants convert light energy",
    "you know carbon dioxide and water into glucose and oxygen",
    "the light dependent reactions happen in the thylakoid membrane",
    "while the calvin cycle occurs in the stroma of the chloroplast",
    "so the equation is 6CO2 plus 6H2O yields C6H12O6 plus 6O2",
    "nadph and atp are produced during the light reactions",
    "rubisco is the enzyme that fixes carbon in the calvin cycle",
  ];

  const structuredLines = [
    { type: 'heading', text: 'Photosynthesis' },
    { type: 'def', text: 'Process: Light energy → Glucose + O\u2082' },
    { type: 'key', text: 'Equation: 6CO\u2082 + 6H\u2082O → C\u2086H\u2081\u2082O\u2086 + 6O\u2082' },
    { type: 'sub', text: 'Light-Dependent Reactions' },
    { type: 'bullet', text: 'Location: Thylakoid membrane' },
    { type: 'bullet', text: 'Products: NADPH, ATP' },
    { type: 'sub', text: 'Calvin Cycle (Light-Independent)' },
    { type: 'bullet', text: 'Location: Stroma | Enzyme: Rubisco' },
  ];

  return (
    <HeroShell id="xray-scanner" title="X-Ray Scanner" number={3}>
      <HeroText
        headline={<>Find <span className="text-gradient">Clarity</span> in the Noise</>}
        sub="A raw transcript becomes structured knowledge as the scanner passes over."
      />
      <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border border-border bg-card-bg/50 backdrop-blur-md">
        <div className="relative p-6 md:p-8 font-mono text-sm leading-relaxed min-h-[320px]">
          {/* Raw text layer (behind) */}
          <div className="space-y-2.5 text-secondary/50" style={{ filter: 'blur(0.5px)' }}>
            {rawLines.map((line, i) => (
              <div key={i} className="truncate">{line}</div>
            ))}
          </div>

          {/* Structured text layer (revealed by clip) */}
          <div
            className="absolute inset-0 p-6 md:p-8 space-y-2.5 bg-card-bg/95"
            style={{ clipPath: `inset(0 ${100 - scanX}% 0 0)` }}
          >
            {structuredLines.map((line, i) => (
              <div key={i} className={
                line.type === 'heading' ? 'text-lg font-bold text-foreground' :
                line.type === 'sub' ? 'font-semibold text-accent mt-3' :
                line.type === 'key' ? 'text-accent/80 bg-accent/10 px-2 py-1 rounded inline-block' :
                line.type === 'def' ? 'text-foreground/80' :
                'text-secondary pl-4 border-l-2 border-accent/30'
              }>
                {line.text}
              </div>
            ))}
          </div>

          {/* Scan line */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_20px_4px_rgba(6,182,212,0.4)] z-20"
            style={{ left: `${scanX}%` }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between px-6 pb-4 text-xs text-secondary">
          <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Raw Transcript</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-accent" /> Structured Notes</span>
        </div>
      </div>
    </HeroShell>
  );
}

// ─── 4. DEPTH PEEL ───────────────────────────────────────────────────────────
// Cards peel back to reveal layers of study materials

function HeroDepthPeel() {
  const [peeled, setPeeled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPeeled(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const layers = [
    { icon: MessageSquare, label: 'AI Tutor', color: 'from-pink-500/10 to-pink-500/5', border: 'border-pink-500/20' },
    { icon: GitGraph, label: 'Mind Map', color: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20' },
    { icon: HelpCircle, label: 'Quiz', color: 'from-violet-500/10 to-violet-500/5', border: 'border-violet-500/20' },
    { icon: BookOpen, label: 'Flashcards', color: 'from-cyan-500/10 to-cyan-500/5', border: 'border-cyan-500/20' },
  ];

  return (
    <HeroShell id="depth-peel" title="Depth Peel" number={4}>
      <HeroText
        headline={<>Layers of <span className="text-gradient">Understanding</span></>}
        sub="Every video contains hidden layers of knowledge. We peel them back for you."
      />
      <div className="relative w-72 md:w-80 h-[400px] mx-auto" style={{ perspective: '1200px' }}>
        {/* Top card: Video */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-card-bg to-accent/5 border-2 border-accent/30 rounded-2xl p-8 flex flex-col items-center justify-center shadow-2xl z-20 backface-hidden"
          animate={peeled ? { rotateY: -60, x: -180, opacity: 0.3, scale: 0.9 } : {}}
          transition={{ duration: 1, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Your Video</h3>
          <p className="text-sm text-secondary text-center">45-minute lecture on Organic Chemistry</p>
          <div className="mt-6 w-full h-2 bg-accent/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'linear' }}
            />
          </div>
        </motion.div>

        {/* Underneath layers */}
        {layers.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <motion.div
              key={layer.label}
              className={`absolute inset-0 bg-gradient-to-br ${layer.color} border ${layer.border} rounded-2xl p-8 flex flex-col items-center justify-center shadow-lg`}
              style={{ zIndex: 10 - i }}
              initial={{ y: (i + 1) * 8, scale: 1 - (i + 1) * 0.03 }}
              animate={peeled ? {
                y: (i) * 80 + 20,
                x: (i) * 10,
                scale: 1,
                opacity: 1,
              } : {
                y: (i + 1) * 8,
                scale: 1 - (i + 1) * 0.03,
                opacity: 0.5,
              }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
            >
              <Icon className="w-10 h-10 text-foreground/50 mb-3" />
              <span className="text-lg font-semibold text-foreground/80">{layer.label}</span>
            </motion.div>
          );
        })}
      </div>
    </HeroShell>
  );
}

// ─── 5. KNOWLEDGE BLOOM ──────────────────────────────────────────────────────
// Tree grows from a seed node, sprouting material chips

function HeroKnowledgeBloom() {
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBloomed(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const branches = [
    { icon: BookOpen, label: 'Flashcards', x: -200, y: -120, delay: 0.3 },
    { icon: HelpCircle, label: 'Quizzes', x: 200, y: -100, delay: 0.5 },
    { icon: GitGraph, label: 'Mind Map', x: -160, y: 40, delay: 0.7 },
    { icon: MessageSquare, label: 'Clara', x: 180, y: 60, delay: 0.9 },
    { icon: FileText, label: 'Summary', x: -60, y: -160, delay: 0.4 },
    { icon: Target, label: 'Prereqs', x: 80, y: -170, delay: 0.6 },
    { icon: ListChecks, label: 'Chapters', x: -240, y: -30, delay: 0.8 },
    { icon: Lightbulb, label: 'Key Ideas', x: 240, y: -20, delay: 1.0 },
  ];

  return (
    <HeroShell id="knowledge-bloom" title="Knowledge Bloom" number={5}>
      <HeroText
        headline={<>Watch Knowledge <span className="text-gradient">Bloom</span></>}
        sub="From a single seed of content, an entire knowledge tree grows."
      />
      <div className="relative w-full max-w-3xl mx-auto h-[400px] flex items-center justify-center">
        {/* Center seed */}
        <motion.div
          className="absolute z-20 w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <Video className="w-8 h-8 text-accent" />
        </motion.div>

        {/* Branches */}
        {branches.map((b) => {
          const Icon = b.icon;
          return (
            <motion.div key={b.label} className="absolute z-10" style={{ left: '50%', top: '50%' }}>
              {/* Connection line */}
              <svg className="absolute" style={{ left: 0, top: 0, overflow: 'visible' }}>
                <motion.line
                  x1={0} y1={0} x2={b.x} y2={b.y}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                  initial={{ pathLength: 0 }}
                  animate={bloomed ? { pathLength: 1 } : {}}
                  transition={{ duration: 0.6, delay: b.delay }}
                />
              </svg>

              {/* Node */}
              <motion.div
                className="absolute flex items-center gap-2 px-3 py-2 rounded-xl bg-card-bg/80 border border-border backdrop-blur-md shadow-lg"
                style={{ left: b.x - 50, top: b.y - 16 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={bloomed ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: b.delay + 0.3, type: 'spring' }}
              >
                <Icon className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{b.label}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </HeroShell>
  );
}

// ─── 6. ECHO RIPPLE ──────────────────────────────────────────────────────────
// Audio waveform pulses, ripples flip raw icons to finished ones

function HeroEchoRipple() {
  const [ripple, setRipple] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRipple((p) => (p + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { raw: Video, done: BookOpen, label: 'Flashcards', dist: 120 },
    { raw: Headphones, done: HelpCircle, label: 'Quiz', dist: 180 },
    { raw: FileText, done: GitGraph, label: 'Mind Map', dist: 240 },
    { raw: PenTool, done: MessageSquare, label: 'Clara', dist: 300 },
  ];

  return (
    <HeroShell id="echo-ripple" title="Echo Ripple" number={6}>
      <HeroText
        headline={<>Every Beat. <span className="text-gradient">A Breakthrough.</span></>}
        sub="Content pulses through AI, transforming with every ripple."
      />
      <div className="relative w-full max-w-2xl mx-auto h-[400px] flex items-center justify-center">
        {/* Ripple rings */}
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-accent/20"
            animate={{
              width: [40, 600],
              height: [40, 600],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: ring * 1,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Center pulse */}
        <motion.div
          className="absolute z-20 w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap className="w-7 h-7 text-accent" />
        </motion.div>

        {/* Orbiting items */}
        {items.map((item, i) => {
          const angle = (i * 90) * (Math.PI / 180);
          const x = Math.cos(angle) * item.dist;
          const y = Math.sin(angle) * item.dist;
          const isFlipped = ripple > i;
          const RawIcon = item.raw;
          const DoneIcon = item.done;

          return (
            <motion.div
              key={item.label}
              className="absolute z-10"
              style={{ left: `calc(50% + ${x}px - 28px)`, top: `calc(50% + ${y}px - 28px)` }}
            >
              <motion.div
                className="w-14 h-14 rounded-xl border backdrop-blur-md flex items-center justify-center shadow-lg"
                animate={{
                  rotateY: isFlipped ? 180 : 0,
                  backgroundColor: isFlipped ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
                  borderColor: isFlipped ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.1)',
                }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {isFlipped ? (
                  <DoneIcon className="w-6 h-6 text-accent" style={{ transform: 'rotateY(180deg)' }} />
                ) : (
                  <RawIcon className="w-6 h-6 text-secondary/50" />
                )}
              </motion.div>
              <motion.span
                className="block text-center text-xs mt-2 font-medium"
                animate={{ color: isFlipped ? 'var(--accent)' : 'var(--secondary)' }}
              >
                {item.label}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </HeroShell>
  );
}

// ─── 7. TYPEWRITER DECODE ────────────────────────────────────────────────────
// Garbled text decodes character-by-character into structured content

function HeroTypewriterDecode() {
  const lines = [
    { final: 'Photosynthesis: Core Concepts', style: 'text-xl font-bold text-foreground' },
    { final: '', style: '' },
    { final: 'Definition', style: 'text-accent font-semibold' },
    { final: 'The process of converting light energy into chemical energy', style: 'text-secondary' },
    { final: '', style: '' },
    { final: 'Key Equation', style: 'text-accent font-semibold' },
    { final: '6CO\u2082 + 6H\u2082O \u2192 C\u2086H\u2081\u2082O\u2086 + 6O\u2082', style: 'font-mono text-foreground bg-accent/10 px-2 py-1 rounded inline-block' },
    { final: '', style: '' },
    { final: 'Two Main Stages', style: 'text-accent font-semibold' },
    { final: '1. Light-dependent reactions (thylakoid)', style: 'text-secondary pl-4' },
    { final: '2. Calvin Cycle (stroma)', style: 'text-secondary pl-4' },
  ];

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
  const [decoded, setDecoded] = useState<string[]>(lines.map(() => ''));
  const lineIdxRef = useRef(0);
  const charIdxRef = useRef(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const li = lineIdxRef.current;
      const ci = charIdxRef.current;
      if (li >= lines.length) return;

      const line = lines[li];
      if (line.final === '') {
        setDecoded((prev) => { const n = [...prev]; n[li] = ''; return n; });
        lineIdxRef.current = li + 1;
        charIdxRef.current = 0;
        forceRender((p) => p + 1);
        setTimeout(tick, 25);
        return;
      }
      if (ci >= line.final.length) {
        lineIdxRef.current = li + 1;
        charIdxRef.current = 0;
        forceRender((p) => p + 1);
        setTimeout(tick, 25);
        return;
      }

      setDecoded((prev) => {
        const n = [...prev];
        const revealed = line.final.slice(0, ci + 1);
        const remaining = Array.from({ length: Math.max(0, line.final.length - ci - 1) }, () =>
          chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        n[li] = revealed + remaining;
        return n;
      });
      charIdxRef.current = ci + 1;
      forceRender((p) => p + 1);
      setTimeout(tick, 25);
    }

    setTimeout(tick, 500);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HeroShell id="typewriter-decode" title="Typewriter Decode" number={7}>
      <HeroText
        headline={<>Decoding <span className="text-gradient">Knowledge</span></>}
        sub="Watch raw lecture data decode into structured study material in real time."
      />
      <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border bg-card-bg/80 backdrop-blur-md p-6 md:p-8 font-mono text-sm leading-relaxed min-h-[300px]">
        {/* Terminal header */}
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-3 text-xs text-secondary">clarity-ai --decode transcript.json</span>
        </div>
        <div className="space-y-1.5">
          {lines.map((line, i) => (
            <div key={i} className={i <= lineIdxRef.current ? line.style : 'text-secondary/20'}>
              {decoded[i] || (line.final === '' ? '\u00A0' : line.final.replace(/./g, '\u00B7'))}
              {i === lineIdxRef.current && charIdxRef.current < (line.final?.length || 0) && (
                <span className="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    </HeroShell>
  );
}

// ─── 8. TIMELINE MORPH ───────────────────────────────────────────────────────
// Video timeline splits into segmented sections that bloom into cards

function HeroTimelineMorph() {
  const [morphed, setMorphed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMorphed(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const segments = [
    { label: 'Intro', time: '0:00', w: '12%', icon: Play, color: 'bg-cyan-500' },
    { label: 'Theory', time: '2:15', w: '25%', icon: BookOpen, color: 'bg-violet-500' },
    { label: 'Example', time: '8:30', w: '20%', icon: Lightbulb, color: 'bg-amber-500' },
    { label: 'Deep Dive', time: '15:00', w: '28%', icon: Brain, color: 'bg-emerald-500' },
    { label: 'Summary', time: '24:10', w: '15%', icon: ListChecks, color: 'bg-pink-500' },
  ];

  return (
    <HeroShell id="timeline-morph" title="Timeline Morph" number={8}>
      <HeroText
        headline={<>Your Video, <span className="text-gradient">Chaptered</span></>}
        sub="A flat timeline transforms into intelligent, navigable study segments."
      />
      <div className="w-full max-w-2xl mx-auto">
        {/* Timeline bar (pre-morph) */}
        <motion.div
          className="relative h-3 bg-secondary/20 rounded-full overflow-hidden mb-8"
          animate={morphed ? { opacity: 0, height: 0, marginBottom: 0 } : { opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="h-full bg-accent/60 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </motion.div>

        {/* Segmented cards (post-morph) */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={morphed ? { opacity: 1 } : {}}
          transition={{ duration: 0.3 }}
        >
          {segments.map((seg, i) => {
            const Icon = seg.icon;
            return (
              <motion.div
                key={seg.label}
                className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card-bg/60 backdrop-blur-md hover:border-accent/30 transition-colors"
                initial={{ x: -40, opacity: 0 }}
                animate={morphed ? { x: 0, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12, type: 'spring' }}
              >
                <div className={`w-10 h-10 rounded-lg ${seg.color}/20 flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-foreground/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{seg.label}</span>
                    <span className="text-xs font-mono text-secondary">{seg.time}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${seg.color}/60 rounded-full`}
                      initial={{ width: '0%' }}
                      animate={morphed ? { width: seg.w } : {}}
                      transition={{ duration: 0.8, delay: i * 0.12 + 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </HeroShell>
  );
}

// ─── 9. GRADIENT FLOW ────────────────────────────────────────────────────────
// Ultra-minimal: flowing gradient orbs with floating labels (Vercel-style)

function HeroGradientFlow() {
  const labels = [
    { text: 'Flashcards', x: '15%', y: '25%', delay: 0 },
    { text: 'Quizzes', x: '75%', y: '20%', delay: 0.5 },
    { text: 'Mind Maps', x: '25%', y: '70%', delay: 1 },
    { text: 'AI Tutor', x: '70%', y: '65%', delay: 1.5 },
    { text: 'Notes', x: '50%', y: '45%', delay: 0.8 },
  ];

  return (
    <HeroShell id="gradient-flow" title="Gradient Flow" number={9}>
      <div className="absolute inset-0 overflow-hidden">
        {/* Large morphing gradient orbs */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }}
          animate={{
            x: ['-20%', '60%', '30%', '-20%'],
            y: ['-10%', '30%', '70%', '-10%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
          animate={{
            x: ['80%', '20%', '60%', '80%'],
            y: ['60%', '10%', '50%', '60%'],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute w-[350px] h-[350px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)' }}
          animate={{
            x: ['40%', '70%', '10%', '40%'],
            y: ['80%', '20%', '40%', '80%'],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />

        {/* Floating labels */}
        {labels.map((label) => (
          <motion.div
            key={label.text}
            className="absolute px-4 py-2 rounded-full border border-border/50 bg-background/40 backdrop-blur-xl text-sm font-medium text-foreground/70 shadow-lg"
            style={{ left: label.x, top: label.y }}
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 4, repeat: Infinity, delay: label.delay, ease: 'easeInOut' }}
          >
            {label.text}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-foreground">Learn with</span>
          <br />
          <span className="text-gradient">Clarity</span>
        </h2>
        <p className="text-lg md:text-xl text-secondary max-w-xl mx-auto mb-10">
          The minimalist study companion powered by AI.
        </p>
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-medium backdrop-blur-md">
          <Sparkles className="w-4 h-4" />
          Paste a link. Start learning.
        </div>
      </div>
    </HeroShell>
  );
}

// ─── 10. CARD ORBIT ──────────────────────────────────────────────────────────
// Study material cards orbit around a central AI core

function HeroCardOrbit() {
  const orbitItems = [
    { icon: BookOpen, label: 'Flashcards', radius: 160, speed: 20, startAngle: 0 },
    { icon: HelpCircle, label: 'Quiz', radius: 160, speed: 20, startAngle: 120 },
    { icon: GitGraph, label: 'Mind Map', radius: 160, speed: 20, startAngle: 240 },
    { icon: MessageSquare, label: 'Clara', radius: 240, speed: 30, startAngle: 60 },
    { icon: FileText, label: 'Notes', radius: 240, speed: 30, startAngle: 180 },
    { icon: Target, label: 'Prereqs', radius: 240, speed: 30, startAngle: 300 },
  ];

  return (
    <HeroShell id="card-orbit" title="Card Orbit" number={10}>
      <HeroText
        headline={<>Everything Revolves Around <span className="text-gradient">You</span></>}
        sub="Your learning materials, always within reach, powered by a central AI core."
      />
      <div className="relative w-full max-w-xl mx-auto h-[500px] flex items-center justify-center">
        {/* Orbit tracks */}
        <div className="absolute w-80 h-80 rounded-full border border-border/30" />
        <div className="absolute w-[480px] h-[480px] rounded-full border border-border/20" />

        {/* Center core */}
        <motion.div
          className="absolute z-20 w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/40 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.2)]"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          <Brain className="w-9 h-9 text-accent" />
        </motion.div>

        {/* Orbiting items */}
        {orbitItems.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              className="absolute z-10"
              style={{ width: item.radius * 2, height: item.radius * 2 }}
              animate={{ rotate: [item.startAngle, item.startAngle + 360] }}
              transition={{ duration: item.speed, repeat: Infinity, ease: 'linear' }}
            >
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                animate={{ rotate: [-(item.startAngle), -(item.startAngle + 360)] }}
                transition={{ duration: item.speed, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-12 h-12 rounded-xl bg-card-bg/80 border border-border backdrop-blur-md flex items-center justify-center shadow-lg">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-[10px] font-medium text-secondary whitespace-nowrap">{item.label}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </HeroShell>
  );
}

// ─── 11. LOOM WEAVE ──────────────────────────────────────────────────────────
// Horizontal and vertical threads intersect to create knowledge nodes

function HeroLoomWeave() {
  const [woven, setWoven] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWoven(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const horizontals = [
    { label: 'Video', y: '25%', delay: 0 },
    { label: 'Audio', y: '50%', delay: 0.2 },
    { label: 'Text', y: '75%', delay: 0.4 },
  ];

  const verticals = [
    { label: 'Concepts', x: '25%', delay: 0.6 },
    { label: 'Questions', x: '50%', delay: 0.8 },
    { label: 'Structure', x: '75%', delay: 1.0 },
  ];

  const nodes = [
    { x: '25%', y: '25%', icon: BookOpen, label: 'Cards', delay: 1.2 },
    { x: '50%', y: '25%', icon: HelpCircle, label: 'Quiz', delay: 1.3 },
    { x: '75%', y: '50%', icon: GitGraph, label: 'Map', delay: 1.4 },
    { x: '25%', y: '75%', icon: FileText, label: 'Notes', delay: 1.5 },
    { x: '50%', y: '50%', icon: Sparkles, label: 'Core', delay: 1.1 },
    { x: '75%', y: '75%', icon: MessageSquare, label: 'Chat', delay: 1.6 },
  ];

  return (
    <HeroShell id="loom-weave" title="Loom Weave" number={11}>
      <HeroText
        headline={<>Woven <span className="text-gradient">Intelligence</span></>}
        sub="Multiple data threads weave together to create interconnected knowledge."
      />
      <div className="relative w-full max-w-lg mx-auto h-[400px]">
        {/* Horizontal threads */}
        {horizontals.map((h) => (
          <motion.div
            key={h.label}
            className="absolute left-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
            style={{ top: h.y, width: '100%' }}
            initial={{ scaleX: 0 }}
            animate={woven ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: h.delay }}
          >
            <span className="absolute -left-16 -translate-y-1/2 text-xs text-secondary font-mono">{h.label}</span>
          </motion.div>
        ))}

        {/* Vertical threads */}
        {verticals.map((v) => (
          <motion.div
            key={v.label}
            className="absolute top-0 w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent"
            style={{ left: v.x, height: '100%' }}
            initial={{ scaleY: 0 }}
            animate={woven ? { scaleY: 1 } : {}}
            transition={{ duration: 0.8, delay: v.delay }}
          >
            <span className="absolute -top-6 -translate-x-1/2 text-xs text-secondary font-mono">{v.label}</span>
          </motion.div>
        ))}

        {/* Intersection nodes */}
        {nodes.map((node) => {
          const Icon = node.icon;
          return (
            <motion.div
              key={node.label}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: node.x, top: node.y }}
              initial={{ opacity: 0, scale: 0 }}
              animate={woven ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: node.delay, type: 'spring' }}
            >
              <div className="w-12 h-12 rounded-xl bg-card-bg border border-accent/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] backdrop-blur-md">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <span className="block text-center text-[10px] mt-1 text-secondary font-medium">{node.label}</span>
            </motion.div>
          );
        })}
      </div>
    </HeroShell>
  );
}

// ─── 12. THE DISTILLERY ──────────────────────────────────────────────────────
// Raw content drips in from top, refined materials emerge at bottom

function HeroDistillery() {
  const rawItems = ['Transcript', 'Audio', 'Slides', 'Notes', 'Video'];
  const outputItems = [
    { icon: BookOpen, label: 'Flashcards' },
    { icon: HelpCircle, label: 'Quizzes' },
    { icon: GitGraph, label: 'Mind Map' },
    { icon: MessageSquare, label: 'Clara' },
    { icon: FileText, label: 'Summary' },
  ];

  return (
    <HeroShell id="distillery" title="The Distillery" number={12}>
      <HeroText
        headline={<>Distilled <span className="text-gradient">Brilliance</span></>}
        sub="Raw educational content flows in. Pure, structured knowledge flows out."
      />
      <div className="relative w-full max-w-lg mx-auto h-[450px] flex flex-col items-center">
        {/* Raw inputs falling in */}
        <div className="flex gap-3 mb-6">
          {rawItems.map((item, i) => (
            <motion.div
              key={item}
              className="px-3 py-1.5 rounded-lg border border-border/50 bg-card-bg/50 text-xs font-mono text-secondary"
              animate={{ y: [0, 8, 0], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            >
              {item}
            </motion.div>
          ))}
        </div>

        {/* Funnel / processing zone */}
        <div className="relative flex-1 w-full flex items-center justify-center">
          {/* Funnel shape via borders */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-sm">
            <svg viewBox="0 0 400 200" className="w-full h-auto">
              <defs>
                <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path
                d="M 20 0 L 380 0 L 230 200 L 170 200 Z"
                fill="url(#funnelGrad)"
                stroke="var(--accent)"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* Processing indicator */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center z-10"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <FlaskConical className="w-6 h-6 text-accent" />
          </motion.div>

          {/* Drip particles */}
          {[0, 1, 2].map((p) => (
            <motion.div
              key={p}
              className="absolute w-2 h-2 rounded-full bg-accent/40"
              style={{ left: `calc(50% + ${(p - 1) * 15}px)` }}
              animate={{
                y: [-60, 80],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: p * 0.5,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>

        {/* Refined outputs emerging */}
        <div className="flex gap-3">
          {outputItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className="flex flex-col items-center gap-1.5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.2, duration: 0.5 }}
              >
                <motion.div
                  className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shadow-lg"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                >
                  <Icon className="w-5 h-5 text-accent" />
                </motion.div>
                <span className="text-[10px] font-medium text-secondary">{item.label}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </HeroShell>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

const sections = [
  { id: 'prism-split', label: 'Prism Split' },
  { id: 'bento-snap', label: 'Bento Snap' },
  { id: 'xray-scanner', label: 'X-Ray Scanner' },
  { id: 'depth-peel', label: 'Depth Peel' },
  { id: 'knowledge-bloom', label: 'Knowledge Bloom' },
  { id: 'echo-ripple', label: 'Echo Ripple' },
  { id: 'typewriter-decode', label: 'Typewriter Decode' },
  { id: 'timeline-morph', label: 'Timeline Morph' },
  { id: 'gradient-flow', label: 'Gradient Flow' },
  { id: 'card-orbit', label: 'Card Orbit' },
  { id: 'loom-weave', label: 'Loom Weave' },
  { id: 'distillery', label: 'The Distillery' },
];

export default function HeroSectionsShowcase() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky side nav */}
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-1.5">
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              activeSection === s.id
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-secondary hover:text-foreground hover:bg-card-bg'
            }`}
          >
            <span className="w-4 text-right font-mono opacity-50">{i + 1}</span>
            <span>{s.label}</span>
          </a>
        ))}
      </nav>

      {/* Header */}
      <div className="text-center py-16 px-4 border-b border-border">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Hero Section Showcase</h1>
        <p className="text-secondary max-w-xl mx-auto">
          12 animation concepts for the Clarity AI hero section. Scroll through and pick your favorite.
        </p>
      </div>

      {/* All hero sections */}
      <HeroPrismSplit />
      <HeroBentoSnap />
      <HeroXRayScanner />
      <HeroDepthPeel />
      <HeroKnowledgeBloom />
      <HeroEchoRipple />
      <HeroTypewriterDecode />
      <HeroTimelineMorph />
      <HeroGradientFlow />
      <HeroCardOrbit />
      <HeroLoomWeave />
      <HeroDistillery />

      {/* Footer */}
      <div className="text-center py-16 px-4 border-t border-border">
        <p className="text-secondary text-sm">Pick a favorite and let me know which one to implement.</p>
      </div>
    </div>
  );
}
