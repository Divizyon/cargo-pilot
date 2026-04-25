import { useMemo } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { SCENE } from '@/lib/config/scene-config';

function ContainerEdges({ width, height, length }: { width: number; height: number; length: number }) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, length);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, length]);

  return (
    <lineSegments
      geometry={edgesGeo}
      position={[width / 2, height / 2, length / 2]}
    >
      <lineBasicMaterial color={SCENE.COLORS.CONTAINER_EDGE} />
    </lineSegments>
  );
}

function ContainerGrid({ width, length }: { width: number; length: number }) {
  const geometry = useMemo(() => {
    const step = SCENE.GRID_STEP_CM;
    const points: number[] = [];

    for (let z = 0; z <= length; z += step) {
      points.push(0, 0, z, width, 0, z);
    }
    for (let x = 0; x <= width; x += step) {
      points.push(x, 0, 0, x, 0, length);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [width, length]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={SCENE.COLORS.GRID} opacity={0.45} transparent />
    </lineSegments>
  );
}

// Rear door indicator: colored quad on the Z=0 face (rear of container)
function DoorIndicator({ width, height }: { width: number; height: number }) {
  return (
    // eslint-disable-next-line no-restricted-syntax
    <mesh position={[width / 2, height / 2, 0]}>
      <planeGeometry args={[width * 0.9, height * 0.9]} />
      <meshBasicMaterial
        color={SCENE.COLORS.CONTAINER_DOOR}
        side={THREE.DoubleSide}
        transparent
        opacity={0.12}
      />
    </mesh>
  );
}

export function ContainerMesh() {
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  if (!vehicle) return null;

  // Coordinate system: X=width, Y=height, Z=length(depth)
  const { width, height, length } = vehicle;

  return (
    <group>
      <ContainerEdges width={width} height={height} length={length} />
      <ContainerGrid width={width} length={length} />
      <DoorIndicator width={width} height={height} />
    </group>
  );
}
