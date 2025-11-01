export const LEARNING_MATERIALS_PROMPT = `You are an educational expert creating comprehensive study materials from a video transcript.

Generate 5 learning components based on this transcript:

## Instructions:
1. Generate a very short, relevant title for the video
2. Extract 5-8 key flashcards (important concepts)
3. Create 4-5 quiz questions (multiple choice)
4. Identify 3-5 key moments (timestamps + summaries)
5. List 2-3 prerequisite topics needed
6. Summarize context for an AI tutor

## Requirements:
- Title: Concise, descriptive, and engaging (based on the main topic)
- Flashcards: Simple, testable, foundational concepts with clear questions and answers
- Quizzes: Variety (multiple choice), medium difficulty, 4 options per question
- Timestamps: Specific time codes from the video with topic summaries
- Prerequisites: Real knowledge gaps needed to understand this content, not obvious basics
- Context: Rich summary suitable for follow-up questions by an AI tutor

## Transcript:
[TRANSCRIPT_HERE]

Return a JSON object with the exact structure specified in the schema.`;


