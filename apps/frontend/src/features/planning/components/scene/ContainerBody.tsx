// BoxWrapper kuralı kargo kutuları içindir; konteyner kabuğu için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import normalUrl from '@/assets/textures/container-steel/normal.jpg';
import roughnessUrl from '@/assets/textures/container-steel/roughness.jpg';
import metalnessUrl from '@/assets/textures/container-steel/metalness.jpg';
import aoUrl from '@/assets/textures/container-steel/ao.jpg';

// z-fighting'i önlemek için duvar yüzeylerini hafif içeriye çek
const OFFSET = 0.1;
const UV_SCALE = 0.008;

interface ContainerBodyProps {
  width: number;
  height: number;
  length: number;
  doorDirection?: 'rear' | 'side' | 'top';
  doorSide?: 'left' | 'right';
}

export function ContainerBody({
  width,
  height,
  length,
  doorDirection = 'rear',
  doorSide,
}: ContainerBodyProps) {
  const [normalMap, roughnessMap, metalnessMap, aoMap] = useTexture([
    normalUrl,
    roughnessUrl,
    metalnessUrl,
    aoUrl,
  ]);

  useEffect(() => {
    const maxSide = Math.max(width, length);
    for (const tex of [normalMap, roughnessMap, metalnessMap, aoMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(maxSide * UV_SCALE, height * UV_SCALE);
      tex.needsUpdate = true;
    }
  }, [width, height, length, normalMap, roughnessMap, metalnessMap, aoMap]);

  // Kapı tarafındaki duvarı atla
  // side+left → kapı X=width duvarında → 'right' atlanır
  // side+right → kapı X=0 duvarında → 'left' atlanır
  const skipWall =
    doorDirection === 'top'
      ? 'ceiling'
      : doorDirection === 'rear'
        ? 'rear'
        : doorSide === 'left'
          ? 'right'
          : 'left';

  const matProps = {
    normalMap,
    roughnessMap,
    metalnessMap,
    aoMap,
    metalness: 0.45,
    roughness: 0.7,
  };

  return (
    <group>
      {/* Zemin — Y=0, normal +Y */}
      <mesh
        position={[width / 2, OFFSET, length / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial {...matProps} />
      </mesh>

      {/* Tavan — Y=height, normal -Y */}
      {skipWall !== 'ceiling' && (
        <mesh
          position={[width / 2, height - OFFSET, length / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      )}

      {/* Arka duvar — Z=0, normal +Z */}
      {skipWall !== 'rear' && (
        <mesh position={[width / 2, height / 2, OFFSET]} receiveShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      )}

      {/* Ön duvar — Z=length, normal -Z */}
      <mesh
        position={[width / 2, height / 2, length - OFFSET]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial {...matProps} />
      </mesh>

      {/* Sol duvar — X=0, normal +X */}
      {skipWall !== 'left' && (
        <mesh
          position={[OFFSET, height / 2, length / 2]}
          rotation={[0, Math.PI / 2, 0]}
          receiveShadow
        >
          <planeGeometry args={[length, height]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      )}

      {/* Sağ duvar — X=width, normal -X */}
      {skipWall !== 'right' && (
        <mesh
          position={[width - OFFSET, height / 2, length / 2]}
          rotation={[0, -Math.PI / 2, 0]}
          receiveShadow
        >
          <planeGeometry args={[length, height]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      )}
    </group>
  );
}
