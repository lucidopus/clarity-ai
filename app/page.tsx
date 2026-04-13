'use client';

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  BookOpen,
  Zap,
  MessageSquare,
  Search,
  Code2,
  Layers,
  Cpu,
  Globe,
  Sparkles,
  Brain,
  Users,
  GitGraph,
  Target,
  FileText,
  Mic,
  Type,
  Radio
} from 'lucide-react';
import Button from '@/components/Button';
import { useState, useRef, useEffect } from 'react';

type SourceState = 'youtube' | 'pdf' | 'audio' | 'text' | 'live';

const SOURCE_ORDER: SourceState[] = ['youtube', 'pdf', 'audio', 'text', 'live'];

function YouTubeSource() {
  const [typed, setTyped] = useState('');
  const url = 'youtube.com/watch?v=algo-lecture-05';

  useEffect(() => {
    setTyped('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(url.slice(0, i));
      if (i >= url.length) clearInterval(iv);
    }, 45);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/>
        </svg>
      </div>
      <div className="text-sm text-foreground font-semibold">YouTube Video</div>
      <div className="w-full flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2.5">
        <span className="text-xs font-mono text-foreground/80 flex-1 truncate">
          {typed}
          <span className="inline-block w-px h-3 bg-accent ml-0.5 align-middle animate-pulse" />
        </span>
      </div>
    </div>
  );
}

