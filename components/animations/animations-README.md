# Animations System

Interactive mathematical animations for Clara's chat, powered by [manim-web](https://github.com/maloyan/manim-web).

## Architecture

```
LLM emits tool_call: render_animation(AnimationSpec)
  → Backend validates via Zod schema
  → Streams as Markdown: ```animation\n{json}\n```
  → ChatMessage detects `language === 'animation'`
  → Lazy-loads AnimationRenderer (next/dynamic, ssr: false)
  → AnimationRenderer maps spec.type → Template component
  → Template uses ManimScene from manim-web/react
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/types/animation.ts` | AnimationSpec Zod schema (discriminated union) |
| `lib/tools/render-animation.ts` | LangChain tool definition for LLM |
| `lib/tools/index.ts` | Shared tool-calling infrastructure |
| `lib/utils/webgl-detect.ts` | WebGL/Canvas feature detection |
| `components/animations/AnimationRenderer.tsx` | Maps spec → template, controls, error boundary |
| `components/animations/AnimationFallback.tsx` | Static fallback when WebGL unavailable |
| `components/animations/AnimationLoading.tsx` | Loading state during animation generation |
| `components/animations/AnimationErrorBoundary.tsx` | React error boundary for render failures |
| `components/animations/templates/*.tsx` | 8 pre-built animation templates |

## Supported Animation Types

| Type | Template | Description |
|------|----------|-------------|
| `shape_transform` | ShapeTransformTemplate | Morph between shapes (square, circle, triangle, pentagon) |
| `vector_addition` | VectorAdditionTemplate | 2D vector addition with resultant |
| `matrix_transform` | MatrixTransformTemplate | 2x2 matrix applied to grid |
| `function_graph` | FunctionGraphTemplate | Plot and trace mathematical functions |
| `number_line` | NumberLineTemplate | Highlight values on a number line |
| `unit_circle` | UnitCircleTemplate | Trig functions on the unit circle |
| `derivative_tangent` | DerivativeTangentTemplate | Tangent line sliding along a curve |
| `area_under_curve` | AreaUnderCurveTemplate | Riemann sum / integral visualization |

## Adding a New Animation Template

1. **Define the schema** in `lib/types/animation.ts`:
   - Add a new Zod schema with `z.literal('your_type')` for the type field
   - Add it to the `AnimationSpecSchema` discriminated union
   - Export the inferred type

2. **Create the template** in `components/animations/templates/YourTemplate.tsx`:
   - Accept `spec` (your typed spec) and `width`/`height` props
   - Use `ManimScene` from `manim-web/react` with `onSceneReady`
   - Build and animate mobjects in the callback

3. **Register in AnimationRenderer** — add a case to the switch in `renderTemplate()`

4. **Update the tool description** in `lib/tools/render-animation.ts` to include the new type

5. **Update the system prompt** in `lib/prompts.ts` (ANIMATION_TOOL_PROMPT_ADDENDUM) to describe the new type

## Feature Flag

Set `ENABLE_ANIMATION_TOOL=true` in environment variables to enable the animation tool.
When disabled, Clara behaves exactly as before (no regression).

## Expression Parsing

Templates that accept math expressions (function_graph, derivative_tangent, area_under_curve)
use a safe expression parser that:
- Allowlists only Math.* functions and basic operators
- Validates against a character allowlist regex
- Falls back to `() => 0` if parsing fails
- Does NOT use `eval()` — uses `new Function()` with strict mode
