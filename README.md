<p align="center">
  <img src="public/ai.svg" alt="Clarity AI Logo" width="120">
  <h1>Clarity AI</h1>
  <p>
    <strong>Transform any educational content into interactive, personalized learning experiences.</strong>
  </p>
  <p>
    <a href="#features">Features</a> •
    <a href="#supported-sources">Sources</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#contributing">Contributing</a> •
    <a href="#license">License</a>
  </p>
</p>

---

Clarity AI is an AI-powered educational platform that turns passive content consumption into active, engaging learning. Submit a YouTube video, upload a document or audio file, paste lecture notes, or capture a live lecture in real time — the platform automatically generates a full suite of personalized study materials, helping you understand and retain knowledge more effectively.

## Live Demo

**See Clarity AI in action: [clarityml.vercel.app](https://clarityml.vercel.app/)**

## Supported Sources

Clarity AI's multi-source pipeline supports **6 different content types**:

| Source | Input | Extraction Method |
|--------|-------|-------------------|
| **YouTube** | Video URL | Public transcript API with residential proxy fallback |
| **Document** | PDF, PPTX upload | Page-by-page text extraction (unpdf) |
| **Audio** | MP3, WAV, M4A, FLAC, OGG, WebM | Groq Whisper transcription |
| **Text** | Paste or type | Direct input (lecture notes, study notes) |
| **Live Lecture** | Real-time capture | ElevenLabs Scribe V2 streaming transcription |
| **Media** | Images, whiteboards | Gemini Vision analysis (planned) |

Sources can be **combined** in a single generation request (e.g., a YouTube video + supplemental PDF).

## Features

### AI-Generated Learning Materials

From any source, the platform generates up to **8 learning components** in one pass:

- **Flashcards** — AI-generated cards with difficulty levels + user-created cards (generation effect). Supports mastery tracking.
- **Quizzes** — Multiple-choice questions with explanations, scoring, and attempt history.
- **Mind Maps** — Interactive hierarchical knowledge graphs with concept nodes, cross-branch relationships, and semantic edge labels.
- **Notes** — Rich text editor for per-segment annotation synced with the source timeline.
- **Chapters & Timestamps** — Key sections with clickable navigation (time-based for video/audio, page-based for documents).
- **Prerequisites** — Background knowledge assessment with difficulty levels to identify gaps before diving in.
- **Real-World Case Studies** — Complex, realistic problem scenarios using real companies and technologies, with guided hints and solution tracking.
- **Summary** — Structured markdown overview used as context for the AI chatbot.

### Clara — AI Tutor

Context-aware AI assistant available throughout the platform:

- **During live lectures** — Floating bubble for real-time Q&A without interrupting the session.
- **On generated materials** — Ask questions grounded in the source content with conversation history.
- **Feynman Mode** — Step-by-step guided explanations that break down complex concepts using the Feynman Technique.

### Live Lecture Capture

Real-time educational session recording with a 3-layer storage architecture (React state → IndexedDB → MongoDB):

- **Real-time transcription** via ElevenLabs Scribe V2 (Granola-style — no visible transcript during lecture).
- **Focus notes** and **importance markers** captured inline during the session.
- **Clara Q&A** available during the lecture with optional reference documents for context.
- **Post-lecture processing** — Session transcript is fed through the full generation pipeline to produce all learning materials.

### Interactive Video Experience

- **Interactive Transcripts** — Full searchable transcript with clickable timestamps for instant video navigation.
- **Source-Specific Viewers** — Dedicated renderers for YouTube (embedded player), audio (waveform + transcript), documents (page viewer), text, and live lectures.
- **Multi-Source Tabbed View** — When multiple sources are combined, each gets its own viewer tab.

### Personalized Learning Dashboard

- **Activity Heatmap** — GitHub-style visualization of study habits.
- **Progress Overview** — Quiz scores and flashcard mastery at a glance.
- **Learning Insights**:
  - **Focus Hours** — Peak productivity times with timezone-aware hourly breakdown.
  - **Activity Funnel** — Engagement gaps across chatbot, flashcards, quizzes, and generation.
  - **Top Videos** — Most engaged content with interaction metrics.
  - **Flashcard Mix** — Difficulty distribution of your flashcard deck.
  - **Weekly Rhythm** — Consistency patterns across days of the week.
- **Video Gallery** — Central library for all processed content with search and filtering.

### AI-Powered Discovery & Personalization

Powered by Google Gemini vector embeddings and MongoDB vector search:

- **Personalized Feed** — Recommendations based on semantic similarity to your learning profile.
- **Context-Aware Categories**:
  - **For You** — Top personalized picks
  - **Quick Wins** (<5 min) — Short study sessions
  - **Lunch Break Learning** (15-30 min) — Moderate study breaks
  - **Deep Dives** (45+ min) — Comprehensive learning
  - **Code & Build** — Programming and tech content
  - **Creator's Studio** — Design and creative resources
  - **Entrepreneur Essentials** — Business and startup insights
  - **Visual Learning** — Content with complete mind maps
  - **Interactive Sessions** — Content with quizzes
- **Content Validation** — AI-powered detection of non-educational content with user override.
- **Semantic Search** — Find content by meaning, not just keywords.
- **Smart Refresh** — Recommendations update every 6 hours via background jobs, filtering out already-mastered content.

### User Preferences & Learning Profiles

Comprehensive onboarding that shapes the experience:

- Learning goals, role, and challenges assessment.
- Research-backed personality profile (Big Five traits) for learning style matching.
- Material preference ranking and daily study time configuration.
- Preference embeddings generated for vector-based recommendations.

### Admin Portal

Password-protected dashboard at `/admin` for platform monitoring:

- **Analytics** — User stats, registration timelines, activity heatmaps, engagement breakdowns.
- **Cost Tracking** — Per-model, per-service, per-user API cost analytics with token usage trends and spending heatmaps.
- **User Management** — Search, filter, view detailed profiles, cascade delete users and their data.
- **Security** — Rate-limited login (5 attempts / 15 min), JWT sessions, audit logging.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) with [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with [Framer Motion](https://www.framer.com/motion/) |
| **Database** | [MongoDB](https://www.mongodb.com/) (Atlas) with vector search |
| **Cache** | [Redis](https://redis.io/) (ioredis) for recommendation caching |
| **AI / LLM** | [Groq](https://groq.com/) (Llama 3.3, Qwen 2.5, GPT-OSS) + [Google Gemini 2.0](https://ai.google.dev/) |
| **Embeddings** | Google Gemini (1536-dim vectors) for semantic search & recommendations |
| **Background Jobs** | [Trigger.dev](https://trigger.dev/) for pipeline orchestration & scheduled tasks |
| **File Storage** | [Supabase Storage](https://supabase.com/storage) for document & audio uploads |
| **Audio Transcription** | [ElevenLabs](https://elevenlabs.io/) Scribe V2 (live) + Groq Whisper (async) |
| **Email** | [SendGrid](https://sendgrid.com/) for transactional emails (OTP verification) |
| **Transcript Extraction** | youtube-transcript with Webshare residential proxies |
| **Authentication** | JWT-based with HTTP-only cookies + email OTP verification |
| **Deployment** | [Vercel](https://vercel.com/) |

## Architecture

```
User Input (YouTube URL / PDF / Audio / Text / Live Lecture)
        │
        ▼
┌─────────────────────┐
│  Source Extractors   │  Factory pattern — per-type extraction
│  (lib/extractors/)   │  YouTube, Document, Audio, Text, Live Lecture, Media
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Content Validation  │  Gemini-powered educational content filtering
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Trigger.dev Task    │  Background processing pipeline
│  (async, durable)    │  Retries, concurrent processing
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  LLM Generation      │  Groq + Gemini structured outputs
│  (lib/structuredOutput.ts)  │  Flashcards, quizzes, mind maps, etc.
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  MongoDB Storage     │  Sources, materials, progress, costs
│  + Vector Search     │  Embeddings for discovery & recommendations
└─────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (with vector search index configured)
- Groq API Key
- Google Gemini API Key (embeddings + content generation)
- Redis instance (recommendation caching)
- Trigger.dev account (background job orchestration)
- Supabase project (file storage for document/audio uploads)
- SendGrid API Key (email verification)
- ElevenLabs API Key (live lecture transcription)

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/clarity-ai.git
    cd clarity-ai
    ```

2. **Install dependencies:**
    ```bash
    yarn install
    ```

3. **Set up environment variables:**

    Create a `.env.local` file in the project root:
    ```env
    # Database
    MONGODB_URI=your_mongodb_connection_string

    # AI / LLM
    GROQ_API_KEY=your_groq_api_key
    GEMINI_API_KEY=your_gemini_api_key
    CONTENT_GENERATION_MODEL=gemini-2.0-flash
    CHATBOT_MODEL=llama-3.3-70b-versatile

    # Authentication
    JWT_SECRET=your_jwt_secret_key
    JWT_EXPIRE_DAYS=1
    JWT_REMEMBER_DAYS=30

    # Email (SendGrid)
    SENDGRID_API_KEY=your_sendgrid_api_key

    # File Storage (Supabase)
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

    # Redis (recommendation caching)
    REDIS_URL=your_redis_connection_url

    # Background Jobs (Trigger.dev)
    TRIGGER_SECRET_KEY=your_trigger_secret_key

    # Live Lecture (ElevenLabs)
    ELEVENLABS_API_KEY=your_elevenlabs_api_key

    # Transcript Proxy (production)
    WEBSHARE_PROXY_URL=http://user:pass@p.webshare.io:80

    # Admin Portal
    ADMIN_PASSWORD=your_admin_password
    ```

    **Model Configuration:**
    - `CONTENT_GENERATION_MODEL` and `CHATBOT_MODEL` must match keys in `lib/cost/config.ts`
    - See `docs/cost-tracking.md` for cost tracking documentation

4. **Run the development server:**
    ```bash
    yarn dev
    ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
yarn dev        # Start development server
yarn build      # Build for production
yarn start      # Start production server
yarn lint       # Run ESLint
```

## Contributing

Contributions are very much appreciated! If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Raise a PR

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Code of Conduct

To ensure a welcoming and inclusive community, we expect all contributors to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read before contributing.
