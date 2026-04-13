import { z } from 'zod';

// Shared config for all animation types
const AnimationConfigSchema = z.object({
  width: z.number().default(600),
  height: z.number().default(400),
  backgroundColor: z.string().default('#1a1a2e'),
  duration: z.number().min(2).max(15).default(5),
}).optional();

// --- Per-template discriminated schemas ---

const ShapeTransformSchema = z.object({
  type: z.literal('shape_transform'),
  title: z.string().max(100),
  description: z.string().max(300),
  fromShape: z.enum(['square', 'circle', 'triangle', 'pentagon']),
  toShape: z.enum(['square', 'circle', 'triangle', 'pentagon']),
  color: z.string().default('#58C4DD'),
  config: AnimationConfigSchema,
});

const VectorAdditionSchema = z.object({
  type: z.literal('vector_addition'),
  title: z.string().max(100),
  description: z.string().max(300),
  vectorA: z.tuple([z.number(), z.number()]),
  vectorB: z.tuple([z.number(), z.number()]),
  showResultant: z.boolean().default(true),
  config: AnimationConfigSchema,
});

const MatrixTransformSchema = z.object({
  type: z.literal('matrix_transform'),
  title: z.string().max(100),
  description: z.string().max(300),
  matrix: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
  showGrid: z.boolean().default(true),
  config: AnimationConfigSchema,
});

const FunctionGraphSchema = z.object({
  type: z.literal('function_graph'),
  title: z.string().max(100),
  description: z.string().max(300),
  expression: z.string().max(200),
  xRange: z.tuple([z.number(), z.number()]).default([-5, 5]),
  yRange: z.tuple([z.number(), z.number()]).default([-5, 5]),
  color: z.string().default('#FC6255'),
  animateTrace: z.boolean().default(true),
  config: AnimationConfigSchema,
});

const NumberLineSchema = z.object({
  type: z.literal('number_line'),
  title: z.string().max(100),
  description: z.string().max(300),
  range: z.tuple([z.number(), z.number()]).default([-5, 5]),
  points: z.array(
    z.object({
      value: z.number(),
      label: z.string().optional(),
      color: z.string().optional(),
    })
  ).min(1).max(10),
  config: AnimationConfigSchema,
});

const UnitCircleSchema = z.object({
  type: z.literal('unit_circle'),
  title: z.string().max(100),
  description: z.string().max(300),
  angle: z.number().min(0).max(360).default(45),
  showSin: z.boolean().default(true),
  showCos: z.boolean().default(true),
  showTan: z.boolean().default(false),
  animateSweep: z.boolean().default(true),
  config: AnimationConfigSchema,
});

const DerivativeTangentSchema = z.object({
  type: z.literal('derivative_tangent'),
  title: z.string().max(100),
  description: z.string().max(300),
  expression: z.string().max(200),
  tangentPoint: z.number().default(1),
  animateSlide: z.boolean().default(true),
  config: AnimationConfigSchema,
});

const AreaUnderCurveSchema = z.object({
  type: z.literal('area_under_curve'),
  title: z.string().max(100),
  description: z.string().max(300),
  expression: z.string().max(200),
  interval: z.tuple([z.number(), z.number()]),
  numRectangles: z.number().min(1).max(100).default(10),
  animateFill: z.boolean().default(true),
  config: AnimationConfigSchema,
});

// --- Discriminated union (used for server-side validation after tool call) ---
export const AnimationSpecSchema = z.discriminatedUnion('type', [
  ShapeTransformSchema,
  VectorAdditionSchema,
  MatrixTransformSchema,
  FunctionGraphSchema,
  NumberLineSchema,
  UnitCircleSchema,
  DerivativeTangentSchema,
  AreaUnderCurveSchema,
]);

export type AnimationSpec = z.infer<typeof AnimationSpecSchema>;

/**
 * Flat schema for the LLM tool definition.
 *
 * Uses z.array() instead of z.tuple() because Gemini's API does not support
 * the `prefixItems` JSON Schema keyword that z.tuple() generates.
 * The route handler re-validates with AnimationSpecSchema (discriminated union
 * with proper tuples) to ensure correctness.
 */
const pair = z.array(z.number()).min(2).max(2);

