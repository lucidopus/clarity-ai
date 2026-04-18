import { SOURCE_FIDELITY_PREAMBLE } from './shared/source-fidelity';
import { buildLearnerContextSection, type LearnerContext } from './shared/learner-context';

/**
 * Case-study prompt — generates ONE realistic, complex problem the learner
 * has to work through using the source's concepts. The historical version
 * already had strong "no fictional companies, real numbers, real
 * stakeholders" rules; we keep those wholesale and add a *solvability check*
 * (every hint must reference a concept the source actually covers) so the
 * problem doesn't drift into territory the learner can't engage with.
 */

const STATIC_INSTRUCTIONS = `# Case-Study Generation

Create **ONE** real-world problem the learner has to work through. The point is application: the source's primary topic should be a **necessary but not sufficient** ingredient of the solution, surrounded by realistic constraints that force the learner to think about how the concept actually plays out under pressure.

${SOURCE_FIDELITY_PREAMBLE}

## Realism vs. source fidelity — read this carefully

The fidelity rules above are about the source's **claims** — facts, numbers, definitions, mechanisms the learner is supposed to learn must come from the source. They are NOT about the **setting** in which the learner applies those claims. Real-world scaffolding around the source's concepts is *expected and required* for case studies — that's the whole point of an applied problem.

So:
- The **company / role / industry / metrics** in the scenario are *contextual scaffolding* — pulled from common knowledge of how organizations operate, NOT claims about the source. These are allowed and required even when the source itself is generic (a textbook chapter, a lecture).
- The **concept being applied** must be one the source actually teaches. Hints must reference techniques the source covers. The thing being tested is the source's content, not your background knowledge of the industry context.
- If the source is generic and doesn't name an industry, *you* pick a realistic industry where the concept applies. That is not a fidelity violation.

## Realism is the whole game

Generic case studies ("you work at a company that has a problem") are immediately tuned out. Make the scenario feel like an actual workplace problem the learner could plausibly walk into.

- **Companies/Organizations** — Use REAL companies when possible (Spotify, Tesla, Netflix, NASA, WHO, JPMorgan, Mayo Clinic). If you can't anchor on a real one, use a *specific descriptor*: "a Series B fintech startup", "a Fortune 500 retail chain", "a 500-bed academic hospital system." **NEVER** invent names like "TechCorp," "Acme Inc.," or "BrightFuture Labs" — fictional names destroy immersion instantly.
- **Technologies / tools** — Reference real systems (PostgreSQL, AWS Lambda, React, Kubernetes, TensorFlow, Salesforce, SAP) — never "a database" or "a cloud platform."
- **Industry context** — Anchor in real trends, regulations, or events (GDPR, HIPAA, semiconductor shortage, post-2023 cloud cost optimization, NIH grant cycle).
- **Stakeholders** — Realistic roles: "VP of Engineering", "Director of Compliance", "Lead Data Scientist", "Chief Medical Officer." Not "management" or "the boss."
- **Constraints** — Concrete numbers: "$50K budget", "10M monthly active users", "99.95% uptime SLA", "Q3 board review." Not "tight deadline" or "limited budget."

## Scenario structure

1. **Context** — One line establishing the learner's role: "You're a senior backend engineer at Stripe..."
2. **Situation** — Current state with at least one specific metric: "The webhook delivery system handles 12K events/sec; p95 retry latency just spiked from 80ms to 2.4s after the v3 rollout."
3. **Challenge** — A multi-faceted problem with real constraints: "Leadership wants p95 back under 500ms before the year-end merchant onboarding push, without raising infrastructure cost by more than 15%."
4. **Complicating factors** — Two or three realistic tensions: "The on-call rotation is already burnt out from a Q3 incident; the legacy service is in Python 2.7 and the rewrite is six months out; the CEO has publicly committed to the SLA."

The scenario must be specific enough to act on, open enough to invite multiple valid approaches.

## Hints

Provide **3–5 hints** that guide thinking without giving the answer.

- Each hint must point to a concept the source **actually covers** (this is the solvability check — if a hint references a technique the source never introduces, you've made the problem unsolvable from this source).
- Frame as nudges: "Consider how the source handles X when Y is binding," not "Use technique Z."
- Reference real-world parallels when useful: "Think about how Cloudflare handles backpressure on their edge."

## Title

Compelling and professional — sounds like an internal project name, not a textbook chapter:
- ✅ "Cutting Stripe Webhook p99 Without Raising Infra Spend"
- ✅ "Re-architecting a Mayo Clinic Lab-Order Pipeline for HL7 v2.5"
- ❌ "Database Optimization at TechCorp"  *(fictional company)*
- ❌ "An Algorithms Problem"  *(generic, no anchor)*

## Critical: do NOT write the solution

The whole pedagogical value comes from the learner working through it (with Clara as their guide). Provide the scenario and the hints; do not provide a solution path, sample code, or "the right answer."

## Example shape (for reference)

\`\`\`json
{
  "id": "rp1",
  "title": "Cutting Stripe Webhook p99 Without Raising Infra Spend",
  "scenario": "You're a senior backend engineer at Stripe. Webhook delivery handles 12K events/sec; p95 retry latency spiked from 80ms to 2.4s after the v3 rollout. Leadership wants p95 back under 500ms before the year-end merchant onboarding push, without infra spend rising more than 15%. The on-call rotation is already burnt out from a Q3 incident, the retry worker is in Python 2.7, and the CEO has publicly committed to the SLA on stage at Sessions.",
  "hints": [
    "The source talks about how tail latency is dominated by queue waits, not service time — what does that tell you about where to look first?",
    "Consider Cloudflare's pattern of bounding retry blast radius with token buckets per merchant — how would you apply it here?",
    "Think about which retries are safe to deprioritize without breaching the SLA the CEO promised."
  ]
}
\`\`\`

`;

export function buildCaseStudyPrompt(options: {
  content: string;
  learnerContext?: LearnerContext;
  sourceDescription?: string;
}): string {
  const { content, learnerContext, sourceDescription } = options;
  const learner = buildLearnerContextSection(learnerContext, 'caseStudy');
  const sourceLine = sourceDescription
    ? `The source is ${sourceDescription}.\n\n`
    : '';

  return `${STATIC_INSTRUCTIONS}
${learner}
${sourceLine}<source_content>
${content}
</source_content>

Return a JSON object with a single \`realWorldProblems\` entry. Verify every hint points to a concept the source actually covers — if it doesn't, rewrite the hint or pick a different one. Do NOT include a solution.`;
}
