'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import { ShowroomRoom } from '@/components/model-portal/model-gallery-3d/ShowroomRoom';
import { WallPhotoFrame } from '@/components/model-portal/model-gallery-3d/WallPhotoFrame';
import { WallTextBlock } from '@/components/model-portal/model-gallery-3d/WallTextBlock';
import { SHOWROOM_WALL_COUNT } from '@/components/model-portal/model-gallery-3d/useShowroomGallery';
import {
  showroomAvailLines,
  showroomDisplayName,
  showroomStats,
  showroomSubtitle,
  splitDisplayName,
} from '@/components/model-portal/model-gallery-3d/showroomTextData';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import {
  AVAIL,
  CAMERA,
  DEMO_NAME,
  GRID,
  HERO,
  HERO_FRAME,
  LEFT_WALL,
  ROOM,
  SMALL_FRAME,
  STATS,
  TEXT_BLOCKS,
  gridCellPosition,
} from '@/components/model-portal/model-gallery-3d/showroomConstants';

function CameraRig({ orbitEnabled }: { orbitEnabled: boolean }) {
  const { camera, size } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const target = useRef(new THREE.Vector3(...CAMERA.target));

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const pullBack = aspect < 0.85 ? 1.35 : aspect < 1.2 ? 1.12 : 1;
    camera.position.set(CAMERA.position[0], CAMERA.position[1], CAMERA.position[2] * pullBack);
    if ('fov' in camera) {
      camera.fov = aspect < 0.75 ? CAMERA.fov + 6 : CAMERA.fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target.current);
  }, [camera, size.width, size.height]);

  useEffect(() => {
    if (orbitEnabled) return;
    const aspect = size.width / Math.max(size.height, 1);
    const pullBack = aspect < 0.85 ? 1.35 : aspect < 1.2 ? 1.12 : 1;
    camera.position.set(CAMERA.position[0], CAMERA.position[1], CAMERA.position[2] * pullBack);
    camera.lookAt(target.current);
    controlsRef.current?.target.copy(target.current);
    controlsRef.current?.update();
  }, [orbitEnabled, camera, size.width, size.height]);

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={orbitEnabled}
      target={CAMERA.target}
      enablePan={false}
      minDistance={4.5}
      maxDistance={8}
      minPolarAngle={Math.PI / 2 - 0.35}
      maxPolarAngle={Math.PI / 2 + 0.25}
      minAzimuthAngle={-0.45}
      maxAzimuthAngle={0.45}
    />
  );
}

export function ShowroomScene({
  photoUrls,
  model,
  isAdmin,
  demo = false,
  heroIndex,
  onSelectPhoto,
  orbitEnabled,
}: {
  photoUrls: string[];
  model: CatalogModel | null;
  isAdmin: boolean;
  demo?: boolean;
  heroIndex: number;
  onSelectPhoto: (index: number) => void;
  orbitEnabled: boolean;
}) {
  const heroSrc = photoUrls[heroIndex] ?? photoUrls[0] ?? '';
  const displayName = demo ? `${DEMO_NAME.first} ${DEMO_NAME.last}`.toUpperCase() : model ? showroomDisplayName(model, isAdmin) : '';
  const { first: nameFirst, last: nameLast } = demo
    ? { first: DEMO_NAME.first.toUpperCase(), last: DEMO_NAME.last.toUpperCase() }
    : splitDisplayName(displayName);
  const subtitle = demo ? DEMO_NAME.subtitle.toUpperCase() : model ? showroomSubtitle(model) : '';
  const avail = demo ? AVAIL.map((a) => a.toUpperCase()) : model ? showroomAvailLines(model.beschikbaar) : [];
  const stats = demo ? STATS : model ? showroomStats(model) : [];

  return (
    <>
      <color attach="background" args={['#120a08']} />
      <fog attach="fog" args={['#120a08', 12, 28]} />

      <ambientLight intensity={0.28} color="#ffe8d0" />
      <directionalLight position={[3, 7, 5]} intensity={0.42} color="#fff0e0" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-2.5, 3.5, 2]} intensity={0.5} color="#ffb080" distance={14} />
      <pointLight position={[2.5, 3, -2]} intensity={0.38} color="#ff9050" distance={12} />
      <spotLight position={[-3, 5.2, 1]} angle={0.45} penumbra={0.6} intensity={0.55} color="#ffe8c8" castShadow />

      <CameraRig orbitEnabled={orbitEnabled} />
      <ShowroomRoom />

      {/* 8 muurfoto's — parallel aan linkermuur, zelfde rotatie */}
      <group position={LEFT_WALL.position} rotation={LEFT_WALL.rotation}>
        {photoUrls.slice(0, SHOWROOM_WALL_COUNT).map((src, idx) => {
          const col = idx % GRID.cols;
          const row = Math.floor(idx / GRID.cols);
          return (
            <WallPhotoFrame
              key={`${src}-${idx}`}
              imageUrl={src}
              position={gridCellPosition(col, row)}
              width={SMALL_FRAME.width}
              height={SMALL_FRAME.height}
              frameDepth={ROOM.frameDepth}
              onClick={() => onSelectPhoto(idx)}
            />
          );
        })}
      </group>

      {/* Hero — frontale muur, 4:5 */}
      {heroSrc ? (
        <WallPhotoFrame
          imageUrl={heroSrc}
          position={HERO.position}
          width={HERO_FRAME.width}
          height={HERO_FRAME.height}
          frameDepth={ROOM.frameDepth}
        />
      ) : null}

      {/* Tekst op achterwand — parallel, geen scheve overlay */}
      <WallTextBlock
        variant="name"
        position={TEXT_BLOCKS.name.position}
        width={TEXT_BLOCKS.name.width}
        height={TEXT_BLOCKS.name.height}
        nameFirst={nameFirst}
        nameLast={nameLast}
        subtitle={subtitle}
        availLines={avail}
      />
      <WallTextBlock
        variant="stats"
        position={TEXT_BLOCKS.stats.position}
        width={TEXT_BLOCKS.stats.width}
        height={TEXT_BLOCKS.stats.height}
        stats={stats}
      />
    </>
  );
}
