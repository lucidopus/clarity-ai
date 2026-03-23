'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene } from 'manim-web/react';
import { Axes, FunctionGraph, Create } from 'manim-web/react';
import type { FunctionGraphSpec } from '@/lib/types/animation';

interface Props {
  spec: FunctionGraphSpec;
  width?: number;
  height?: number;
}

/**
 * Safely evaluate a math expression string into a function.
 * Supports: Math.sin, Math.cos, Math.tan, Math.log, Math.abs, Math.sqrt, Math.pow, Math.PI, Math.E,
 * plus ** for exponentiation.
 */
function parseExpression(expr: string): (x: number) => number {
  const safeExpr = expr
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\blog\b/g, 'Math.log')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\bpow\b/g, 'Math.pow')
    .replace(/\bPI\b/g, 'Math.PI')
    .replace(/\bE\b/g, 'Math.E')
    .replace(/\bexp\b/g, 'Math.exp');

  if (!/^[\d\sx+\-*/().^,Math a-z]+$/i.test(safeExpr)) {
    return () => 0;
  }

  try {
    const fn = new Function('x', `"use strict"; return (${safeExpr});`) as (x: number) => number;
    fn(0);
    return fn;
  } catch {
    return () => 0;
  }
}

export default function FunctionGraphTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;
    const [xMin, xMax] = spec.xRange ?? [-5, 5];
    const [yMin, yMax] = spec.yRange ?? [-5, 5];

    const axes = new Axes({
      xRange: [xMin, xMax, 1],
      yRange: [yMin, yMax, 1],
      xLength: xMax - xMin,
      yLength: yMax - yMin,
      axisConfig: { color: '#888888' },
    });

    scene.add(axes);

    const mathFn = parseExpression(spec.expression);

    const graph = new FunctionGraph({
      func: mathFn,
      xRange: [xMin, xMax],
      color: spec.color ?? '#FC6255',
    });

    if (spec.animateTrace !== false) {
      await scene.play(new Create(graph, { duration: 3 * pace }));
    } else {
      scene.add(graph);
    }

    await scene.wait(2 * pace);
  }, [spec.expression, spec.xRange, spec.yRange, spec.color, spec.animateTrace, spec.config?.duration]);

  return (
    <ManimScene
      width={width}
      height={height}
      backgroundColor={spec.config?.backgroundColor ?? '#1a1a2e'}
      onSceneReady={handleSceneReady}
      className="rounded-lg overflow-hidden"
    />
  );
}
