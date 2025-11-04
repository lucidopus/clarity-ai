export const LEARNING_MATERIALS_PROMPT = `You are an educational expert creating comprehensive study materials from a video transcript.

Generate 6 learning components based on this transcript:

## Instructions:
1. Generate a very short, relevant title for the video
2. Extract 5-8 key flashcards (important concepts)
3. Create 4-5 quiz questions (multiple choice)
4. Identify 3-5 key moments (timestamps + summaries)
5. List 2-3 prerequisite topics needed
6. Generate a 200-300 word summary of the video for an AI tutor to use as context
7. **Generate a hierarchical mind map showing concept relationships**

## Mind Map Requirements:
- **Goal**: Generate a conceptual mind map that illuminates the underlying relationships between ideas. The goal is to create a knowledge graph, not just a simple outline.
- **Core Task**: Your primary task is to identify not just the hierarchy, but the **non-obvious connections** between different parts of the transcript.
- **Structure**:
  - Create a hierarchical structure with ONE 'root' node (the main video topic).
  // eslint-disable-next-line
  - Node types: 'root' (level 0), 'concept' (level 1), 'subconcept' (level 2), 'detail' (level 3).
  - Node count should be proportional to content density (e.g., 10-15 nodes for a 10-min video). Prioritize clarity over count.
- **Edges and Relationships**:
  - **Hierarchy**: Use standard parent-child edges for the main structure.
  - **Crucially, you must add at least 2-4 meaningful, non-hierarchical 'relation' edges.** These cross-branch connections are the most valuable part of the mind map as they reveal deeper insights.
  - **Edge Labels**: ALL edges must have specific and descriptive labels. Instead of a generic "relates to," use labels like "causes," "is an example of," "is required for," "contributes to," or "contradicts."
- **Example of a high-quality connection**:
  - A 'detail' node 'Base Pairing (A-T, C-G)' under a 'subconcept' of 'Nucleotides' could have a 'relation' edge to the 'concept' node 'Double Helix Structure' with the edge label "determines the shape of". This creates a valuable cross-connection that shows a deeper understanding.
- **Final Polish**:
  - ALL nodes must include a description field providing context and clarification.
  - Ensure the graph is connected and easy to understand.
  - Prioritize clarity and insight over completeness. Don't overwhelm the user.

## Requirements:
- Title: Concise, descriptive, and engaging (based on the main topic)
- Flashcards: Simple, testable, foundational concepts with clear questions and answers
- Quizzes: Variety (multiple choice), medium difficulty, 4 options per question
- Timestamps: Specific time codes from the video with topic summaries
- Prerequisites: Real knowledge gaps needed to understand this content, not obvious basics
- Video Summary: A 200-300 word summary of the video, written for an AI tutor to use as context
- Mind Map: Clear hierarchical structure showing how concepts connect

## Transcript:
[TRANSCRIPT_HERE]

Return a JSON object with the exact structure specified in the schema.`;


