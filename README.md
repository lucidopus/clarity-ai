# Clarity AI

An AI-powered educational platform that transforms passive YouTube video watching into active, engaging learning experiences. Clarity AI automatically generates personalized study materials from any educational video, helping students at the undergraduate and graduate level truly understand and retain what they learn.

## The Core Problem

Educational videos are everywhere, but watching them passively leads to poor retention. Students face:
- Passive consumption that doesn't create lasting knowledge
- Manual creation of study materials is time-consuming
- Lost content with no easy way to revisit or review
- No personalized or adaptive learning path
- Scattered progress across multiple videos

Clarity AI solves this by turning video content into an interactive learning hub.

## Features

Clarity AI is packed with features designed to enhance learning, all generated automatically from a single YouTube link:

- **AI-Generated Study Materials**:
    - **Flashcards**: Reinforce key concepts with AI-generated and user-created flashcards.
    - **Quizzes**: Test your knowledge with multiple-choice, true/false, and fill-in-the-blank questions.
    - **Notes**: A rich text editor to capture your thoughts and insights, synced with the video.
- **Interactive Video Experience**:
    - **Interactive Transcripts**: A full, searchable transcript with clickable timestamps to navigate the video.
    - **Prerequisite Checker**: Identifies concepts you need to know before watching and provides resources to get you up to speed.
- **Personalized Learning Dashboard**:
    - **Activity Tracking**: Visualize your study habits with an activity heatmap and weekly charts.
    - **Progress Overview**: See your performance on quizzes and flashcards at a glance.
    - **Video Gallery**: A central place for all your processed videos, with search and filtering.

## Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Database**: MongoDB
- **LLM Provider**: Groq (gpt-4o-120b model)
- **Transcript Extraction**: youtube-transcript-plus v1.1.1 with Webshare residential proxies
- **Authentication**: JWT-based with HTTP-only cookies
- **Proxy Service**: Webshare residential proxies (bypasses YouTube IP blocking in production)

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

## Project Status

The project has a solid foundation with most core features implemented.

### Implemented Features:
- **User Authentication**: Secure sign-up and sign-in.
- **Video Processing Pipeline**: Enter a YouTube URL and generate a full suite of learning materials.
- **Interactive Learning Materials**: View and interact with AI-generated flashcards, quizzes, notes, and the video transcript.
- **Dashboard & Analytics**: A comprehensive dashboard with activity heatmaps, progress tracking, and video gallery.
- **Search & Filtering**: Easily find videos in your gallery.

### Future Roadmap:
- **Q&A Chatbot**: A context-aware AI tutor (using RAG) for asking questions about the video content.
- **Spaced Repetition System (SRS)**: Integrate an SRS algorithm for flashcard review to optimize long-term retention.
- **Social Features**: Options to share generated content with others.
- **Enhanced Analytics**: Deeper insights into learning patterns and performance.

## Educational Foundation

This project is grounded in learning science research:
- **Active Recall**: Strengthens memory through retrieval practice (flashcards, quizzes).
- **The Testing Effect**: The act of retrieving information improves long-term retention.
- **Elaboration**: Taking notes and connecting ideas enhances understanding.
- **Interactivity**: Engaging with materials boosts motivation and focus.

## Documentation

For detailed project planning and architecture decisions, see the `/docs` directory.

## Contributing

This is an educational project built with best practices in mind. Contributions are welcome!

## Learn More About Next.js

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## License

[Add your license here]
