'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene, Vector3Tuple } from 'manim-web/react';
import { Axes, FunctionGraph, Line, Dot, Create, FadeIn } from 'manim-web/react';
import type { DerivativeTangentSpec } from '@/lib/types/animation';

interface Props {
  spec: DerivativeTangentSpec;
  width?: number;
  height?: number;
}

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

function numericalDerivative(fn: (x: number) => number, x: number, h = 0.0001): number {
  return (fn(x + h) - fn(x - h)) / (2 * h);
}

export default function DerivativeTangentTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;

    const axes = new Axes({
      xRange: [-5, 5, 1],
      yRange: [-5, 5, 1],
      xLength: 10,
      yLength: 10,
      axisConfig: { color: '#888888' },
    });
    scene.add(axes);

    const mathFn = parseExpression(spec.expression);

    const graph = new FunctionGraph({
      func: mathFn,
      xRange: [-5, 5],
      color: '#58C4DD',
    });
    await scene.play(new Create(graph, { duration: 2.5 * pace }));
    await scene.wait(0.5 * pace);

    // Tangent line at the specified point
    const x0 = spec.tangentPoint ?? 1;
    const y0 = mathFn(x0);
    const slope = numericalDerivative(mathFn, x0);

    const dx = 2;
    const tangentLine = new Line({
      start: [x0 - dx, y0 - slope * dx, 0] as Vector3Tuple,
      end: [x0 + dx, y0 + slope * dx, 0] as Vector3Tuple,
      color: '#FC6255',
      strokeWidth: 3,
    });

    const dot = new Dot({
      point: [x0, y0, 0] as Vector3Tuple,
      color: '#FFFF00',
      radius: 0.08,
    });

    await scene.play(new FadeIn(dot, { duration: 0.5 * pace }), new Create(tangentLine, { duration: 1.5 * pace }));
    await scene.wait(2 * pace);
  }, [spec.expression, spec.tangentPoint, spec.config?.duration]);

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
