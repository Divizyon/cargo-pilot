import { useRef, useEffect, useMemo } from 'react';
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
  const edgeMeshRef = useRef<THREE.InstancedMesh>(null);
  const placements = usePlanStore((s) => s.placements);

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => () => { edgesGeo.dispose(); }, [edgesGeo]);

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
      meshRef.current!.setColorAt(
        i,
        p.isViolation
          ? color.setHex(COLOR_VIOLATION)
          : p.color
            ? color.set(p.color)
            : color.setHex(COLOR_NORMAL),
      );

      edgeMeshRef.current?.setMatrixAt(i, matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (edgeMeshRef.current) {
      edgeMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [placements]);

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, placements.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>
      {/* Edge overlay — uses LineSegments geometry per instance via separate instanced mesh trick */}
      <instancedMesh
        ref={edgeMeshRef}
        args={[edgesGeo, undefined, placements.length]}
      >
        <lineBasicMaterial color="#000000" />
      </instancedMesh>
    </>
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
            color={p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)}
            itemId={p.itemId}
          />
        ))}
      </>
    );
  }

  return <InstancedBoxes />;
}
