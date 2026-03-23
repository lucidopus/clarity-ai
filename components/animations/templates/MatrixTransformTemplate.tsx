'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene } from 'manim-web/react';
import { NumberPlane, Arrow, ApplyMatrix, ORIGIN } from 'manim-web/react';
import type { Vector3Tuple } from 'manim-web/react';
import type { MatrixTransformSpec } from '@/lib/types/animation';

interface Props {
  spec: MatrixTransformSpec;
  width?: number;
  height?: number;
}

export default function MatrixTransformTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;

    // Create background grid
    const plane = new NumberPlane({
      xRange: [-4, 4, 1],
      yRange: [-4, 4, 1],
      xLength: 8,
      yLength: 8,
      backgroundLineStyle: { opacity: 0.3, color: '#888888' },
    });
    scene.add(plane);

    // Basis vectors
    const iHat = new Arrow({
      start: ORIGIN,
      end: [1, 0, 0] as Vector3Tuple,
      color: '#83C167',
      strokeWidth: 4,
    });
    const jHat = new Arrow({
      start: ORIGIN,
      end: [0, 1, 0] as Vector3Tuple,
      color: '#FC6255',
      strokeWidth: 4,
    });
    scene.add(iHat, jHat);

    await scene.wait(1 * pace);

    // Apply matrix transformation (convert 2x2 to 3x3 for manim-web)
    const matrix = [
      [spec.matrix[0][0], spec.matrix[0][1], 0],
      [spec.matrix[1][0], spec.matrix[1][1], 0],
      [0, 0, 1],
    ];

    await scene.play(
      new ApplyMatrix(plane, { matrix, duration: 2.5 * pace }),
      new ApplyMatrix(iHat, { matrix, duration: 2.5 * pace }),
      new ApplyMatrix(jHat, { matrix, duration: 2.5 * pace }),
    );

    await scene.wait(2 * pace);
  }, [spec.matrix, spec.config?.duration]);

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
