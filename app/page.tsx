'use client';

import { motion } from 'framer-motion';
import { BookOpen, Compass, Zap } from 'lucide-react';
import Button from '@/components/Button';
import Card from '@/components/Card';
import SectionTitle from '@/components/SectionTitle';
import { CHATBOT_NAME } from '@/lib/config';

export default function Home() {

  return (
    <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden opacity-100 transition-opacity duration-700 h-screen flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
               The{' '}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}

                >
                 Smarter
               </motion.span>{' '}
               Way to <span className="text-accent">Learn</span> is Here.
            </h1>
            <p className="text-xl md:text-2xl text-secondary mb-8 leading-relaxed max-w-3xl mx-auto">
              Clarity AI transforms YouTube tutorials into interactive learning materials. Get AI-powered notes, quizzes, and mind maps that cut your learning time in half.
            </p>
            <div className="flex flex-col mb-15 sm:flex-row gap-4 justify-center items-center">
              <Button href="/auth/signup" variant="primary" size="lg">
                Get Started Free
              </Button>
              <Button href="#about" variant="secondary" size="lg">
                Learn More
              </Button>
             </div>
           </div>

           {/* Decorative gradient */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl -z-10 opacity-10">
             <div className="absolute top-20 left-1/4 w-72 h-72 bg-accent rounded-full filter blur-3xl"></div>
             <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent/50 rounded-full filter blur-3xl"></div>
           </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-linear-to-br from-background via-card-bg/20 to-background relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-linear-to-br from-accent/5 via-transparent to-accent/10"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute top-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl opacity-30"></div>
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/15 rounded-full blur-xl opacity-40"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <SectionTitle
              subtitle="Designed for students who learn from video"
            >
              Built for better retention
            </SectionTitle>

            <div className="max-w-6xl mx-auto">
              {/* Story Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  <div className="inline-flex items-center px-4 py-2 bg-accent/10 rounded-full text-accent font-medium text-sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Our Approach
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                    Passive watching doesn&apos;t create lasting knowledge
                  </h3>
                  <p className="text-lg text-secondary leading-relaxed">
                    Educational video content is everywhere, but retention remains low. Watching alone doesn&apos;t translate to learning.
                  </p>
                  <p className="text-lg text-secondary leading-relaxed">
                    Clarity AI bridges this gap with active recall techniques. Transform any video into personalized study materials—automatically generated flashcards, quizzes, and structured notes that drive real comprehension.
                  </p>
                </motion.div>

                <motion.div
                  className="relative"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <Card className="bg-card-bg/50 backdrop-blur-sm rounded-2xl p-8 border border-accent/10 shadow-xl">
                    <div className="space-y-6">
                      <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                        <Compass className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-foreground mb-3">Our Mission</h4>
                        <p className="text-secondary leading-relaxed mb-4">
                          Turn passive video consumption into active learning experiences. We combine AI technology with proven cognitive science to help students master material faster.
                        </p>
                        <p className="text-accent font-medium text-lg">
                          &quot;Watch once. Master completely.&quot;
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Values Section */}
              <motion.div
                className="mb-20"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="text-center mb-12">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Why Clarity AI
                  </h3>
                  <p className="text-lg text-secondary max-w-2xl mx-auto">
                    Purpose-built for educational content with research-backed learning methods
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <Card className="text-center p-8 group transition-all duration-300">
                     <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-6 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-accent">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                       </svg>
                     </div>
                     <h4 className="text-xl font-bold text-foreground mb-3">Education-First AI</h4>
                    <p className="text-secondary leading-relaxed">
                      Trained specifically for educational content. Identifies key concepts, important definitions, and critical relationships—not just generic summarization.
                    </p>
                  </Card>

                  <Card className="text-center p-8 group transition-all duration-300">
                     <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-6 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-accent">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                       </svg>
                     </div>
                     <h4 className="text-xl font-bold text-foreground mb-3">Cognitive Science Foundation</h4>
                    <p className="text-secondary leading-relaxed">
                      Built on proven learning principles: spaced repetition, active recall, and retrieval practice. Evidence-based techniques that improve retention by up to 200%.
                    </p>
                  </Card>

                  <Card className="text-center p-8 group transition-all duration-300">
                     <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-6 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-accent">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                       </svg>
                     </div>
                     <h4 className="text-xl font-bold text-foreground mb-3">Student-Centered Design</h4>
                    <p className="text-secondary leading-relaxed">
                      Every feature addresses real learning challenges. Built with continuous student feedback to ensure tools are practical, effective, and intuitive.
                    </p>
                  </Card>
                </div>
              </motion.div>

              {/* Impact Stats */}
              <motion.div
                className="mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="text-center mb-12">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Key Features
                  </h3>
                  <p className="text-lg text-secondary max-w-2xl mx-auto">
                    Fast, free, and works with any educational video
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Card className="text-center p-6 group transition-all duration-300">
                     <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                       </svg>
                     </div>
                     <div className="text-4xl md:text-5xl font-bold text-accent mb-2">&lt;60s</div>
                     <p className="text-secondary font-semibold mb-1">Processing Time</p>
                    <p className="text-sm text-secondary/70">From video to flashcards in under a minute</p>
                  </Card>

                  <Card className="text-center p-6 group transition-all duration-300">
                     <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                       <Zap className="w-7 h-7 text-accent" />
                     </div>
                     <div className="text-4xl md:text-5xl font-bold text-accent mb-2">100%</div>
                     <p className="text-secondary font-semibold mb-1">Free to Start</p>
                    <p className="text-sm text-secondary/70">No credit card required, ever</p>
                  </Card>

                  <Card className="text-center p-6 group transition-all duration-300">
                     <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                       </svg>
                     </div>
                     <div className="text-4xl md:text-5xl font-bold text-accent mb-2">5</div>
                     <p className="text-secondary font-semibold mb-1">Learning Modes</p>
                    <p className="text-sm text-secondary/70">Flashcards, quizzes, notes, timestamps, & AI chat</p>
                  </Card>

                  <Card className="text-center p-6 group transition-all duration-300">
                     <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                       </svg>
                     </div>
                     <div className="text-4xl md:text-5xl font-bold text-accent mb-2">Any</div>
                     <p className="text-secondary font-semibold mb-1">YouTube Video</p>
                    <p className="text-sm text-secondary/70">Works with lectures, tutorials, courses—anything educational</p>
                  </Card>
                </div>
              </motion.div>


            </div>
          </div>
        </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card-bg/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-linear-to-br from-accent/5 via-transparent to-accent/10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl opacity-30"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/15 rounded-full blur-xl opacity-40"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionTitle
            subtitle="AI-generated study materials from video content"
          >
            Complete Learning Suite
          </SectionTitle>

          {/* Interactive Learning Ecosystem */}
          <div className="relative max-w-6xl mx-auto">
             {/* Connected Feature Nodes */}
             <div className="relative">

              {/* Feature Nodes */}
              <div className="grid grid-cols-2 gap-8 relative z-10">
                {/* Smart Flashcards */}
                <div className="group">
                   <div className="bg-background rounded-2xl p-6 border border-accent/60 shadow-lg shadow-black/10 dark:shadow-black/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent/0 via-accent/50 to-accent/0"></div>
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0">
                         <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                                                 <h3 className="text-xl font-semibold text-accent mb-2">Smart Flashcards</h3>
                         <p className="text-secondary leading-relaxed mb-3">Automatically generated from key concepts. Integrated spaced repetition algorithm optimizes review timing for long-term retention.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">Spaced repetition built-in</span>
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Quizzes */}
                <div className="group">
                   <div className="bg-background rounded-2xl p-6 border border-accent/60 shadow-lg shadow-black/10 dark:shadow-black/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent/0 via-accent/50 to-accent/0"></div>
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0">
                         <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                                                 <h3 className="text-xl font-semibold text-accent mb-2">Interactive Quizzes</h3>
                        <p className="text-secondary leading-relaxed mb-3">Multiple-choice, true/false, and fill-in-the-blank questions with instant feedback. Identifies knowledge gaps and tracks progress over time.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">Instant feedback & tracking</span>
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamped Notes */}
                <div className="group">
                   <div className="bg-background rounded-2xl p-6 border border-accent/60 shadow-lg shadow-black/10 dark:shadow-black/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent/0 via-accent/50 to-accent/0"></div>
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0">
                         <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                                                 <h3 className="text-xl font-semibold text-accent mb-2">Timestamped Notes</h3>
                                                 <p className="text-secondary leading-relaxed mb-3">Structured notes with direct video links. Click any timestamp to jump to that exact moment. Searchable and exportable.</p>                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">One-click navigation</span>
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Tracking */}
                <div className="group">
                   <div className="bg-background rounded-2xl p-6 border border-accent/60 shadow-lg shadow-black/10 dark:shadow-black/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent/0 via-accent/50 to-accent/0"></div>
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0">
                         <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                                                 <h3 className="text-xl font-semibold text-accent mb-2">AI Tutor Chat</h3>
                                                 <p className="text-secondary leading-relaxed mb-3">Context-aware Q&A based on video content. Ask questions, get explanations, and clarify concepts without rewatching. Available 24/7.</p>                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">Context-aware assistance</span>
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-linear-to-br from-accent/5 via-transparent to-accent/10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl opacity-30"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/15 rounded-full blur-xl opacity-40"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionTitle
            subtitle="Simple 3-step process"
          >
            How It Works
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Paste URL</h3>
              <p className="text-secondary">Submit any YouTube educational video link.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI Processing</h3>
              <p className="text-secondary">Materials generated in under 60 seconds.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Study & Master</h3>
              <p className="text-secondary">Learn with interactive flashcards, quizzes, and notes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-card-bg/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-linear-to-br from-accent/5 via-transparent to-accent/10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl opacity-30"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/15 rounded-full blur-xl opacity-40"></div>

         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
           <SectionTitle
             subtitle="Start free. Upgrade when you&apos;re ready."
           >
             Pricing That Makes Sense
           </SectionTitle>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center">
               <div className="mb-6">
                 <h3 className="text-2xl font-bold text-foreground mb-2">Free</h3>
                 <div className="text-4xl font-bold text-accent mb-2">$0</div>
                 <p className="text-secondary">Perfect for getting started</p>
               </div>
               <ul className="text-left space-y-3 mb-6">
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>5 videos per month</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Basic flashcards & quizzes</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Progress tracking</span>
                 </li>
               </ul>
               <Button variant="secondary" size="lg" className="w-full">
                 Get Started Free
               </Button>
             </Card>

              <Card className="text-center border-accent border-2 relative">
               <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                 <span className="bg-accent text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
               </div>
               <div className="mb-6">
                 <h3 className="text-2xl font-bold text-foreground mb-2">Pro</h3>
                 <div className="text-4xl font-bold text-accent mb-2">$9.99<span className="text-lg text-secondary">/month</span></div>
                 <p className="text-secondary">For serious learners</p>
               </div>
               <ul className="text-left space-y-3 mb-6">
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span className="text-secondary"><strong className="text-foreground">Everything in Free</strong> +</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Unlimited videos (no monthly limit)</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Ask {CHATBOT_NAME} - AI-powered Q&A tutor (get instant answers 24/7)</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Custom flashcard creation with generation effect</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Priority support & export capabilities</span>
                 </li>
               </ul>
               <Button variant="primary" size="lg" className="w-full">
                 Get Pro Plan
               </Button>
             </Card>

             <Card className="text-center">
               <div className="mb-6">
                 <h3 className="text-2xl font-bold text-foreground mb-2">Enterprise</h3>
                 <div className="text-4xl font-bold text-accent mb-2">Custom</div>
                 <p className="text-secondary">For organizations</p>
               </div>
               <ul className="text-left space-y-3 mb-6">
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span className="text-secondary"><strong className="text-foreground">Everything in Pro</strong> +</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Unlimited team members & seats</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>SSO & advanced admin controls</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Custom integrations & API access</span>
                 </li>
                 <li className="flex items-center">
                   <svg className="w-5 h-5 text-accent mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Dedicated account manager & 24/7 support</span>
                 </li>
               </ul>
               <Button variant="secondary" size="lg" className="w-full">
                 Contact Sales
               </Button>
             </Card>
           </div>
         </div>
       </section>

       {/* CTA Section */}
       <section className="py-20 relative overflow-hidden">
         {/* Background Elements */}
         <div className="absolute inset-0 bg-linear-to-br from-accent/5 via-transparent to-accent/10"></div>
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
         <div className="absolute top-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl opacity-30"></div>
         <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/15 rounded-full blur-xl opacity-40"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto">
             {/* Main CTA Card */}
             <div className="bg-background/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 text-center border border-accent/20 shadow-2xl relative overflow-hidden">
               {/* Decorative gradient bar */}
               <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-accent/0 via-accent to-accent/0"></div>


               <h2 className="text-5xl font-bold text-foreground mb-6 leading-tight">What if learning just had...{' '}<span className="text-accent">More Clarity?</span></h2>

               <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
                 Transform your learning experience today. Join thousands of students mastering subjects faster with Clarity AI.
               </p>

               {/* CTA Buttons */}
               <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                 <Button href="/auth/signup" variant="primary" size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                   Get Started Free
                 </Button>
                 <Button href="#features" variant="secondary" size="lg">
                   Explore Features
                 </Button>
               </div>

               <p className="text-sm text-secondary/80">No credit card required • Get started for free</p>

               {/* Trust indicators removed for now */}
             </div>
           </div>
         </div>
       </section>
    </main>
  );
}