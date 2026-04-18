import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';
import { MIND_MAP_EXAMPLE } from './shared/few-shot';

/**
 * Mind-map generation prompt — outputs a typed concept graph that Clara can
 * actually reason over (not just a pretty diagram).
 *
 * Edge taxonomy was deliberately cut from the historical 8 types down to 5
 * (`hierarchy`, `causes`, `requires`, `contradicts`, `analogous-to`) to keep
 * the model's tagging reliable. The hard floor on non-hierarchy edges is
 * what keeps the output from collapsing back into a tree.
 *
 * The constraint is expressed as an integer count rather than a percentage —
 * LLMs can count "at least 4" of something they're emitting, but cannot
 * reliably check that 30% of their own output meets a condition.
 */

const STATIC_INSTRUCTIONS = `# Mind-Map Generation

Build a hierarchical concept graph that **reveals how the ideas in this source relate** — not just a tree of headings. The graph should be inspectable: a learner pointing at any edge should immediately understand why those two concepts are connected.

${SOURCE_FIDELITY_PREAMBLE}

## Node rules

- Exactly one \`root\` node (\`level\`: 0) — the central topic of the source.
- 1–6 \`concept\` nodes (\`level\`: 1) — the primary subdivisions.
- \`subconcept\` (\`level\`: 2) and \`detail\` (\`level\`: 3) nodes flesh out concepts where needed.
- Aim for **10–18 total nodes** for moderate-density sources. Prefer fewer, well-described nodes over many shallow ones.
- Every node has a \`description\` field (1–2 sentences) explaining the idea in plain language.

## Edge taxonomy (use these 5 types only)

- **\`hierarchy\`** — parent-child structural ("X consists of Y", "X is a kind of Y"). Use to encode the tree skeleton.
- **\`causes\`** — A produces or leads to B ("supply meeting demand → equilibrium price").
- **\`requires\`** — B cannot exist or function without A ("oxidative phosphorylation requires a proton gradient").
- **\`contradicts\`** — A and B are in tension; understanding one constrains the other ("price ceiling contradicts free-market pricing").
- **\`analogous-to\`** — A and B share structure across domains, useful for analogical reasoning ("the synapse is analogous-to a logic gate").

## Edge-quality rules

1. **Edge labels read as sentences.** Every label is a short verb phrase such that "source → label → target" is a grammatical sentence ("DNA → composed of → Nucleotides", not "DNA → relation → Nucleotides").
2. **At least 4 non-hierarchy edges.** A graph that's only \`hierarchy\` edges is a tree pretending to be a graph — useless for reasoning. Count them as you go: at least 4 of your edges must be \`causes\`, \`requires\`, \`contradicts\`, or \`analogous-to\`. (Hard count, not a percentage — models can't reliably grade their own ratios.)
3. **Cross-branch edges are valuable.** Look for non-obvious connections between concept subtrees and surface them with \`causes\` / \`contradicts\` / \`analogous-to\`.
4. **Don't over-edge.** Aim for roughly 1.2× to 1.8× as many edges as nodes. Adding edges with vague labels just to hit a count makes the graph noisier, not better.

${MIND_MAP_EXAMPLE}

`;

export function buildMindMapPrompt(options: {
  content: string;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, learnerContext, sourceDescription } = options;
  const learner = buildLearnerContextSection(learnerContext, 'mindmap');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  return `${STATIC_INSTRUCTIONS}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

Return a JSON object matching the mindMap schema. Use only the 5 edge types listed, and include at least 4 non-hierarchy edges.`;
}
