'use client';


import Button from '@/components/Button';
import Card from '@/components/Card';
import SectionTitle from '@/components/SectionTitle';
import { CHATBOT_NAME } from '@/lib/config';

export default function Home() {

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden opacity-100 transition-opacity duration-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Don't Just Watch. <span className="text-accent">Understand.</span>
            </h1>
            <p className="text-xl md:text-2xl text-secondary mb-8 leading-relaxed max-w-3xl mx-auto">
              Clarity AI turns any YouTube video into an interactive learning experience. Get AI-generated notes, quizzes, and mind maps to help you master complex topics faster.
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
        </div>

        {/* Decorative gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl -z-10 opacity-30">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-accent rounded-full filter blur-3xl"></div>
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent/50 rounded-full filter blur-3xl"></div>
        </div>
      </section>

       {/* About Section */}
       <section id="about" className="py-20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <SectionTitle
             subtitle="We&apos;re on a mission to make learning more accessible and effective through the power of AI."
           >
             About
           </SectionTitle>

           <div className="max-w-6xl mx-auto">
             {/* Mission Statement */}
             <div className="text-center mb-16">
               <p className="text-xl md:text-2xl text-secondary leading-relaxed max-w-3xl mx-auto">
               </p>
             </div>

             {/* Our Story */}
             <div className="max-w-4xl mx-auto mb-16">
               <div className="bg-card-bg/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-accent/10">
                 <div className="flex items-center justify-center space-x-3 mb-8">
                   <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                     </svg>
                   </div>
                   <h3 className="text-3xl md:text-4xl font-bold text-foreground">Our Story</h3>
                 </div>

                 <div className="space-y-6 text-secondary leading-relaxed text-center">
                   <p className="text-lg md:text-xl">
                     Clarity AI was born from a simple observation: YouTube contains an incredible wealth of educational content, but it&apos;s often difficult to extract structured learning materials from long-form videos.
                   </p>
                   <p className="text-lg md:text-xl">
                     Our founders, a team of educators and AI researchers, saw an opportunity to bridge this gap. By combining advanced natural language processing with educational best practices, we created a platform that transforms passive video watching into active, engaging learning experiences.
                   </p>
                 </div>
               </div>
             </div>

             {/* Closing Statement */}
             <div className="text-center mb-16">
               <p className="text-lg md:text-xl text-secondary leading-relaxed max-w-4xl mx-auto">
                 Today, thousands of learners use Clarity AI to master complex topics, from programming tutorials to academic lectures, making education more accessible and effective for everyone.
               </p>
             </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-accent mb-2">50,000+</div>
                  <p className="text-secondary font-medium">Learners Empowered</p>
                  <p className="text-sm text-secondary/70 mt-2">Join a growing community of students and professionals.</p>
                </Card>

                 <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-accent mb-2">1M+</div>
                  <p className="text-secondary font-medium">AI Generations</p>
                  <p className="text-sm text-secondary/70 mt-2">Millions of notes, quizzes, and mind maps created.</p>
                </Card>

                 <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-accent mb-2">4.9/5</div>
                  <p className="text-secondary font-medium">User Rating</p>
                  <p className="text-sm text-secondary/70 mt-2">From thousands of happy learners worldwide.</p>
                </Card>

                 <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-accent mb-2">95%</div>
                  <p className="text-secondary font-medium">Better Understanding</p>
                  <p className="text-sm text-secondary/70 mt-2">Reported by users after just one session.</p>
                </Card>
              </div>
           </div>
         </div>
       </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card-bg/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="Everything you need to master educational content"
          >
            Powerful Learning Tools
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
                        <p className="text-secondary leading-relaxed mb-3">Lock in knowledge with AI-powered flashcards that use proven spaced repetition and active recall techniques. Learn smarter, not harder.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">300% better retention</span>
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
                        <p className="text-secondary leading-relaxed mb-3">Go beyond multiple choice. Our adaptive quizzes challenge you, provide instant feedback, and help you pinpoint exactly what you need to review.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">Personalized learning paths</span>
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
                        <p className="text-secondary leading-relaxed mb-3">Never lose your place. Your notes are automatically synced to the video, with AI-summarized sections and clickable timestamps.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">Instant navigation</span>
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
                                                 <h3 className="text-xl font-semibold text-accent mb-2">Progress Tracking</h3>
                        <p className="text-secondary leading-relaxed mb-3">See how far you've come. Track your progress, celebrate milestones, and get personalized recommendations on what to focus on next.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-accent">Data-driven insights</span>
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
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="From YouTube video to mastery in 3 simple steps"
          >
            How It Works
          </SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Paste YouTube URL</h3>
              <p className="text-secondary">Copy any educational video link and paste it into Clarity AI.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI Generates Materials</h3>
              <p className="text-secondary">Our AI instantly creates flashcards, quizzes, and timestamped notes.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Practice & Master</h3>
              <p className="text-secondary">Study with interactive materials and track your progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-card-bg/30">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <SectionTitle
             subtitle="Choose the plan that fits your learning needs"
           >
             Simple, Transparent Pricing
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
                 Start Pro Trial
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


               <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
               Ready to Deliver{' '}
                 <span className="text-accent">Clarity</span> at Scale?{' '}
               </h2>

               <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
                 Join thousands of students who are mastering content faster with AI-powered study materials.
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