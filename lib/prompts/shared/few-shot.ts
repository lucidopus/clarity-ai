/**
 * Gold-standard few-shot examples per artifact.
 *
 * Each example is drawn from a different domain (CS / biology / economics)
 * to keep the model from anchoring on one field. The examples illustrate
 * the *shape* and *quality bar* — they're never echoed back verbatim because
 * the source content is different every time.
 *
 * These examples are interpolated into the per-artifact prompts. Keep them
 * tight — verbose few-shots are tokens spent that rarely improve the next
 * generation more than a clear rule does.
 */

export const FLASHCARD_EXAMPLES = `### Gold-standard flashcards (one per cardType)

\`\`\`json
{
  "cardType": "definition",
  "bloomLevel": "recall",
  "difficulty": "easy",
  "question": "What is the role of mitochondria in a eukaryotic cell?",
  "answer": "They generate the cell's usable chemical energy (ATP) through cellular respiration."
}

{
  "cardType": "mechanism",
  "bloomLevel": "understand",
  "difficulty": "medium",
  "question": "How does the proton gradient across the inner mitochondrial membrane produce ATP?",
  "answer": "The gradient drives protons back into the matrix through ATP synthase, and the rotational motion of ATP synthase phosphorylates ADP into ATP."
}

{
  "cardType": "discrimination",
  "bloomLevel": "understand",
  "difficulty": "medium",
  "question": "What distinguishes mitochondrial DNA from nuclear DNA?",
  "answer": "Mitochondrial DNA is small, circular, inherited maternally, and present in many copies per cell; nuclear DNA is large, linear, inherited from both parents, and present in two copies per cell."
}

{
  "cardType": "application",
  "bloomLevel": "apply",
  "difficulty": "hard",
  "question": "A cell that suddenly loses its mitochondrial function continues to produce ATP for a short time. By which pathway, and why is it limited?",
  "answer": "Glycolysis in the cytoplasm — it produces 2 ATP per glucose without requiring oxygen or mitochondria, but yields far less ATP than oxidative phosphorylation, so the cell rapidly runs into an energy deficit."
}

{
  "cardType": "cloze",
  "bloomLevel": "recall",
  "difficulty": "easy",
  "question": "The energy currency of the cell, produced primarily in mitochondria, is {{c1::ATP}}.",
  "answer": "The energy currency of the cell, produced primarily in mitochondria, is ATP."
}
\`\`\`

Notice: each card is **atomic** (one fact), the answer fits in one or two sentences, and no two cards trivially restate each other.`;

export const QUIZ_EXAMPLE = `### Gold-standard quiz item with misconception-tagged distractors

\`\`\`json
{
  "questionText": "A team migrates a service from a monolithic database to per-service databases. Service A's response time at p95 stays the same, but p99 doubles. What is the most likely cause?",
  "richOptions": [
    {
      "text": "A network round-trip is now required for queries that previously hit the same database, and tail latency is more sensitive to that overhead than median latency.",
      "isCorrect": true
    },
    {
      "text": "The new database has slower queries because it lacks indexes, slowing every request equally.",
      "isCorrect": false,
      "misconception": "Conflates a constant-factor regression (which would lift p50 too) with a tail-latency regression."
    },
    {
      "text": "The connection pool is undersized, blocking all incoming requests.",
      "isCorrect": false,
      "misconception": "A pool starvation issue would also raise p50, not just p99 — confuses saturation with tail amplification."
    },
    {
      "text": "Per-service databases are inherently slower than monoliths.",
      "isCorrect": false,
      "misconception": "Treats an architectural trade-off as a universal performance claim."
    }
  ],
  "explanation": "The right answer pinpoints why p99 (but not p50) moved: each cross-service query adds a small, mostly-constant network cost, and p99 amplifies that cost when one slow request stacks on top of a pool wait. The 'missing indexes' answer is tempting because it sounds like a real DB issue, but indexes would slow every request, lifting p50 too. The 'connection pool' option is plausible to anyone who has hit pool exhaustion, but again that affects all percentiles. The 'inherently slower' option is the kind of overgeneralization to watch for in architecture conversations.",
  "difficulty": "hard",
  "bloomLevel": "analyze"
}
\`\`\`

Notice: every distractor is a *real misconception a thoughtful learner could hold*, not an obviously-wrong throwaway. The explanation walks through why each wrong answer is tempting.`;

export const MIND_MAP_EXAMPLE = `### Gold-standard mind-map fragment

\`\`\`json
{
  "nodes": [
    { "id": "n0", "label": "Supply and Demand", "type": "root", "level": 0, "description": "How prices and quantities are set in a market." },
    { "id": "n1", "label": "Demand", "type": "concept", "level": 1, "description": "Quantity buyers will purchase at each price." },
    { "id": "n2", "label": "Supply", "type": "concept", "level": 1, "description": "Quantity sellers will produce at each price." },
    { "id": "n3", "label": "Equilibrium Price", "type": "subconcept", "level": 2, "description": "Price at which quantity demanded equals quantity supplied." },
    { "id": "n4", "label": "Price Ceiling", "type": "subconcept", "level": 2, "description": "Government-imposed maximum price below equilibrium." }
  ],
  "edges": [
    { "id": "e1", "source": "n0", "target": "n1", "label": "consists of", "type": "hierarchy" },
    { "id": "e2", "source": "n0", "target": "n2", "label": "consists of", "type": "hierarchy" },
    { "id": "e3", "source": "n1", "target": "n3", "label": "intersects supply at", "type": "causes" },
    { "id": "e4", "source": "n2", "target": "n3", "label": "intersects demand at", "type": "causes" },
    { "id": "e5", "source": "n4", "target": "n3", "label": "is binding only when below", "type": "requires" },
    { "id": "e6", "source": "n4", "target": "n2", "label": "creates a shortage by limiting", "type": "contradicts" }
  ]
}
\`\`\`

Notice: edge labels read as full sentences with their nodes ("Demand → intersects supply at → Equilibrium Price"). Three of six edges are non-hierarchy (causes / requires / contradicts) — the map shows how concepts *interact*, not just nest.`;
