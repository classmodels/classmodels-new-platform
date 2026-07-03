'use client';

import { useTexture } from '@react-three/drei';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ROOM } from '@/components/model-portal/model-gallery-3d/showroomConstants';

const BORDER = 0.014;

function applyCoverCrop(tex: THREE.Texture, planeW: number, planeH: number): boolean {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img?.width || !img?.height) return false;

  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);

  const imgAspect = img.width / img.height;
  const planeAspect = planeW / planeH;
  if (imgAspect > planeAspect) {
    const r = planeAspect / imgAspect;
    tex.repeat.set(r, 1);
    tex.offset.set((1 - r) / 2, 0);
  } else {
    const r = imgAspect / planeAspect;
    tex.repeat.set(1, r);
    tex.offset.set(0, (1 - r) / 2);
  }
  tex.needsUpdate = true;
  return true;
}

/** Texture cover-crop zonder vervorming (object-fit: cover). */
function useCoverTexture(url: string, planeW: number, planeH: number) {
  const tex = useTexture(url);
  useLayoutEffect(() => {
    if (!url) return;
    if (applyCoverCrop(tex, planeW, planeH)) return;

    const img = tex.image as HTMLImageElement | undefined;
    if (!img) return;

    const onReady = () => {
      applyCoverCrop(tex, planeW, planeH);
    };
    if (img.complete) onReady();
    else img.addEventListener('load', onReady);
    return () => img.removeEventListener('load', onReady);
  }, [tex, url, planeW, planeH]);
  return tex;
}

export function WallPhotoFrame({
  imageUrl,
  position,
  rotation = [0, 0, 0],
  width,
  height,
  frameColor = ROOM.frameColor,
  frameDepth = ROOM.frameDepth,
  onClick,
}: {
  imageUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  frameColor?: string;
  frameDepth?: number;
  onClick?: () => void;
}) {
  const photoW = width - BORDER * 2;
  const photoH = height - BORDER * 2;
  const tex = useCoverTexture(imageUrl, photoW, photoH);

  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.45, metalness: 0.35 }),
    [frameColor],
  );

  if (!imageUrl) return null;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, frameDepth / 2]} castShadow receiveShadow onClick={onClick}>
        <boxGeometry args={[width, height, frameDepth]} />
        <primitive object={frameMat} attach="material" />
      </mesh>

      <mesh position={[0, 0, frameDepth + 0.008]} renderOrder={2} onClick={onClick}>
        <planeGeometry args={[photoW, photoH]} />
        <meshBasicMaterial map={tex} toneMapped={false} depthWrite={false} />
      </mesh>

      <mesh position={[0.012, -0.012, -0.004]}>
        <planeGeometry args={[width * 1.02, height * 1.02]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}
