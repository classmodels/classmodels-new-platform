'use client';

import { ROOM, BACK_WALL, LEFT_WALL } from '@/components/model-portal/model-gallery-3d/showroomConstants';

const LED = '#ff8040';

function LedStrip({
  position,
  rotation,
  length,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[length, 0.025, 0.035]} />
      <meshStandardMaterial color={LED} emissive={LED} emissiveIntensity={2} toneMapped={false} />
    </mesh>
  );
}

export function ShowroomRoom() {
  return (
    <group>
      {/* Vloer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.2]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={ROOM.floorColor} roughness={0.32} metalness={0.08} />
      </mesh>

      {/* Plafond */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5.6, -1.2]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={ROOM.ceilingColor} roughness={1} />
      </mesh>

      {/* Achterwand */}
      <mesh position={[0, BACK_WALL.y, BACK_WALL.z]} receiveShadow>
        <planeGeometry args={[BACK_WALL.width, BACK_WALL.height]} />
        <meshStandardMaterial color={ROOM.wallColor} roughness={0.94} />
      </mesh>
      <LedStrip position={[0, 0.32, BACK_WALL.z + 0.02]} rotation={[0, 0, 0]} length={11} />
      <LedStrip position={[0, 5.38, BACK_WALL.z + 0.02]} rotation={[0, 0, 0]} length={11} />

      {/* Linkermuur — schuin */}
      <group position={LEFT_WALL.position} rotation={LEFT_WALL.rotation}>
        <mesh receiveShadow>
          <planeGeometry args={[LEFT_WALL.width, LEFT_WALL.height]} />
          <meshStandardMaterial color={ROOM.wallColor} roughness={0.94} />
        </mesh>
        <LedStrip position={[0, -LEFT_WALL.height / 2 + 0.32, 0.02]} rotation={[0, 0, 0]} length={LEFT_WALL.width * 0.95} />
        <LedStrip position={[0, LEFT_WALL.height / 2 - 0.28, 0.02]} rotation={[0, 0, 0]} length={LEFT_WALL.width * 0.95} />
      </group>

      {/* Rechter zijwand (diepte) */}
      <mesh position={[4.5, 2.75, -2.2]} rotation={[0, -0.35, 0]} receiveShadow>
        <planeGeometry args={[4, 5.4]} />
        <meshStandardMaterial color={ROOM.wallDark} roughness={0.95} />
      </mesh>

      {/* Vloer-LED */}
      <LedStrip position={[-1.2, 0.02, -1.4]} rotation={[-Math.PI / 2, 0.4, 0]} length={5.5} />
      <LedStrip position={[1.6, 0.02, -4.5]} rotation={[-Math.PI / 2, 0, 0]} length={7} />

      {/* Centrale pilaar */}
      <mesh position={[0.05, 2.75, -1.05]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.48, 5.5, 24]} />
        <meshStandardMaterial color="#2a1814" roughness={0.88} metalness={0.12} />
      </mesh>

      {/* Planten — buiten tekst/foto-zone */}
      <group position={[-4.8, 0, -3.2]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 0.56, 16]} />
          <meshStandardMaterial color="#3d2a22" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <sphereGeometry args={[0.38, 12, 12]} />
          <meshStandardMaterial color="#2d5a32" roughness={0.95} />
        </mesh>
      </group>
      <group position={[4.2, 0, -3.6]}>
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.48, 16]} />
          <meshStandardMaterial color="#3d2a22" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshStandardMaterial color="#3a6b38" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}
