'use client';

import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Zap, 
  MessageSquare, 
  Search, 
  Code2, 
  Layers, 
  Cpu, 
  Globe,
  Compass,
  Sparkles,
  Brain,
  Users
} from 'lucide-react';
import Button from '@/components/Button';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');

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
            className="text-center max-w-5xl mx-auto mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Logo/Icon */}
            <motion.div 
              className="mx-auto mb-8 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-accent to-accent-hover rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20"
              whileHover={{ rotate: 10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Zap className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Clarity</span> <span className="text-gradient">AI</span>
            </h1>
            
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
          <div className="w-full max-w-6xl mx-auto h-[400px] md:h-[500px] relative perspective-container mt-8 hidden md:block">
            {/* Card 1: Notes - Left */}
            <motion.div 
              className="absolute top-1/4 left-0 md:left-[5%] w-64 h-80 z-10"
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
              <div className="w-full h-full bg-card-bg/90 backdrop-blur-md rounded-2xl border border-accent/20 p-6 shadow-2xl flex flex-col justify-between glow-border card-3d">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="h-2 w-12 bg-blue-500/20 rounded mb-4"></div>
                  <h3 className="text-xl font-bold mb-2">Smart Notes</h3>
                  <div className="space-y-2 opacity-50">
                    <div className="h-2 w-full bg-foreground/20 rounded"></div>
                    <div className="h-2 w-3/4 bg-foreground/20 rounded"></div>
                    <div className="h-2 w-5/6 bg-foreground/20 rounded"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Code/Center - Main Focus */}
            <motion.div 
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-72 h-96 z-20"
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
              <div className="w-full h-full bg-card-bg rounded-2xl border border-accent/40 p-6 shadow-2xl flex flex-col justify-center items-center text-center glow-border card-3d bg-gradient-to-b from-card-bg to-accent/5">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 animate-pulse-subtle">
                  <Zap className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Instant Clarity</h3>
                <p className="text-secondary text-sm">Transform hours of video into minutes of reading.</p>
                <div className="mt-8 px-4 py-2 bg-accent/10 rounded-full text-accent text-xs font-mono border border-accent/20">
                  Analyzed: 1,420 keyframes
                </div>
              </div>
            </motion.div>

            {/* Card 3: Chat - Right */}
            <motion.div 
              className="absolute top-1/4 right-0 md:right-[5%] w-64 h-80 z-10"
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
              <div className="w-full h-full bg-card-bg/90 backdrop-blur-md rounded-2xl border border-accent/20 p-6 shadow-2xl flex flex-col justify-between glow-border card-3d">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="h-2 w-12 bg-purple-500/20 rounded mb-4"></div>
                  <h3 className="text-xl font-bold mb-2">AI Tutor</h3>
                  <div className="space-y-3 mt-4">
                    <div className="flex justify-end">
                      <div className="bg-purple-500/10 text-purple-500 text-xs p-2 rounded-l-lg rounded-tr-lg max-w-[80%]">
                        Explain this concept?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-foreground/5 text-secondary text-xs p-2 rounded-r-lg rounded-tl-lg max-w-[80%]">
                        Here&apos;s a simple breakdown...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Background connection lines (Simple SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M300 150 C 450 150, 450 150, 600 250" stroke="currentColor" fill="none" className="text-accent" strokeWidth="2" strokeDasharray="5,5" />
              <path d="M900 150 C 750 150, 750 150, 600 250" stroke="currentColor" fill="none" className="text-accent" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 relative z-10 overflow-hidden">
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
                             <div className="w-2 h-2 rounded-full bg-red-400/50"></div>
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
                          {/* Passive Curve (Forgetting) - 28% Retention (Ends at Y=215) */}
                          <motion.path 
                            d="M0,20 C150,110 250,190 500,215" 
                            fill="none" 
                            stroke="#f87171" 
                            strokeWidth="3" 
                            strokeDasharray="6,6"
                            strokeOpacity="0.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: "easeOut" }}
                          />

                          {/* Active Curve (Retention) - 85% Retention (Pronounced Dip) */}
                          <motion.path 
                            d="M0,20 C100,70 300,65 500,60" 
                            fill="none" 
                            stroke="#06B6D4" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            filter="drop-shadow(0 0 4px rgba(6,182,212,0.3))"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                          />
                       </svg>

                       {/* Active Points - Sitting exactly on the new blue curve */}
                       {[160, 320, 450].map((x, i) => (
                          <motion.div 
                            key={i} 
                            className="absolute w-3 h-3 bg-card-bg border-2 border-accent rounded-full z-10 -translate-x-1/2 -translate-y-1/2"
                            style={{ 
                              left: `${(x / 500) * 100}%`, 
                              top: `${((i === 0 ? 54 : i === 1 ? 66 : 62) / 300) * 100}%` 
                            }} 
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.5 + i * 0.3 }}
                          />
                       ))}

                       {/* Labels resting precisely ON TOP of curve endpoints */}
                       <motion.div 
                          className="absolute right-0 text-red-400 text-xs font-bold"
                          style={{ top: '56%' }}
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: 2 }}
                       >
                          28% Retention
                       </motion.div>
                       <motion.div 
                          className="absolute right-0 text-accent text-xs font-bold"
                          style={{ top: '8%' }}
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
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
        <section className="py-24 relative z-10 bg-accent/5">
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
                   Every feature solves a real student problem. From "Too long to watch" to "Hard to review," we build exactly what you need to study less and learn more.
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
        <section className="py-24 relative z-10 overflow-hidden">
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

        {/* Features Grid Section */}
        <section className="py-24 relative z-10" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"
            >
              {[
                {
                  icon: <Layers className="w-8 h-8" />,
                  title: "Structure your learning",
                  description: "Automatically break down long videos into logical chapters, key concepts, and summaries.",
                  delay: 0
                },
                {
                  icon: <Cpu className="w-8 h-8" />,
                  title: "Generated automatically",
                  description: "Our AI agent watches the video for you, extracting every important detail so you don't miss a thing.",
                  delay: 0.1
                },
                {
                  icon: <Globe className="w-8 h-8" />,
                  title: "Always accessible",
                  description: "Access your study materials from any device, anywhere. Your knowledge base is always with you.",
                  delay: 0.2
                },
                {
                  icon: <Code2 className="w-8 h-8" />,
                  title: "Linked back to source",
                  description: "Every note and flashcard is timestamp-linked to the original video. Never lose context.",
                  delay: 0.3
                }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  className="feature-card p-8 rounded-3xl relative overflow-hidden group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: feature.delay }}
                >
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">{feature.title}</h3>
                  <p className="text-secondary text-lg leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Hover effect glow */}
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-[50px] group-hover:bg-accent/30 transition-colors duration-500"></div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
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
                   <motion.div 
                    className="absolute top-[20%] right-[10%] bg-background/80 backdrop-blur border border-accent/20 p-4 rounded-xl shadow-xl max-w-[200px]"
                    animate={{ y: [-10, 10, -10] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-mono text-secondary">Knowledge Synthesized</span>
                    </div>
                    <div className="h-1.5 w-full bg-accent/20 rounded-full overflow-hidden">
                      <div className="h-full bg-accent w-full"></div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="absolute bottom-[20%] left-[10%] bg-background/80 backdrop-blur border border-accent/20 p-4 rounded-xl shadow-xl"
                    animate={{ y: [10, -10, 10] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                         <span className="text-xs font-bold text-accent">A</span>
                       </div>
                       <div className="space-y-1">
                         <div className="h-2 w-20 bg-secondary/20 rounded"></div>
                         <div className="h-2 w-12 bg-secondary/20 rounded"></div>
                       </div>
                    </div>
                  </motion.div>
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