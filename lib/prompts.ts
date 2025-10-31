export const LEARNING_MATERIALS_PROMPT = `You are an educational expert creating comprehensive study materials from a video transcript.

Generate 4 learning components based on this transcript:

## Instructions:
1. Extract 5-8 key flashcards (important concepts)
2. Create 4-5 quiz questions (multiple choice)
3. Identify 3-5 key moments (timestamps + summaries)
4. List 2-3 prerequisite topics needed
5. Summarize context for an AI tutor

## Requirements:
- Flashcards: Simple, testable, foundational concepts with clear questions and answers
- Quizzes: Variety (multiple choice), medium difficulty, 4 options per question
- Timestamps: Specific time codes from the video with topic summaries
- Prerequisites: Real knowledge gaps needed to understand this content, not obvious basics
- Context: Rich summary suitable for follow-up questions by an AI tutor

## Transcript:
[TRANSCRIPT_HERE]

Return a JSON object with the exact structure specified in the schema.`;


