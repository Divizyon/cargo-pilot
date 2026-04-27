// BoxWrapper kuralı kargo kutuları içindir; konteyner kabuğu için geçerli değil.
/* eslint-disable no-restricted-syntax */
import * as THREE from 'three';
import { SCENE } from '@/lib/config/scene-config';

const WALL_GAP_CM = 0.5;
const INNER_METALNESS = 0.1;
const INNER_ROUGHNESS = 0.8;

interface ContainerBodyProps {
  width: number;
  height: number;
  length: number;
}

// Origin = sol-alt-arka. Konteyner x∈[0,width], y∈[0,height], z∈[0,length].
// BackSide-only render: kameraya yakın yüzler atlanır, uzak iç duvarlar çizilir → doğal "X-ray".
// Konteynerin dış silueti ContainerEdges (wireframe) tarafından korunur.
export function ContainerBody({ width, height, length }: ContainerBodyProps) {
  const innerW = width - 2 * WALL_GAP_CM;
  const innerH = height - 2 * WALL_GAP_CM;
  const innerL = length - 2 * WALL_GAP_CM;

  return (
    <mesh position={[width / 2, height / 2, length / 2]} receiveShadow>
      <boxGeometry args={[innerW, innerH, innerL]} />
      <meshStandardMaterial
        color={SCENE.COLORS.CONTAINER_INSIDE}
        side={THREE.BackSide}
        metalness={INNER_METALNESS}
        roughness={INNER_ROUGHNESS}
      />
    </mesh>
  );
}
