'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene, Vector3Tuple } from 'manim-web/react';
import { NumberPlane, Arrow, GrowArrow, Create, MathTex, ORIGIN } from 'manim-web/react';
import type { VectorAdditionSpec } from '@/lib/types/animation';

interface Props {
  spec: VectorAdditionSpec;
  width?: number;
  height?: number;
}

export default function VectorAdditionTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;
    const [ax, ay] = spec.vectorA;
    const [bx, by] = spec.vectorB;

    // Coordinate plane
    const plane = new NumberPlane({
      xRange: [-6, 6, 1],
      yRange: [-4, 4, 1],
      xLength: 12,
      yLength: 8,
      backgroundLineStyle: { opacity: 0.2 },
    });
    scene.add(plane);

    // Vector A (from origin)
    const vecA = new Arrow({
      start: ORIGIN,
      end: [ax, ay, 0] as Vector3Tuple,
      color: '#FC6255',
      strokeWidth: 4,
    });

    // Vector B (from tip of A)
    const vecB = new Arrow({
      start: [ax, ay, 0] as Vector3Tuple,
      end: [ax + bx, ay + by, 0] as Vector3Tuple,
      color: '#58C4DD',
      strokeWidth: 4,
    });

    // Labels
    const labelA = new MathTex({ latex: '\\vec{a}', color: '#FC6255' });
    labelA.nextTo(vecA, [0, 0.3, 0] as Vector3Tuple);

    const labelB = new MathTex({ latex: '\\vec{b}', color: '#58C4DD' });
    labelB.nextTo(vecB, [0, 0.3, 0] as Vector3Tuple);

    await scene.play(new GrowArrow(vecA, { duration: 1.5 * pace }));
    scene.add(labelA);
    await scene.wait(0.8 * pace);
    await scene.play(new GrowArrow(vecB, { duration: 1.5 * pace }));
    scene.add(labelB);
    await scene.wait(0.8 * pace);

    // Resultant vector
    if (spec.showResultant !== false) {
      const resultant = new Arrow({
        start: ORIGIN,
        end: [ax + bx, ay + by, 0] as Vector3Tuple,
        color: '#FFFF00',
        strokeWidth: 4,
      });
      const labelR = new MathTex({ latex: '\\vec{a}+\\vec{b}', color: '#FFFF00' });
      labelR.nextTo(resultant, [0.3, 0, 0] as Vector3Tuple);

      await scene.play(new Create(resultant, { duration: 1.2 * pace }));
      scene.add(labelR);
    }

    await scene.wait(2 * pace);
  }, [spec.vectorA, spec.vectorB, spec.showResultant, spec.config?.duration]);

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
