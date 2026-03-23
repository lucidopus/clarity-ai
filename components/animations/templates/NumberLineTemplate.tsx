'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene, Vector3Tuple } from 'manim-web/react';
import { NumberLine, Dot, Text, FadeIn } from 'manim-web/react';
import type { NumberLineSpec } from '@/lib/types/animation';

interface Props {
  spec: NumberLineSpec;
  width?: number;
  height?: number;
}

export default function NumberLineTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;
    const [rangeMin, rangeMax] = spec.range ?? [-5, 5];

    const numberLine = new NumberLine({
      xRange: [rangeMin, rangeMax, 1],
      length: 10,
      includeNumbers: true,
      color: '#888888',
    });
    scene.add(numberLine);

    // Animate points one by one
    for (const point of spec.points) {
      const position = numberLine.numberToPoint(point.value);
      const dot = new Dot({
        point: position,
        color: point.color ?? '#FC6255',
        radius: 0.12,
      });

      if (point.label) {
        const label = new Text({
          text: point.label,
          color: point.color ?? '#FC6255',
          fontSize: 24,
        });
        label.nextTo(dot, [0, 1, 0] as Vector3Tuple, 0.3);
        await scene.play(new FadeIn(dot, { duration: 0.5 * pace }), new FadeIn(label, { duration: 0.5 * pace }));
      } else {
        await scene.play(new FadeIn(dot, { duration: 0.5 * pace }));
      }

      await scene.wait(0.5 * pace);
    }

    await scene.wait(1.5 * pace);
  }, [spec.range, spec.points, spec.config?.duration]);

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
