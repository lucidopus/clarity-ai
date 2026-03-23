/**
 * LangChain tool definition for the render_animation tool.
 *
 * Clara uses this to generate interactive mathematical animations inline in chat.
 * The LLM outputs a structured AnimationSpec (validated by Zod), NOT raw code.
 */

import { tool } from '@langchain/core/tools';
import { AnimationToolSchema } from '@/lib/types/animation';

export const renderAnimationTool = tool(
  async (input) => {
    // Tool execution is handled by the backend interceptor, not here.
    // This function validates and returns the spec as JSON string.
    return JSON.stringify(input);
  },
  {
    name: 'render_animation',
    description: `Render an interactive mathematical animation to visually explain a concept.

Use this tool when explaining: geometric transformations, vector operations, matrix math,
function graphs, derivatives, integrals, trigonometry, or any concept that benefits from
visual/spatial understanding. Do NOT use for non-mathematical concepts.

AVAILABLE ANIMATION TYPES (set the "type" field accordingly):
- shape_transform: Morph one shape into another. Required fields: fromShape, toShape. Optional: color.
- vector_addition: Show two 2D vectors and their resultant. Required: vectorA, vectorB. Optional: showResultant.
- matrix_transform: Apply a 2x2 matrix to a unit square. Required: matrix. Optional: showGrid.
- function_graph: Plot and animate a function. Required: expression. Optional: xRange, yRange, color, animateTrace.
- number_line: Highlight values on a number line. Required: points. Optional: range.
- unit_circle: Show sin/cos/tan on the unit circle. Optional: angle, showSin, showCos, showTan, animateSweep.
- derivative_tangent: Animate a tangent line sliding along a curve. Required: expression. Optional: tangentPoint, animateSlide.
- area_under_curve: Riemann sum visualization. Required: expression, interval. Optional: numRectangles, animateFill.

Only include the fields relevant to your chosen type. Always provide a text explanation alongside the animation.`,
    schema: AnimationToolSchema,
  }
);
