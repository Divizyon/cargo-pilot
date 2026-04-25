import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';

import { SCENE } from '@/lib/config/scene-config';

const INSTANCED_THRESHOLD = SCENE.INSTANCED_THRESHOLD;
const COLOR_VIOLATION = SCENE.COLORS.VIOLATION;
const COLOR_NORMAL = SCENE.COLORS.NORMAL;

interface CargoMeshInstancedProps {
  planId: string;
}

function InstancedBoxes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const placements = usePlanStore((s) => s.placements);

  useEffect(() => {
    if (!meshRef.current) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();

    placements.forEach((p, i) => {
      const position = new THREE.Vector3(
        p.positionX + p.width / 2,
        p.positionY + p.height / 2,
        p.positionZ + p.depth / 2,
      );
      const scale = new THREE.Vector3(p.width, p.height, p.depth);
      matrix.compose(position, quaternion, scale);
      meshRef.current!.setMatrixAt(i, matrix);
      meshRef.current!.setColorAt(i, color.set(p.isViolation ? COLOR_VIOLATION : COLOR_NORMAL));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [placements]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, placements.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={0.85} />
    </instancedMesh>
  );
}

export function CargoMeshInstanced({ planId: _planId }: CargoMeshInstancedProps) {
  const placements = usePlanStore((s) => s.placements);

  if (placements.length === 0) return null;

  if (placements.length < INSTANCED_THRESHOLD) {
    return (
      <>
        {placements.map((p, i) => (
          <BoxWrapper
            key={`${p.itemId}-${i}`}
            width={p.width}
            height={p.height}
            depth={p.depth}
            positionX={p.positionX}
            positionY={p.positionY}
            positionZ={p.positionZ}
            color={p.isViolation ? SCENE.COLORS.VIOLATION_STR : SCENE.COLORS.NORMAL_STR}
            itemId={p.itemId}
          />
        ))}
      </>
    );
  }

  return <InstancedBoxes />;
}
