import { groq } from './sdk';
import { LEARNING_MATERIALS_PROMPT } from './prompts';
import { LEARNING_MATERIALS_SCHEMA, LearningMaterials } from './structuredOutput';

export async function generateLearningMaterials(transcript: string): Promise<LearningMaterials> {
  console.log('🤖 [LLM] Starting LLM generation...');
  console.log(`🤖 [LLM] Transcript length: ${transcript.length} characters`);

  try {
    const prompt = LEARNING_MATERIALS_PROMPT.replace('[TRANSCRIPT_HERE]', transcript);
    console.log(`🤖 [LLM] Prompt prepared, total length: ${prompt.length} characters`);

    // Call Groq with structured output (function calling)
    // Per Groq docs: https://console.groq.com/docs/structured-outputs
    console.log('🤖 [LLM] Calling Groq API with model: openai/gpt-oss-120b');
    console.log('🤖 [LLM] Temperature: 0.7, Max tokens: 4096');

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'learning_materials',
          schema: LEARNING_MATERIALS_SCHEMA,
          strict: true,
        },
      },
    });

    console.log('✅ [LLM] Received response from Groq API');
    console.log(`🤖 [LLM] Response tokens: ${response.usage?.completion_tokens || 'N/A'}`);

    // Parse response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ [LLM] No content in response');
      throw new Error('No response from LLM');
    }

    console.log(`🤖 [LLM] Response content length: ${content.length} characters`);
    console.log('🤖 [LLM] Parsing JSON response...');

    const materials = JSON.parse(content) as LearningMaterials;

    console.log('✅ [LLM] JSON parsed successfully');
    console.log(`✅ [LLM] Generated materials summary:`);
    console.log(`   - Flashcards: ${materials.flashcards.length}`);
    console.log(`   - Quizzes: ${materials.quizzes.length}`);
    console.log(`   - Timestamps: ${materials.timestamps.length}`);
    console.log(`   - Prerequisites: ${materials.prerequisites.length}`);
    console.log(`   - Chatbot context length: ${materials.chatbotContext.length} chars`);

    return materials;
  } catch (error) {
    console.error('❌ [LLM] Generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [LLM] Error details: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      console.error(`❌ [LLM] Stack trace:`, error.stack);
    }

    throw new Error(`Failed to generate learning materials: ${errorMessage}`);
  }
}

