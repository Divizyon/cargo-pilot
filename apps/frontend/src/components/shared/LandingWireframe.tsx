import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { SCENE } from '@/lib/config/scene-config';

const CYLINDER_SEGMENTS = 16;

interface LandingWireframeProps {
  placement: PlacementWithDimensions;
  meshRefCallback: (node: THREE.Mesh | null) => void;
}

// Inline import — R3F mesh tipi için THREE global
import * as THREE from 'three';

export function LandingWireframe({ placement: p, meshRefCallback }: LandingWireframeProps) {
  const color = p.isViolation ? SCENE.COLORS.VIOLATION_STR : SCENE.COLORS.SELECTED_STR;
  const isVaril = p.productType === 'varil';
  const radius = Math.min(p.width, p.depth) / 2;

  return (
    <mesh ref={meshRefCallback} castShadow={false}>
      {isVaril ? (
        <cylinderGeometry args={[radius, radius, p.height, CYLINDER_SEGMENTS]} />
      ) : (
        <boxGeometry args={[p.width, p.height, p.depth]} />
      )}
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.75}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
        depthWrite={false}
      />
    </mesh>
  );
}
