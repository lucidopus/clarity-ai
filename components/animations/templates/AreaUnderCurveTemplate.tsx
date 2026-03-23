'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene, Vector3Tuple } from 'manim-web/react';
import { Axes, FunctionGraph, Rectangle, Create, FadeIn } from 'manim-web/react';
import type { AreaUnderCurveSpec } from '@/lib/types/animation';

interface Props {
  spec: AreaUnderCurveSpec;
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

export default function AreaUnderCurveTemplate({ spec, width = 600, height = 400 }: Props) {
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
    await scene.play(new Create(graph, { duration: 2 * pace }));
    await scene.wait(0.5 * pace);

    // Draw Riemann sum rectangles
    const [a, b] = spec.interval;
    const n = spec.numRectangles ?? 10;
    const dx = (b - a) / n;

    for (let i = 0; i < n; i++) {
      const xLeft = a + i * dx;
      const xMid = xLeft + dx / 2;
      const h = mathFn(xMid);

      if (Math.abs(h) < 0.01) continue;

      const rect = new Rectangle({
        width: dx * 0.95,
        height: Math.abs(h),
        color: h >= 0 ? '#83C167' : '#FC6255',
        fillOpacity: 0.4,
        strokeWidth: 1,
      });

      rect.moveTo([xMid, h / 2, 0] as Vector3Tuple);

      if (spec.animateFill !== false) {
        await scene.play(new FadeIn(rect, { duration: 0.1 * pace }));
      } else {
        scene.add(rect);
      }
    }

    await scene.wait(2 * pace);
  }, [spec.expression, spec.interval, spec.numRectangles, spec.animateFill, spec.config?.duration]);

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
