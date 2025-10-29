# Clarity AI

An AI-powered educational platform that transforms passive YouTube video watching into active, engaging learning experiences. Clarity AI automatically generates personalized study materials from any educational video, helping students at the undergraduate and graduate level truly understand and retain what they learn.

## What It Does

Clarity AI addresses a critical problem in online learning: passive video consumption leads to poor retention. The platform automatically generates evidence-based study materials from YouTube videos, including:

- **Flash Cards**: AI-generated and user-created question-answer pairs for active recall practice
- **Quizzes**: Multiple-choice, true/false, and fill-in-blank questions with immediate feedback
- **Interactive Transcripts**: Clickable timestamps to jump to any moment in the video
- **Pre-requisite Checker**: Identify required background knowledge with readiness quizzes
- **Q&A Chatbot**: Context-aware AI tutor for personalized explanations (future feature)

## The Core Problem

Educational videos are everywhere, but watching them passively leads to poor retention. Students face:
- Passive consumption that doesn't create lasting knowledge
- Manual creation of study materials is time-consuming
- Lost content with no easy way to revisit or review
- No personalized or adaptive learning path
- Scattered progress across multiple videos

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Database**: MongoDB
- **LLM Provider**: Gemini API or Groq
- **Transcript API**: Public YouTube Transcript API

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or cloud)
- API keys for LLM provider (Gemini or Groq)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clarity-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```bash
MONGODB_URI=your_mongodb_connection_string
LLM_API_KEY=your_llm_api_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

The application is organized into three main tabs:

- **Home Tab**: Quick analytics, learning progress overview, and recent activity
- **Generate Tab**: Input YouTube URL to generate study materials
- **Gallery Tab**: Visual collection of all processed videos with search and filter

## Features by Stage

### Stage 1: MVP Foundation (Current)
- Authentication system
- Dashboard skeleton (Home, Generate, Gallery tabs)
- Video processing pipeline
- Basic material display

### Stage 2: Core Features
- Interactive flashcards (AI-generated and user-created)
- Quiz system with feedback
- Interactive transcript with timestamps
- Pre-requisite checker with readiness quiz

### Stage 3: Polish & Optimization
- Improved UI/UX
- Better analytics
- Search and filter in gallery
- Performance optimization

### Stage 4: Advanced Features
- Q&A Chatbot with RAG implementation
- Spaced repetition algorithm
- Social features and sharing

## Educational Foundation

This project is grounded in learning science research:
- Active recall strengthens memory through retrieval practice
- Quizzes invoke the "testing effect" for long-term retention
- Spaced repetition optimizes review timing
- Interactive materials boost engagement and motivation

## Documentation

For detailed project planning and architecture decisions, see:
- [Project Plan](docs/PROJECT_PLAN.md) - Complete vision and technical specifications

## Contributing

This is an educational project built with best practices in mind. Contributions are welcome!

## Learn More About Next.js

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## License

[Add your license here]
