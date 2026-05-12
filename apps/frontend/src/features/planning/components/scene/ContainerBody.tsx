// BoxWrapper kuralı kargo kutuları içindir; konteyner kabuğu için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useEffect, useRef, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { SCENE } from '@/lib/config/scene-config';
import normalUrl from '@/assets/textures/container-steel/normal.jpg';
import roughnessUrl from '@/assets/textures/container-steel/roughness.jpg';
import metalnessUrl from '@/assets/textures/container-steel/metalness.jpg';
import aoUrl from '@/assets/textures/container-steel/ao.jpg';

const WALL_GAP_CM = 0.5;

// 1m = 100cm. UV_SCALE ile konteyner boyutuna göre texture tekrar sayısı hesaplanır.
const UV_SCALE = 0.008;

type DoorDirection = 'rear' | 'side' | 'top' | 'allSides';

interface ContainerBodyProps {
  width: number;
  height: number;
  length: number;
  doorDirection?: DoorDirection;
  doorSide?: 'left' | 'right';
  color?: string;
}

// BoxGeometry face sırası: +X=0, -X=1, +Y=2, -Y=3, +Z=4, -Z=5
// Konteyner mesh merkezi [width/2, height/2, length/2] — kapı tarafı face'i tespit et.
function getDoorFaceIndices(doorDirection: DoorDirection, doorSide?: 'left' | 'right'): Set<number> {
  const indices = new Set<number>();
  if (doorDirection === 'rear') {
    indices.add(4); // +Z face: Z=length tarafı (arka kapı)
  }
  if (doorDirection === 'side') {
    indices.add(doorSide === 'right' ? 0 : 1); // +X (sağ) veya -X (sol)
  }
  if (doorDirection === 'top') {
    indices.add(2); // +Y face: Y=height tarafı (üst kapı)
  }
  if (doorDirection === 'allSides') {
    // Tüm 4 dikey yüz açık: +X, -X, +Z, -Z (taban ve tavan hariç)
    indices.add(0); // +X
    indices.add(1); // -X
    indices.add(4); // +Z
    indices.add(5); // -Z
  }
  return indices;
}

// Kapının karşısındaki yüz — yön hissi için daha opak render edilir.
function getOppositeFaceIndex(doorDirection: DoorDirection, doorSide?: 'left' | 'right'): number | null {
  if (doorDirection === 'rear') return 5;   // -Z: ön duvar
  if (doorDirection === 'side') return doorSide === 'right' ? 1 : 0; // karşı yan
  if (doorDirection === 'top') return 3;    // -Y: taban
  return null; // allSides: tüm yüzler açık
}

// BackSide render'da texture çalışır — normal vektörler ters gelir ama map görünür.
// Kapı face'i saydam bırakılır; içeriden bakınca dışarısı görünür.
export function ContainerBody({
  width,
  height,
  length,
  doorDirection = 'rear',
  doorSide,
  color,
}: ContainerBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const innerW = width - 2 * WALL_GAP_CM;
  const innerH = height - 2 * WALL_GAP_CM;
  const innerL = length - 2 * WALL_GAP_CM;

  const [normalMap, roughnessMap, metalnessMap, aoMap] = useTexture([
    normalUrl,
    roughnessUrl,
    metalnessUrl,
    aoUrl,
  ]);

  const doorFaceIndices = useMemo(
    () => getDoorFaceIndices(doorDirection, doorSide),
    [doorDirection, doorSide],
  );

  const oppositeFaceIndex = useMemo(
    () => getOppositeFaceIndex(doorDirection, doorSide),
    [doorDirection, doorSide],
  );

  useEffect(() => {
    if (!meshRef.current) return;

    const maxSide = Math.max(width, length);
    for (const tex of [normalMap, roughnessMap, metalnessMap, aoMap]) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(maxSide * UV_SCALE, height * UV_SCALE);
      tex.needsUpdate = true;
    }

    const matProps = {
      normalMap,
      roughnessMap,
      metalnessMap,
      aoMap,
      color: color ?? '#ffffff',
      side: THREE.DoubleSide,
      metalness: 0.45,
      roughness: 0.7,
      transparent: true,
      depthWrite: false,
    };
    const wallMat = new THREE.MeshStandardMaterial({
      ...matProps,
      opacity: SCENE.CONTAINER_WALL_OPACITY,
    });
    const backMat = new THREE.MeshStandardMaterial({
      ...matProps,
      opacity: SCENE.CONTAINER_WALL_OPACITY_BACK,
    });
    const invisMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // BoxGeometry'de 6 material group var (her face için bir).
    // Kapı face'i saydam, karşı duvar daha opak, geri kalan duvarlar standart.
    meshRef.current.material = Array.from({ length: 6 }, (_, i) => {
      if (doorFaceIndices.has(i)) return invisMat;
      if (i === oppositeFaceIndex) return backMat;
      return wallMat;
    });

    return () => {
      wallMat.dispose();
      backMat.dispose();
      invisMat.dispose();
    };
  }, [width, height, length, color, normalMap, roughnessMap, metalnessMap, aoMap, doorFaceIndices, oppositeFaceIndex]);

  return (
    <mesh ref={meshRef} position={[width / 2, height / 2, length / 2]} receiveShadow>
      <boxGeometry args={[innerW, innerH, innerL]} />
    </mesh>
  );
}
