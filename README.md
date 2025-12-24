 <p align="center">
   <img src="public/ai.svg" alt="Clarity AI Logo" width="120">
   <h1>Clarity AI</h1>
   <p>
     <strong>Transform YouTube videos into interactive, personalized learning experiences.</strong>
   </p>
   <p>
     <a href="#features">Features</a> •
     <a href="#tech-stack">Tech Stack</a> •
     <a href="#getting-started">Getting Started</a> •
     <a href="#contributing">Contributing</a> •
     <a href="#license">License</a>
   </p>
 </p>

---

Clarity AI is an AI-powered educational platform that turns passive YouTube video watching into active, engaging learning. Built for undergraduate and graduate students, our platform automatically generates a suite of personalized study materials from any educational video, helping you understand and retain knowledge more effectively.

## 🚀 Live Demo

**See Clarity AI in action: [clarityml.vercel.app](https://clarityml.vercel.app/)**

## ✨ Features

Clarity AI is packed with features designed to enhance your learning, all generated automatically from a single YouTube link:

- **🧠 AI-Generated Learning Materials**:
    - **Flashcards**: Reinforce key concepts with AI-generated and user-created flashcards.
    - **Quizzes**: Test your knowledge with multiple-choice questions and track your performance.
    - **Notes**: A rich text editor to capture your thoughts and insights, synced with the video timeline.
    - **Mind Maps**: Visualize the relationships between concepts with automatically generated mind maps.

- **🎬 Interactive Video Experience**:
    - **Interactive Transcripts**: A full, searchable transcript with clickable timestamps to instantly navigate the video.
    - **Clara, the AI Chatbot**: Ask questions about the video content and get structured, educational answers without leaving the player.
    - **Prerequisite Checker**: Identifies concepts you should know before watching and provides resources to get you up to speed.
    - **Real-World Problem-Solving Workspace**: Apply concepts from videos to solve practical problems with AI guidance, hints, and solution tracking.

- **📊 Personalized Learning Dashboard**:
    - **Activity Tracking**: Visualize your study habits with a GitHub-style activity heatmap and weekly charts.
    - **Progress Overview**: See your performance on quizzes and flashcards at a glance.
    - **Learning Insights**: Actionable analytics to optimize your study habits:
        - **Focus Hours**: Discover your peak productivity times with timezone-aware hourly breakdown
        - **Activity Funnel**: Identify engagement gaps across chatbot, flashcards, quizzes, and video generation
        - **Top Videos**: Track your most engaged videos with interaction metrics
        - **Flashcard Mix**: Visualize the difficulty distribution of your flashcard deck
        - **Weekly Rhythm**: Analyze consistency patterns across days of the week
    - **Video Gallery**: A central library for all your processed videos, with powerful search and filtering capabilities.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) with [TypeScript](https://www.typescriptlang.org/) and [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **AI/LLM**: [Groq API](https://groq.com/) (gpt-4o-120b model)
- **Transcript Extraction**: youtube-transcript-plus v1.1.1 with Webshare residential proxies
- **Authentication**: JWT-based with HTTP-only cookies
- **Proxy Service**: Webshare residential proxies (bypasses YouTube IP blocking in production)
- **Deployment**: Vercel

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or cloud-based)
- Groq API Key
- Apify API Token (optional, for enhanced transcript fetching)

### Installation Guide

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/clarity-ai.git
    cd clarity-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the following:
    ```env
    MONGODB_URI=your_mongodb_connection_string
    GROQ_API_KEY=your_groq_api_key
    CONTENT_GENERATION_MODEL=gemini-3-pro-preview  # Model for video material generation
CHATBOT_MODEL=openai/gpt-oss-120b  # Model for chatbots (Groq)

# See lib/cost/config.ts for available models and pricing
    JWT_SECRET=your_jwt_secret_key
    APIFY_API_TOKEN=your_apify_token_for_transcripts # Optional
    JWT_EXPIRE_DAYS=1
    JWT_REMEMBER_DAYS=30
    ```

    **Model Configuration:**

    - `CONTENT_GENERATION_MODEL`: Model used for generating learning materials (e.g., `gemini-3-pro-preview`)

    - `CHATBOT_MODEL`: Model used for interactive chatbots (e.g., `openai/gpt-oss-120b`)

    - These variables must match keys in the pricing dictionary (`lib/cost/config.ts`)

    
    - To add a new model, update the `costs_per_model` dictionary in `lib/cost/config.ts`
    - See `docs/cost-tracking.md` for detailed cost tracking documentation

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## 📜 Available Scripts

In the project directory, you can run the following commands:

- **`npm run dev`**: Runs the app in development mode.
- **`npm run build`**: Builds the app for production.
- **`npm run start`**: Starts the production server.
- **`npm run lint`**: Lints the code using ESLint.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

We will be introducing a `CONTRIBUTING.md` file with more detailed guidelines soon.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.


## 💖 Code of Conduct

To ensure a welcoming and inclusive community, we expect all contributors to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.
