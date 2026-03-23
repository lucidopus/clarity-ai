'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene } from 'manim-web/react';
import { Circle, Square, Triangle, Pentagon, Create, Transform } from 'manim-web/react';
import type { Mobject } from 'manim-web/react';
import type { ShapeTransformSpec } from '@/lib/types/animation';

function makeShape(shape: string, color: string): Mobject {
  switch (shape) {
    case 'circle':
      return new Circle({ radius: 1.5, color, fillOpacity: 0.3 });
    case 'triangle':
      return new Triangle({ color, fillOpacity: 0.3 });
    case 'pentagon':
      return new Pentagon({ color, fillOpacity: 0.3 });
    case 'square':
    default:
      return new Square({ sideLength: 2.5, color, fillOpacity: 0.3 });
  }
}

interface Props {
  spec: ShapeTransformSpec;
  width?: number;
  height?: number;
}

export default function ShapeTransformTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;
    const from = makeShape(spec.fromShape, spec.color ?? '#58C4DD');
    const to = makeShape(spec.toShape, spec.color ?? '#58C4DD');

    await scene.play(new Create(from, { duration: 1 * pace }));
    await scene.wait(0.5 * pace);
    await scene.play(new Transform(from, to, { duration: 2 * pace }));
    await scene.wait(1.5 * pace);
  }, [spec.fromShape, spec.toShape, spec.color, spec.config?.duration]);

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
