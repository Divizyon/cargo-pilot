// BoxWrapper kuralı kargo kutuları içindir; konteyner kabuğu için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useMemo } from 'react';
import * as THREE from 'three';
import { SCENE } from '@/lib/config/scene-config';

const WALL_GAP_CM = 0.5;
const INNER_METALNESS = 0.55;
const INNER_ROUGHNESS = 0.45;
const SHELL_METALNESS = 0.65;
const SHELL_ROUGHNESS = 0.35;
const SHELL_OPACITY = 0.55;
const CORRUGATION_STEP = 50; // cm — gerçek konteynerlerdeki yatay oluk aralığı
const CORRUGATION_COLOR = '#94a3b8';
const CORRUGATION_OPACITY = 0.7;

interface ContainerBodyProps {
  width: number;
  height: number;
  length: number;
}

// Yan duvarlar (x=0 ve x=width) + arka duvar (z=length) + tavan (y=height) üzerine
// yatay oluk çizgileri. Zemin ve ön yüz (kapı tarafı) hariç.
function CorrugationLines({ width, height, length }: ContainerBodyProps) {
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const gap = WALL_GAP_CM;

    for (let y = CORRUGATION_STEP; y < height - gap; y += CORRUGATION_STEP) {
      // Sol duvar (x=gap) — z boyunca yatay
      pts.push(gap, y, gap, gap, y, length - gap);
      // Sağ duvar (x=width-gap) — z boyunca yatay
      pts.push(width - gap, y, gap, width - gap, y, length - gap);
      // Arka duvar (z=length-gap) — x boyunca yatay
      pts.push(gap, y, length - gap, width - gap, y, length - gap);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [width, height, length]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={CORRUGATION_COLOR}
        opacity={CORRUGATION_OPACITY}
        transparent
        depthWrite={false}
      />
    </lineSegments>
  );
}

// Origin = sol-alt-arka. Konteyner x∈[0,width], y∈[0,height], z∈[0,length].
// İki katman: dış kabuk (FrontSide, yarı saydam metal) + iç yüzey (BackSide, warm tone).
// Dış kabuk kameraya yakın yüzleri saydam göstererek içerideki kargoya görünürlük sağlar.
export function ContainerBody({ width, height, length }: ContainerBodyProps) {
  const innerW = width - 2 * WALL_GAP_CM;
  const innerH = height - 2 * WALL_GAP_CM;
  const innerL = length - 2 * WALL_GAP_CM;
  const cx = width / 2;
  const cy = height / 2;
  const cz = length / 2;

  return (
    <group>
      {/* Dış kabuk — metal konteyner hissi, yarı saydam */}
      <mesh position={[cx, cy, cz]} castShadow receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial
          color={SCENE.COLORS.CONTAINER_SHELL}
          side={THREE.FrontSide}
          metalness={SHELL_METALNESS}
          roughness={SHELL_ROUGHNESS}
          transparent
          opacity={SHELL_OPACITY}
          depthWrite={false}
        />
      </mesh>
      {/* İç yüzey — sıcak ton, kargo arka planı */}
      <mesh position={[cx, cy, cz]} receiveShadow>
        <boxGeometry args={[innerW, innerH, innerL]} />
        <meshStandardMaterial
          color={SCENE.COLORS.CONTAINER_INSIDE}
          side={THREE.BackSide}
          metalness={INNER_METALNESS}
          roughness={INNER_ROUGHNESS}
        />
      </mesh>
      {/* Yatay oluk çizgileri — yan/arka duvar + tavan */}
      <CorrugationLines width={width} height={height} length={length} />
    </group>
  );
}