export const AnimationToolSchema = z.object({
  type: z.enum([
    'shape_transform',
    'vector_addition',
    'matrix_transform',
    'function_graph',
    'number_line',
    'unit_circle',
    'derivative_tangent',
    'area_under_curve',
  ]).describe('The type of animation to render'),
  title: z.string().max(100).describe('Short title for the animation'),
  description: z.string().max(300).describe('Brief description of what the animation shows'),
  config: AnimationConfigSchema,

  // shape_transform fields
  fromShape: z.enum(['square', 'circle', 'triangle', 'pentagon']).optional()
    .describe('(shape_transform) Starting shape'),
  toShape: z.enum(['square', 'circle', 'triangle', 'pentagon']).optional()
    .describe('(shape_transform) Target shape'),

  // vector_addition fields
  vectorA: pair.optional()
    .describe('(vector_addition) First vector [x, y]'),
  vectorB: pair.optional()
    .describe('(vector_addition) Second vector [x, y]'),
  showResultant: z.boolean().optional()
    .describe('(vector_addition) Show the resultant vector'),

  // matrix_transform fields
  matrix: z.array(pair).min(2).max(2).optional()
    .describe('(matrix_transform) 2x2 transformation matrix [[a, b], [c, d]]'),
  showGrid: z.boolean().optional()
    .describe('(matrix_transform) Show the deformed grid'),

  // function_graph / derivative_tangent / area_under_curve fields
  expression: z.string().max(200).optional()
    .describe('(function_graph, derivative_tangent, area_under_curve) Math expression e.g. "x^2", "sin(x)"'),
  xRange: pair.optional()
    .describe('(function_graph) X-axis range [min, max]'),
  yRange: pair.optional()
    .describe('(function_graph) Y-axis range [min, max]'),
  color: z.string().optional()
    .describe('(shape_transform, function_graph) Color hex string'),
  animateTrace: z.boolean().optional()
    .describe('(function_graph) Animate the function being traced'),

  // number_line fields
  range: pair.optional()
    .describe('(number_line) Range of the number line [min, max]'),
  points: z.array(z.object({
    value: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  })).optional()
    .describe('(number_line) Points to highlight on the number line'),

  // unit_circle fields
  angle: z.number().optional()
    .describe('(unit_circle) Angle in degrees 0-360'),
  showSin: z.boolean().optional()
    .describe('(unit_circle) Show sine projection'),
  showCos: z.boolean().optional()
    .describe('(unit_circle) Show cosine projection'),
  showTan: z.boolean().optional()
    .describe('(unit_circle) Show tangent line'),
  animateSweep: z.boolean().optional()
    .describe('(unit_circle) Animate the angle sweep'),

  // derivative_tangent fields
  tangentPoint: z.number().optional()
    .describe('(derivative_tangent) X value for the tangent point'),
  animateSlide: z.boolean().optional()
    .describe('(derivative_tangent) Animate the tangent sliding along the curve'),

  // area_under_curve fields
  interval: pair.optional()
    .describe('(area_under_curve) Integration interval [a, b]'),
  numRectangles: z.number().optional()
    .describe('(area_under_curve) Number of Riemann sum rectangles (1-100)'),
  animateFill: z.boolean().optional()
    .describe('(area_under_curve) Animate rectangles filling in'),
});

// Export individual types for template components
export type ShapeTransformSpec = z.infer<typeof ShapeTransformSchema>;
export type VectorAdditionSpec = z.infer<typeof VectorAdditionSchema>;
export type MatrixTransformSpec = z.infer<typeof MatrixTransformSchema>;
export type FunctionGraphSpec = z.infer<typeof FunctionGraphSchema>;
export type NumberLineSpec = z.infer<typeof NumberLineSchema>;
export type UnitCircleSpec = z.infer<typeof UnitCircleSchema>;
export type DerivativeTangentSpec = z.infer<typeof DerivativeTangentSchema>;
export type AreaUnderCurveSpec = z.infer<typeof AreaUnderCurveSchema>;

// All supported animation types
export const ANIMATION_TYPES = [
  'shape_transform',
  'vector_addition',
  'matrix_transform',
  'function_graph',
  'number_line',
  'unit_circle',
  'derivative_tangent',
  'area_under_curve',
] as const;

export type AnimationType = (typeof ANIMATION_TYPES)[number];
