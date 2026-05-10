// BoxWrapper kuralı kargo kutuları içindir; konteyner kabuğu için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const WALL_GAP_CM = 0.5;

// Texture repeat per 100 cm (1 m). Adjusted per container dimension at render time.
const TEXTURE_REPEAT_PER_100CM = 1;

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

  const textures = useTexture({
    map: '/textures/container/metal_0023_color_2k.jpg',
    normalMap: '/textures/container/metal_0023_normal_opengl_2k.png',
    roughnessMap: '/textures/container/metal_0023_roughness_2k.jpg',
    aoMap: '/textures/container/metal_0023_ao_2k.jpg',
  });

  // repeatX based on width, repeatY based on height — keeps texels consistent across sizes.
  const repeatX = useMemo(() => (innerW / 100) * TEXTURE_REPEAT_PER_100CM, [innerW]);
  const repeatY = useMemo(() => (innerH / 100) * TEXTURE_REPEAT_PER_100CM, [innerH]);

  useMemo(() => {
    for (const tex of Object.values(textures)) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      tex.needsUpdate = true;
    }
  }, [textures, repeatX, repeatY]);

  return (
    <mesh position={[width / 2, height / 2, length / 2]} receiveShadow>
      <boxGeometry args={[innerW, innerH, innerL]} />
      <meshStandardMaterial
        {...textures}
        side={THREE.BackSide}
        metalness={0.3}
        roughness={0.7}
        aoMapIntensity={0.8}
        normalScale={new THREE.Vector2(0.6, 0.6)}
      />
    </mesh>
  );
}