function PdfSource() {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
        <FileText className="w-7 h-7 text-accent" />
      </div>
      <div className="text-sm text-foreground font-semibold">PDF Document</div>
      <div className="w-full flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground truncate">algorithms-chapter-5.pdf</div>
          <div className="text-[10px] text-secondary">2.4 MB</div>
        </div>
        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden shrink-0">
          <motion.div
            className="h-full w-full bg-accent rounded-full origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

function AudioSource() {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
        <Mic className="w-7 h-7 text-purple-500" />
      </div>
      <div className="text-sm text-foreground font-semibold">Audio File</div>
      <div className="w-full flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground truncate">lecture-recording.mp3</div>
          <div className="text-[10px] text-secondary">42:18</div>
        </div>
        <div className="flex items-end gap-0.5 h-6 shrink-0">
          {[0.5, 0.9, 0.4, 1, 0.7, 0.5, 0.8].map((h, i) => (
            <motion.div
              key={i}
              className="w-0.5 bg-purple-500 rounded-full origin-bottom"
              animate={{ scaleY: [h * 0.4, h, h * 0.4] }}
              transition={{ duration: 0.9, delay: i * 0.08, repeat: Infinity, ease: 'easeInOut' }}
              style={{ height: '100%' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TextSource() {
  const [text, setText] = useState('');
  const full = 'The binary search algorithm works by repeatedly dividing the sorted array in half until the target element is found...';

  useEffect(() => {
    setText('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 22);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <Type className="w-7 h-7 text-emerald-500" />
      </div>
      <div className="text-sm text-foreground font-semibold">Plain Text</div>
      <div className="w-full bg-background border border-border rounded-xl px-4 py-3 min-h-[76px]">
        <div className="text-xs text-foreground/80 leading-relaxed">
          {text}
          <span className="inline-block w-px h-3 bg-accent ml-0.5 align-middle animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function LiveSource() {
  const [seconds, setSeconds] = useState(754); // starts at 12:34

  useEffect(() => {
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="relative w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <Radio className="w-7 h-7 text-red-500" />
        <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border-2 border-card-bg" />
      </div>
      <div className="text-sm text-foreground font-semibold">Live Lecture</div>
      <div className="w-full flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">REC</span>
        </div>
        <div className="flex items-end gap-0.5 h-5 flex-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-red-500/70 rounded-full origin-bottom"
              animate={{ scaleY: [0.3, 0.9, 0.5, 1, 0.4, 0.3] }}
              transition={{ duration: 1.3, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
              style={{ height: '100%' }}
            />
          ))}
        </div>
        <div className="text-[11px] font-mono text-foreground shrink-0 tabular-nums">
          {hh}:{mm}:{ss}
        </div>
      </div>
    </div>
  );
}

function SourceUploadDemo() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setIdx((i) => (i + 1) % SOURCE_ORDER.length);
    }, 3600);
    return () => clearInterval(iv);
  }, []);

  const state = SOURCE_ORDER[idx];

  return (
    <div className="bg-card-bg border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/60">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
          <div className="w-3 h-3 rounded-full bg-green-400/50" />
        </div>
        <div className="flex-1 mx-2 bg-background/60 border border-border rounded-md px-3 py-1 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <span className="text-xs text-secondary font-mono">clarity.ai / generate</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 min-h-[280px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full"
          >
            {state === 'youtube' && <YouTubeSource />}
            {state === 'pdf' && <PdfSource />}
            {state === 'audio' && <AudioSource />}
            {state === 'text' && <TextSource />}
            {state === 'live' && <LiveSource />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step indicators */}
      <div className="px-4 py-3 border-t border-border bg-background/40 flex items-center justify-center gap-2">
        {SOURCE_ORDER.map((s, i) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === idx ? 'w-6 bg-accent' : 'w-1.5 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
export default function Home() {
  const [url, setUrl] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement
  const springConfig = { damping: 25, stiffness: 700 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Torch reveal mask — must be at top level (Rules of Hooks)
  const torchMask = useTransform(
    [smoothX, smoothY],
    ([x, y]: number[]) => `radial-gradient(circle 250px at ${x}px ${y}px, black 30%, transparent 100%)`
  );

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  useEffect(() => {
    // Initial position targeted slightly on the right and slightly up from "Clarity"
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        mouseX.set(width * 0.54); // 54% is slightly left from previous 58%
        mouseY.set(height * 0.4);  // 40% remains the same
    }
  }, [mouseX, mouseY]);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
        {/* Ambient background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px] animate-pulse-subtle"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px] animate-pulse-subtle" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-[60%] h-[30%] bg-accent/5 rounded-full blur-[120px] opacity-50"></div>
        </div>

        {/* Hero Section */}
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20">
          <motion.div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="text-center max-w-5xl mx-auto mb-12 relative group"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* The Base Layer (Background/Dimmed) */}
            <div className="relative select-none cursor-default">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 flex flex-wrap items-center justify-center gap-x-4">
                <span className="text-foreground/20 blur-[2px] transition-all duration-500 group-hover:blur-0">
                  Clarity
                </span>
                <span className="text-gradient">AI</span>
              </h1>
              {/* Invisible tagline in base layer */}
              <div className="h-12 mb-8 opacity-0">The Smarter Way to Learn is Here</div>
            </div>

            {/* The Torch Reveal Layer (Bright/Cyan) */}
            <motion.div
                className="absolute inset-0 z-20 pointer-events-none select-none"
                style={{
                    maskImage: torchMask,
                    WebkitMaskImage: torchMask,
                }}
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 flex flex-wrap items-center justify-center gap-x-4">
                <span className="text-accent">
                  Clarity
                </span>
                {/* AI is already bright/gradient, so we don't need to double-reveal it, or we mirror it */}
                <span className="text-gradient">AI</span>
              </h1>
              <div className="h-12 mb-8 flex items-center justify-center text-accent text-xl md:text-2xl font-medium tracking-wide">
                The Smarter Way to Learn is Here
              </div>
            </motion.div>

            {/* Ambient Glow that follows exactly at cursor */}
            <motion.div
              className="absolute w-64 h-64 bg-accent/20 blur-3xl rounded-full z-0 pointer-events-none"
              style={{
                left: smoothX,
                top: smoothY,
                x: "-50%",
                y: "-50%",
              }}
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
            />
            
            <p className="text-xl md:text-2xl text-secondary max-w-3xl mx-auto leading-relaxed mb-10">
              A new perspective on learning in the AI era.
              <br className="hidden md:block" />
              Transform any YouTube video into interactive study materials.
            </p>

            {/* Search/Input Bar */}
            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 to-accent-hover/50 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center bg-card-bg/80 backdrop-blur-xl rounded-full p-2 shadow-xl">
                <div className="pl-4 text-accent">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Paste a YouTube URL to start learning..."
                  className="flex-1 bg-transparent !border-none !focus:ring-0 !ring-0 !outline-none text-foreground placeholder-secondary/50 px-4 py-3 shadow-none focus:outline-none"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button 
                  href={url ? `/dashboard?url=${encodeURIComponent(url)}` : '/auth/signup'} 
                  variant="primary" 
                  className="!rounded-full px-6 md:px-8"
                  size="md"
                >
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center gap-6 text-sm text-secondary">
              <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>Free to start</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-accent mr-2"></span>No credit card required</span>
            </div>
          </motion.div>

          {/* 3D Floating Cards */}
          <div className="w-full max-w-7xl mx-auto h-[550px] md:h-[650px] relative perspective-container mt-12 hidden md:block">
            {/* Card 1: Mind Map - Left Foreground */}
            <motion.div 
              className="absolute top-1/2 -translate-y-[60%] left-0 md:left-[2%] w-72 h-[400px] z-10"
              animate={{ 
                y: [0, -20, 0],
                rotateY: [10, 5, 10], 
                rotateX: [5, 0, 5]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0
              }}
            >
              <div className="w-full h-full bg-card-bg/90 backdrop-blur-md rounded-2xl border border-accent/20 p-8 shadow-2xl flex flex-col justify-between glow-border card-3d">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6">
                  <GitGraph className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4">Mind Map</h3>
                  <div className="space-y-4 opacity-70">
                    <div className="h-2 w-full bg-accent/20 rounded"></div>
                    <div className="flex gap-4">
                      <div className="h-2 w-1/3 bg-accent/20 rounded"></div>
                      <div className="h-2 w-1/3 bg-accent/20 rounded"></div>
                    </div>
                    <div className="h-2 w-full bg-accent/20 rounded"></div>
                    <div className="flex gap-4 justify-end">
                      <div className="h-2 w-1/2 bg-accent/20 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-4 flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent/40"></div>
                  <div className="w-3 h-3 rounded-full bg-accent/20"></div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Code/Center - Main Focus */}
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-85 h-[420px] z-20"
              animate={{ 
                y: [0, -30, 0],
              }}
              transition={{ 
                duration: 7, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 1
              }}
            >
              <div className="w-full h-full bg-card-bg rounded-[2.5rem] border-2 border-accent/40 p-10 shadow-[0_0_60px_rgba(6,182,212,0.15)] flex flex-col justify-center items-center text-center glow-border card-3d bg-gradient-to-b from-card-bg to-accent/5">
                <div className="w-24 h-24 rounded-3xl bg-accent/10 flex items-center justify-center text-accent mb-10">
                  <Zap className="w-12 h-12" />
                </div>
                <h3 className="text-4xl font-bold mb-4 tracking-tight">Instant Clarity</h3>
                <p className="text-secondary text-lg max-w-xs mx-auto">Transform hours of video into minutes of reading.</p>
                <div className="mt-10 px-6 py-2.5 bg-accent/10 rounded-full text-accent text-sm font-mono border border-accent/20 shadow-inner">
                  Analyzed: 1,420 keyframes
                </div>
              </div>
            </motion.div>

            {/* Card 3: Chat - Right */}
            <motion.div 
              className="absolute top-1/2 -translate-y-[60%] right-0 md:right-[2%] w-72 h-[400px] z-10"
              animate={{ 
                y: [0, -25, 0],
                rotateY: [-10, -5, -10], 
                rotateX: [5, 0, 5]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 2
              }}
            >
              <div className="w-full h-full bg-card-bg/90 backdrop-blur-md rounded-2xl border border-accent/20 p-8 shadow-2xl flex flex-col justify-between glow-border card-3d">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <div className="h-2.5 w-16 bg-accent/20 rounded mb-6"></div>
                  <h3 className="text-2xl font-bold mb-4">AI Tutor</h3>
                   <div className="space-y-4 mt-6">
                    <div className="flex justify-end">
                      <div className="bg-accent/10 text-accent text-xs p-3.5 rounded-l-xl rounded-tr-xl max-w-[90%] leading-relaxed shadow-sm">
                        He just typed 40 lines of code and said it&apos;s &quot;simple.&quot; It is NOT simple.
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-foreground/5 text-secondary text-xs p-3.5 rounded-r-xl rounded-tl-xl max-w-[90%] leading-relaxed shadow-sm">
                        Haha, standard. He&apos;s skipping steps to move fast. I&apos;ve distilled those 40 lines into 4 logical primitives. Want the &quot;actually simple&quot; version?
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* BACKGROUND LAYER - Deeper cards */}
            {/* Card 4: Smart Notes - Background Left */}
            <motion.div 
              className="absolute top-0 left-[20%] w-64 h-72 z-0 opacity-40 blur-[1px]"
              animate={{ 
                y: [0, -15, 0],
                rotateZ: [-2, 2, -2]
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity, 
                ease: "easeInOut"
              }}
            >
              <div className="w-full h-full bg-card-bg/50 backdrop-blur-sm rounded-2xl border border-accent/10 p-6 flex flex-col justify-between card-3d">
                <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center text-accent/50">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground/40 mb-2">Smart Notes</h4>
                  <div className="h-1.5 w-full bg-accent/10 rounded mb-2"></div>
                  <div className="h-1.5 w-3/4 bg-accent/10 rounded mb-2"></div>
                  <div className="h-1.5 w-1/2 bg-accent/10 rounded"></div>
                </div>
              </div>
            </motion.div>

            {/* Card 5: Challenges - Background Right */}
            <motion.div 
              className="absolute top-0 right-[20%] w-64 h-72 z-0 opacity-40 blur-[1px]"
              animate={{ 
                y: [0, 15, 0],
                rotateZ: [2, -2, 2]
              }}
              transition={{ 
                duration: 12, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 1
              }}
            >
              <div className="w-full h-full bg-card-bg/50 backdrop-blur-sm rounded-2xl border border-accent/10 p-6 flex flex-col justify-between card-3d">
                <div className="w-10 h-10 rounded-lg bg-accent/5 flex items-center justify-center text-accent/50">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground/40 mb-2">Real Scenarios</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-8 bg-accent/10 rounded"></div>
                    <div className="h-8 bg-accent/10 rounded"></div>
                    <div className="h-8 bg-accent/10 rounded"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Background connection lines (Simple SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-0" viewBox="0 0 1000 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              {/* Foreground lines */}
              <path d="M150 240 C 300 240, 350 300, 500 300" stroke="currentColor" fill="none" className="text-accent" strokeWidth="2" strokeDasharray="8,8" />
              <path d="M850 240 C 700 240, 650 300, 500 300" stroke="currentColor" fill="none" className="text-accent" strokeWidth="2" strokeDasharray="8,8" />
              
              {/* Background lines (connecting deep cards) */}
              <path d="M250 100 C 350 150, 450 150, 500 300" stroke="currentColor" fill="none" className="text-accent/30" strokeWidth="1" strokeDasharray="4,4" />
              <path d="M750 100 C 650 150, 550 150, 500 300" stroke="currentColor" fill="none" className="text-accent/30" strokeWidth="1" strokeDasharray="4,4" />
              <path d="M250 100 L 750 100" stroke="currentColor" fill="none" className="text-accent/20" strokeWidth="1" strokeDasharray="10,10" />
            </svg>
          </div>
        </section>

        {/* Mission Section */}
        <section id="about" className="py-24 relative z-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
               className="text-center mb-16"
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for better retention</h2>
              <p className="text-secondary text-lg">Designed for anyone who learns from video</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-6">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Our Approach
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                  Passive watching doesn&apos;t create lasting knowledge
                </h3>
                <div className="space-y-6 text-lg text-secondary leading-relaxed">
                  <p>
                    Educational video content is everywhere, but retention remains low. Watching alone doesn&apos;t translate to learning.
                  </p>
                  <p>
                    Clarity AI bridges this gap with active recall techniques. Transform any video into personalized study tools—automatically generated flashcards, quizzes, and structured notes that drive real comprehension.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative h-[400px] w-full bg-card-bg/50 backdrop-blur-xl rounded-[2rem] border border-accent/20 p-8 overflow-hidden group hover:border-accent/40 transition-colors"
              >
                 {/* Graph Container */}
                 <div className="absolute inset-0 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                       <h4 className="text-xl font-bold flex items-center gap-2">
                         <Brain className="w-5 h-5 text-accent" />
                         Retention Impact
                       </h4>
                       <div className="flex gap-4 text-xs font-medium">
                          <div className="flex items-center gap-1.5 text-secondary">
                             <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                             Without Clarity AI
                          </div>
                          <div className="flex items-center gap-1.5 text-accent">
                             <div className="w-2 h-2 rounded-full bg-accent"></div>
                             With Clarity AI
                          </div>
                       </div>
                    </div>

                    <div className="relative flex-1 w-full">
                       {/* Grid lines - Improved visibility */}
                       <div className="absolute inset-0 flex flex-col justify-between">
                          <div className="w-full h-px bg-foreground/10"></div>
                          <div className="w-full h-px bg-foreground/10"></div>
                          <div className="w-full h-px bg-foreground/10"></div>
                          <div className="w-full h-px bg-foreground/10"></div>
                       </div>
                       
                       {/* Gradients */}
                       <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 300" preserveAspectRatio="none">
                          {/* Passive Curve (Forgetting) - 28% Retention (Ends at Y=226) */}
                          <motion.path 
                            d="M0,10 C150,160 250,210 500,226" 
                            fill="none" 
                            stroke="#d97706" 
                            strokeWidth="3" 
                            strokeDasharray="6,6"
                            strokeOpacity="0.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, ease: "easeOut" }}
                          />

                          {/* Active Curve (Retention) - 85% Retention (Consistent Dip) */}
                          <motion.path 
                            d="M0,10 C100,70 300,60 500,55" 
                            fill="none" 
                            stroke="#06B6D4" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            filter="drop-shadow(0 0 4px rgba(6,182,212,0.3))"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                          />
                       </svg>

                       {/* Active Points - Perfectly tracking the new consistent dip */}
                       {[160, 320, 450].map((x, i) => (
                          <motion.div 
                            key={i} 
                            className="absolute w-3 h-3 bg-card-bg border-2 border-accent rounded-full z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ 
                              left: `${(x / 500) * 100}%`, 
                              top: `${((i === 0 ? 53 : i === 1 ? 59 : 56) / 300) * 100}%` 
                            }} 
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 1.5 + i * 0.3 }}
                          />
                       ))}

                       {/* Labels resting precisely ON TOP of curve endpoints */}
                       <motion.div 
                          className="absolute right-0 text-amber-500 text-xs font-bold"
                          style={{ top: '61%' }}
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 2 }}
                       >
                          28% Retention
                       </motion.div>
                       <motion.div 
                          className="absolute right-0 text-accent text-xs font-bold"
                          style={{ top: '6%' }}
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 2.5 }}
                       >
                          85% Retention
                       </motion.div>
                    </div>

                    {/* Bottom Axis */}
                    <div className="flex justify-between text-xs text-secondary mt-4 uppercase tracking-wider">
                       <span>Day 1</span>
                       <span>Day 3</span>
                       <span>Day 7</span>
                       <span>Day 30</span>
                    </div>
                 </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Why Clarity AI Section */}
        <section id="why-clarity" className="py-24 relative z-10 bg-accent/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
               className="text-center mb-16"
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Clarity AI</h2>
              <p className="text-secondary text-lg">Purpose-built for educational content with research-backed learning methods</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1: Context */}
              <motion.div
                className="bg-card-bg/80 backdrop-blur-sm border border-accent/10 p-8 rounded-[2rem] hover:border-accent/30 transition-all duration-300 group relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
              >
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-24 h-24 text-accent" />
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6">
                    <Sparkles className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold mb-3">Education-First AI</h3>
                 <p className="text-secondary leading-relaxed">
                   Trained specifically for educational content. We identify key concepts, definitions, and relationships—going far beyond generic summaries to truly teach.
                 </p>
                 <div className="mt-8 pt-6 border-t border-accent/10">  
                    <div className="flex items-center gap-2 text-sm text-accent font-medium">
                       <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                       Context Aware
                    </div>
                 </div>
              </motion.div>

              {/* Card 2: Science (Highlighted) */}
              <motion.div
                className="bg-gradient-to-b from-accent/10 to-card-bg border border-accent/20 p-8 rounded-[2rem] relative overflow-hidden group shadow-lg shadow-accent/5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                 <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-6 relative z-10">
                    <Brain className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold mb-3 relative z-10">Cognitive Science</h3>
                 <p className="text-secondary leading-relaxed relative z-10">
                   Built on the Forgetting Curve. Our tools enforce <span className="text-accent">Active Recall</span> and <span className="text-accent">Spaced Repetition</span>, proven to improve long-term retention by <span className="text-accent">1.8x - 2.4x</span>.
                 </p>
                 {/* Decorative Pulse */}
                 <div className="absolute bottom-6 right-6 flex gap-1">
                    <div className="w-1 h-4 bg-accent/20 rounded-full"></div>
                    <div className="w-1 h-6 bg-accent/40 rounded-full"></div>
                    <div className="w-1 h-8 bg-accent/80 rounded-full animate-pulse"></div>
                    <div className="w-1 h-6 bg-accent/40 rounded-full"></div>
                    <div className="w-1 h-4 bg-accent/20 rounded-full"></div>
                 </div>
              </motion.div>

              {/* Card 3: Experience */}
              <motion.div
                className="bg-card-bg/80 backdrop-blur-sm border border-accent/10 p-8 rounded-[2rem] hover:border-accent/30 transition-all duration-300 group relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-24 h-24 text-purple-400" />
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
                    <Users className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold mb-3">User-Centered</h3>
                 <p className="text-secondary leading-relaxed">
                   Every feature solves a real student problem. From &quot;Too long to watch&quot; to &quot;Hard to review,&quot; we build exactly what you need to study less and learn more.
                 </p>
                  <div className="mt-8 pt-6 border-t border-accent/10">  
                    <div className="flex items-center gap-2 text-sm text-purple-400 font-medium">
                       <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 border border-card-bg"></div>
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-card-bg"></div>
                       </div>
                       Student Approved
                    </div>
                 </div>
              </motion.div>
            </div>
          </div>
        </section>



        {/* Integration / Code Section */}
        <section id="how-it-works" className="py-24 relative z-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center px-3 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-8">
                  <Sparkles className="w-4 h-4 mr-2" />
                  How it Works
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-12">
                  From video to <br />
                  <span className="text-gradient">Mastery in seconds</span>
                </h2>
                
                <div className="space-y-12">
                  {/* Step 1 */}
                  <div className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-card-bg border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-300 relative z-10">
                      <span className="font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">Paste any URL</h3>
                      <p className="text-secondary">Simply drop a YouTube link for any lecture, tutorial, or technical deep dive.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-card-bg border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-300 relative z-10">
                      <span className="font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">AI Processing</h3>
                      <p className="text-secondary">Our agent analyzes audio, visual references (OCR), and context to extract key insights.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-card-bg border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-300 relative z-10">
                      <span className="font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">Structured Knowledge</h3>
                      <p className="text-secondary">Get a complete, portable output with chapters, summaries, and code snippets ready for your note-taking app.</p>
                    </div>
                  </div>
                </div>

              </motion.div>

              <motion.div
                className="relative h-[500px] w-full overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                style={{ 
                  maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                }}
              >
                {/* Back glow */}


                {/* Scrolling Code Content */}
                <div className="absolute inset-x-0 top-0 overflow-hidden h-full font-mono text-sm leading-6 flex flex-col justify-center">
                   <motion.div
                     animate={{ y: [0, -1000] }}
                     transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                     className="px-6 text-accent/80"
                   >
                     <pre>
{`{
  "summary": {
    "title": "Machine Learning Fundamentals",
    "duration": "14:20",
    "topics": [
      "Neural Networks",
      "Backpropagation",
      "Gradient Descent"
    ]
  },
  "chapters": [
    {
      "timestamp": "00:00",
      "title": "Introduction",
      "content": "Overview of neural architecture..."
    },
    {
      "timestamp": "02:15",
      "title": "The Neuron Model",
      "notes": "Mathematical representation of a biological neuron."
    }
  ],
  "key_concepts": [
    {
      "term": "Activation Function",
      "definition": "Determines the output of a neural network node."
    },
    {
      "term": "Learning Rate",
      "definition": "Hyperparameter controlling model change."
    }
  ],
  "export_config": {
    "format": "markdown",
    "include_timestamps": true,
    "highlight_color": "#06B6D4"
  },
  "meta": {
    "version": "2.1.0",
    "generated_by": "Clarity AI Agent",
    "processing_time": "4.2s"
  },
  "graph_data": {
    "nodes": [
      { "id": "n1", "label": "Input Layer" },
      { "id": "n2", "label": "Hidden Layer" }
    ],
    "edges": [
      { "source": "n1", "target": "n2", "weight": 0.85 }
    ]
  }
}

// ... Additional Processed Data ...

{
  "review_session": {
    "next_review": "2024-03-15T10:00:00Z",
    "strength_score": 0.88,
    "focus_areas": ["Calculus Chain Rule"]
  }
}
`}
                     </pre>
                     {/* Duplicate content for seamless loop */}
                     <pre>
{`{
  "summary": {
    "title": "Machine Learning Fundamentals",
    "duration": "14:20",
    "topics": [
      "Neural Networks",
      "Backpropagation",
      "Gradient Descent"
    ]
  },
  "chapters": [
    {
      "timestamp": "00:00",
      "title": "Introduction",
      "content": "Overview of neural architecture..."
    },
    {
      "timestamp": "02:15",
      "title": "The Neuron Model",
      "notes": "Mathematical representation of a biological neuron."
    }
  ],
  "key_concepts": [
    {
      "term": "Activation Function",
      "definition": "Determines the output of a neural network node."
    },
    {
      "term": "Learning Rate",
      "definition": "Hyperparameter controlling model change."
    }
  ],
  "export_config": {
    "format": "markdown",
    "include_timestamps": true,
    "highlight_color": "#06B6D4"
  },
  "meta": {
    "version": "2.1.0",
    "generated_by": "Clarity AI Agent",
    "processing_time": "4.2s"
  },
  "graph_data": {
    "nodes": [
      { "id": "n1", "label": "Input Layer" },
      { "id": "n2", "label": "Hidden Layer" }
    ],
    "edges": [
      { "source": "n1", "target": "n2", "weight": 0.85 }
    ]
  }
}

// ... Additional Processed Data ...

{
  "review_session": {
    "next_review": "2024-03-15T10:00:00Z",
    "strength_score": 0.88,
    "focus_areas": ["Calculus Chain Rule"]
  }
}
`}
                     </pre>
                   </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Showcase Section */}
        <section className="py-20 relative z-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Left: copy */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Bring anything you learn from
                </div>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight text-foreground">
                  Drop in any source.<br />
                  <span className="text-gradient">We&apos;ll do the rest.</span>
                </h2>
                <p className="text-lg text-secondary leading-relaxed max-w-md">
                  Paste a YouTube link, upload a PDF or audio file, drop in notes, or capture a live lecture as it happens. Clarity AI turns any of them into a full interactive study kit — automatically.
                </p>

                <div className="flex flex-wrap gap-6 pt-2">
                  {[
                    { value: '5+', label: 'Source types' },
                    { value: '8', label: 'Study tools' },
                    { value: '< 60s', label: 'To generate' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="text-2xl font-bold text-accent">{stat.value}</div>
                      <div className="text-xs text-secondary mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <Button href="/auth/signup" variant="primary" size="lg" className="rounded-full px-8">
                  Try it free →
                </Button>
              </div>

              {/* Right: animated source upload demo */}
              <SourceUploadDemo />
            </div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section className="py-24 relative z-10" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {[
                {
                  icon: <Layers className="w-8 h-8" />,
                  title: "Structure your learning",
                  description: "Automatically break down long videos into logical chapters, key concepts, and summaries.",
                },
                {
                  icon: <Cpu className="w-8 h-8" />,
                  title: "Generated automatically",
                  description: "Our AI agent watches the video for you, extracting every important detail so you don't miss a thing.",
                },
                {
                  icon: <Globe className="w-8 h-8" />,
                  title: "Always accessible",
                  description: "Access your study materials from any device, anywhere. Your knowledge base is always with you.",
                },
                {
                  icon: <Code2 className="w-8 h-8" />,
                  title: "Linked back to source",
                  description: "Every note and flashcard is timestamp-linked to the original video. Never lose context.",
                }
              ].map((feature, index) => (
                <div key={index} className="feature-card p-8 rounded-3xl">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-secondary text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="py-24 relative z-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative bg-gradient-to-br from-card-bg to-background border border-accent/20 rounded-[2.5rem] p-8 md:p-16 overflow-hidden shadow-2xl">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-full h-full bg-accent/5 pointer-events-none"></div>
              <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-accent/10 rounded-full blur-[100px]"></div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                <div className="space-y-8">
                  <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                    What if learning just had... <br/>
                    <span className="text-gradient">More Clarity?</span>
                  </h2>
                  <p className="text-xl text-secondary max-w-lg">
                    Transform your learning experience today. Join thousands of learners mastering subjects faster with Clarity AI.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button href="/auth/signup" variant="primary" size="lg" className="rounded-full px-8 shadow-lg shadow-accent/20">
                      Get Started Free
                    </Button>
                    <Button href="#features" variant="outline" size="lg" className="rounded-full px-8 backdrop-blur-sm bg-transparent border-accent/30 hover:bg-accent/10">
                      Explore Features
                    </Button>
                  </div>
                  
                  <p className="text-sm text-secondary/80 mt-2">No credit card required • Get started for free</p>
                </div>

                <div className="relative h-[300px] lg:h-[400px] flex items-center justify-center perspective-container">
                  {/* 3D Cube Representation */}
                  <div className="relative w-48 h-48 md:w-64 md:h-64 animate-float">
                    <div className="absolute inset-0 border-2 border-accent/50 rounded-lg transform rotate-6 rotate-y-12 rotate-x-12 translate-z-12 bg-accent/5 backdrop-blur-sm"></div>
                    <div className="absolute inset-0 border-2 border-accent/30 rounded-lg transform -rotate-6 scale-90 bg-accent/5 backdrop-blur-sm flex items-center justify-center">
                       <Zap className="w-20 h-20 text-accent opacity-80" />
                    </div>
                  </div>
                  
                  {/* Floating Elements */}
                   <div className="absolute top-[20%] right-[10%] bg-card-bg border border-accent/20 p-4 rounded-xl shadow-xl max-w-[200px]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-mono text-secondary">Knowledge Synthesized</span>
                    </div>
                    <div className="h-1.5 w-full bg-accent/20 rounded-full overflow-hidden">
                      <div className="h-full bg-accent w-full"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-[20%] left-[10%] bg-card-bg border border-accent/20 p-4 rounded-xl shadow-xl">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                         <span className="text-xs font-bold text-accent">A</span>
                       </div>
                       <div className="space-y-1">
                         <div className="h-2 w-20 bg-secondary/20 rounded"></div>
                         <div className="h-2 w-12 bg-secondary/20 rounded"></div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Minimal */}
        <footer className="py-8 text-center text-sm text-secondary/60 relative z-10 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4">
            <p>&copy; {new Date().getFullYear()} Clarity AI. All rights reserved.</p>
          </div>
        </footer>
    </main>
  );
}