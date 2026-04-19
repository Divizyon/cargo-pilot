import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';

const INSTANCED_THRESHOLD = 50;
const COLOR_VIOLATION = 0xdc2626;
const COLOR_NORMAL = 0x2563eb;
const COLOR_SELECTED = 0xf97316;

interface CargoMeshInstancedProps {
  planId: string;
}

function InstancedBoxes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const placements = usePlanStore((s) => s.placements);
  const selectedBoxId = useSceneStore((s) => s.selectedBoxId);

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

      const isSelected = p.itemId === selectedBoxId;
      const hex = isSelected ? COLOR_SELECTED : p.isViolation ? COLOR_VIOLATION : COLOR_NORMAL;
      meshRef.current!.setColorAt(i, color.set(hex));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [placements, selectedBoxId]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, placements.length]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) {
          const placement = placements[e.instanceId];
          if (placement) {
            useSceneStore.getState().setSelectedBoxId(placement.itemId);
          }
        }
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={0.85} />
    </instancedMesh>
  );
}

export function CargoMeshInstanced({ planId: _planId }: CargoMeshInstancedProps) {
  const placements = usePlanStore((s) => s.placements);
  const selectedBoxId = useSceneStore((s) => s.selectedBoxId);

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
            color={p.isViolation ? '#DC2626' : '#2563EB'}
            itemId={p.itemId}
            isSelected={p.itemId === selectedBoxId}
          />
        ))}
      </>
    );
  }

  return <InstancedBoxes />;
}
