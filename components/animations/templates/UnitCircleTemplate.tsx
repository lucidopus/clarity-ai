'use client';

import React, { useCallback } from 'react';
import { ManimScene } from 'manim-web/react';
import type { Scene, Vector3Tuple } from 'manim-web/react';
import { Circle, Line, Dot, Axes, MathTex, Create, FadeIn, ORIGIN } from 'manim-web/react';
import type { UnitCircleSpec } from '@/lib/types/animation';

interface Props {
  spec: UnitCircleSpec;
  width?: number;
  height?: number;
}

export default function UnitCircleTemplate({ spec, width = 600, height = 400 }: Props) {
  const handleSceneReady = useCallback(async (scene: Scene) => {
    const pace = (spec.config?.duration ?? 5) / 5;
    const angleRad = ((spec.angle ?? 45) * Math.PI) / 180;

    // Axes
    const axes = new Axes({
      xRange: [-1.5, 1.5, 0.5],
      yRange: [-1.5, 1.5, 0.5],
      xLength: 3,
      yLength: 3,
      axisConfig: { color: '#555555', strokeWidth: 1 },
    });
    scene.add(axes);

    // Unit circle
    const circle = new Circle({ radius: 1, color: '#888888', strokeWidth: 2 });
    await scene.play(new Create(circle, { duration: 1.5 * pace }));

    // Point on circle
    const px = Math.cos(angleRad);
    const py = Math.sin(angleRad);
    const point: Vector3Tuple = [px, py, 0];

    // Radius line
    const radiusLine = new Line({
      start: ORIGIN,
      end: point,
      color: '#FFFFFF',
      strokeWidth: 2,
    });
    const dot = new Dot({ point, color: '#FFFF00', radius: 0.06 });
    await scene.play(new Create(radiusLine, { duration: 0.8 * pace }), new FadeIn(dot, { duration: 0.8 * pace }));
    await scene.wait(0.3 * pace);

    // Cos line (horizontal projection)
    if (spec.showCos !== false) {
      const cosLine = new Line({
        start: ORIGIN,
        end: [px, 0, 0] as Vector3Tuple,
        color: '#58C4DD',
        strokeWidth: 3,
      });
      const cosLabel = new MathTex({ latex: '\\cos\\theta', color: '#58C4DD', fontSize: 18 });
      cosLabel.nextTo(cosLine, [0, -1, 0] as Vector3Tuple, 0.2);
      await scene.play(new Create(cosLine, { duration: 0.8 * pace }));
      scene.add(cosLabel);
      await scene.wait(0.3 * pace);
    }

    // Sin line (vertical projection)
    if (spec.showSin !== false) {
      const sinLine = new Line({
        start: [px, 0, 0] as Vector3Tuple,
        end: point,
        color: '#FC6255',
        strokeWidth: 3,
      });
      const sinLabel = new MathTex({ latex: '\\sin\\theta', color: '#FC6255', fontSize: 18 });
      sinLabel.nextTo(sinLine, [1, 0, 0] as Vector3Tuple, 0.2);
      await scene.play(new Create(sinLine, { duration: 0.8 * pace }));
      scene.add(sinLabel);
      await scene.wait(0.3 * pace);
    }

    // Tan line (tangent at x=1)
    if (spec.showTan) {
      const tanVal = Math.tan(angleRad);
      if (Math.abs(tanVal) < 10) {
        const tanLine = new Line({
          start: [1, 0, 0] as Vector3Tuple,
          end: [1, tanVal, 0] as Vector3Tuple,
          color: '#83C167',
          strokeWidth: 3,
        });
        const tanLabel = new MathTex({ latex: '\\tan\\theta', color: '#83C167', fontSize: 18 });
        tanLabel.nextTo(tanLine, [1, 0, 0] as Vector3Tuple, 0.2);
        await scene.play(new Create(tanLine, { duration: 0.8 * pace }));
        scene.add(tanLabel);
      }
    }

    await scene.wait(1.5 * pace);
  }, [spec.angle, spec.showCos, spec.showSin, spec.showTan, spec.config?.duration]);

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
