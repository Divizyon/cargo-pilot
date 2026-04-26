import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';
import { SCENE } from '@/lib/config/scene-config';

const INSTANCED_THRESHOLD = SCENE.INSTANCED_THRESHOLD;
const COLOR_VIOLATION = SCENE.COLORS.VIOLATION;
const COLOR_SELECTED = SCENE.COLORS.SELECTED;
const COLOR_NORMAL = SCENE.COLORS.NORMAL;

interface CargoMeshInstancedProps {
  planId: string;
}

function InstancedBoxes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgeMeshRef = useRef<THREE.InstancedMesh>(null);
  const placements = usePlanStore((s) => s.placements);
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);

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
      const isHidden = hiddenItemIds.includes(p.itemId);
      const isSelected = p.itemId === selectedItemId;

      const position = new THREE.Vector3(
        p.positionX + p.width / 2,
        p.positionY + p.height / 2,
        p.positionZ + p.depth / 2,
      );
      // Scale to 0 to hide — avoids destroying instance index order
      const scale = isHidden
        ? new THREE.Vector3(0, 0, 0)
        : new THREE.Vector3(p.width, p.height, p.depth);
      matrix.compose(position, quaternion, scale);

      meshRef.current!.setMatrixAt(i, matrix);
      meshRef.current!.setColorAt(
        i,
        isSelected
          ? color.setHex(COLOR_SELECTED)
          : p.isViolation
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
  }, [placements, selectedItemId, hiddenItemIds]);

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, placements.length]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId === undefined) return;
          const p = placements[instanceId];
          if (!p) return;
          setSelectedItemId(
            p.itemId === selectedItemId ? null : p.itemId,
          );
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>
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
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);

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
            isSelected={p.itemId === selectedItemId}
            isHidden={hiddenItemIds.includes(p.itemId)}
            onClick={(id) => setSelectedItemId(id === selectedItemId ? null : id)}
          />
        ))}
      </>
    );
  }

  return <InstancedBoxes />;
}
