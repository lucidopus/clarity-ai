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
    - **Quizzes**: Test your knowledge with multiple-choice questions and track performance.
    - **Notes**: A rich text editor to capture your thoughts and insights, synced with the video.
    - **Mind Maps**: Visual concept relationships showing how ideas connect and interrelate.
- **Interactive Video Experience**:
    - **Interactive Transcripts**: A full, searchable transcript with clickable timestamps to navigate the video.
    - **Clara - AI Tutor**: Ask questions about the video content and get structured, educational answers.
    - **Prerequisite Checker**: Identifies concepts you need to know before watching and provides resources to get you up to speed.
- **Personalized Learning Dashboard**:
    - **Activity Tracking**: Visualize your study habits with an activity heatmap and weekly charts.
    - **Progress Overview**: See your performance on quizzes and flashcards at a glance.
    - **Video Gallery**: A central place for all your processed videos, with search and filtering.

## Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Database**: MongoDB with Mongoose
- **LLM Provider**: Groq API
- **Authentication**: JWT-based custom authentication
- **Transcript API**: YouTube Transcript API (multiple providers for reliability)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or cloud)
- Groq API key for AI-powered features
- Apify API token for enhanced transcript fetching (optional, improves reliability)

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
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret_key
APIFY_API_TOKEN=your_apify_token_for_transcripts
JWT_EXPIRE_DAYS=1
JWT_REMEMBER_DAYS=30
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Status

The project has a solid foundation with most core features implemented.

### Implemented Features:
- **User Authentication**: Secure JWT-based sign-up and sign-in with session management.
- **Video Processing Pipeline**: Enter a YouTube URL and generate a full suite of learning materials using AI.
- **Interactive Learning Materials**: View and interact with AI-generated flashcards, quizzes, notes, and the video transcript.
- **Clara - AI Tutor**: Context-aware Q&A chatbot that answers questions about video content with structured, educational responses.
- **Dashboard & Analytics**: A comprehensive dashboard with activity heatmaps, progress tracking, and video gallery.
- **Search & Filtering**: Easily find videos in your gallery with advanced filtering options.
- **Mind Maps**: Visual concept relationships and knowledge graphs generated from video content.

### Future Roadmap:
- **Spaced Repetition System (SRS)**: Integrate an SRS algorithm for flashcard review to optimize long-term retention.
- **Social Features**: Options to share generated content with others.
- **Enhanced Analytics**: Deeper insights into learning patterns and performance.
- **Mobile App**: Native mobile applications for iOS and Android.

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
