// BoxWrapper kuralı kargo kutuları içindir; konteyner kabuğu için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import normalUrl from '@/assets/textures/container-steel/normal.jpg';
import roughnessUrl from '@/assets/textures/container-steel/roughness.jpg';
import metalnessUrl from '@/assets/textures/container-steel/metalness.jpg';
import aoUrl from '@/assets/textures/container-steel/ao.jpg';

const WALL_GAP_CM = 0.5;

// 1m = 100cm. UV_SCALE ile konteyner boyutuna göre texture tekrar sayısı hesaplanır.
const UV_SCALE = 0.008;

interface ContainerBodyProps {
  width: number;
  height: number;
  length: number;
}

// BackSide render'da texture çalışır — normal vektörler ters gelir ama map görünür.
// ContainerBody iç duvarları texture'lı metal olarak render eder.
export function ContainerBody({ width, height, length }: ContainerBodyProps) {
  const innerW = width - 2 * WALL_GAP_CM;
  const innerH = height - 2 * WALL_GAP_CM;
  const innerL = length - 2 * WALL_GAP_CM;

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

  return (
    <mesh position={[width / 2, height / 2, length / 2]} receiveShadow>
      <boxGeometry args={[innerW, innerH, innerL]} />
      <meshStandardMaterial
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        metalnessMap={metalnessMap}
        aoMap={aoMap}
        side={THREE.BackSide}
        metalness={0.45}
        roughness={0.7}
      />
    </mesh>
  );
}
