import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';
import { SCENE } from '@/lib/config/scene-config';
import { applyOrientationQuaternion, rotatedDimensions } from '@/lib/utils/boxOrientations';

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
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  useEffect(() => {
    if (!meshRef.current) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    placements.forEach((p, i) => {
      const isHidden = hiddenItemIds.includes(p.itemId);
      const isInstanceSelected = selectedInstanceId === i;
      const isItemSelected = p.itemId === selectedItemId;

      // Effective dims (rotated) zaten p.width/height/depth'te. Base'i türetip scale'e veriyoruz —
      // scale → rotate sıralamasında base dims rotate edilince effective bounding box çıkar.
      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);

      position.set(
        p.positionX + p.width / 2,
        p.positionY + p.height / 2,
        p.positionZ + p.depth / 2,
      );
      // Glow için seçili instance'ı InstancedMesh'ten gizle, BoxWrapper olarak ayrı render et.
      const visible = !isHidden && !isInstanceSelected && !isItemSelected;
      scale.set(visible ? base.width : 0, visible ? base.height : 0, visible ? base.depth : 0);
      applyOrientationQuaternion(quaternion, p.orientationIndex);
      matrix.compose(position, quaternion, scale);

      meshRef.current!.setMatrixAt(i, matrix);
      meshRef.current!.setColorAt(
        i,
        isInstanceSelected || isItemSelected
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
  }, [placements, selectedItemId, selectedInstanceId, hiddenItemIds]);

  const selectedPlacements = useMemo(
    () =>
      placements
        .map((p, idx) => ({ p, idx }))
        .filter(
          ({ p, idx }) =>
            (selectedInstanceId !== null && idx === selectedInstanceId) ||
            (selectedInstanceId === null && p.itemId === selectedItemId),
        ),
    [placements, selectedItemId, selectedInstanceId],
  );

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
          // Manuel müdahale instance bazlı; item-level highlight'ı temizliyoruz.
          setSelectedItemId(null);
          setSelectedInstanceId(selectedInstanceId === instanceId ? null : instanceId);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={edgeMeshRef} args={[edgesGeo, undefined, placements.length]}>
        <lineBasicMaterial color="#000000" />
      </instancedMesh>
      {selectedPlacements.map(({ p, idx }) => (
        <BoxWrapper
          key={`glow-${idx}`}
          width={p.width}
          height={p.height}
          depth={p.depth}
          positionX={p.positionX}
          positionY={p.positionY}
          positionZ={p.positionZ}
          color={p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)}
          itemId={p.itemId}
          isSelected={true}
          onClick={() => {
            setSelectedItemId(null);
            setSelectedInstanceId(selectedInstanceId === idx ? null : idx);
          }}
        />
      ))}
    </>
  );
}

export function CargoMeshInstanced({ planId: _planId }: CargoMeshInstancedProps) {
  const placements = usePlanStore((s) => s.placements);
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);

  if (placements.length === 0) return null;

  if (placements.length < INSTANCED_THRESHOLD) {
    return (
      <>
        {placements.map((p, i) => {
          const isInstanceSelected = selectedInstanceId === i;
          const isItemSelected = p.itemId === selectedItemId;
          return (
            <BoxWrapper
              key={`${p.itemId}-${i}`}
              width={p.width}
              height={p.height}
              depth={p.depth}
              positionX={p.positionX}
              positionY={p.positionY}
              positionZ={p.positionZ}
              color={
                p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)
              }
              itemId={p.itemId}
              isSelected={isInstanceSelected || isItemSelected}
              isHidden={hiddenItemIds.includes(p.itemId)}
              onClick={() => {
                setSelectedItemId(null);
                setSelectedInstanceId(selectedInstanceId === i ? null : i);
              }}
            />
          );
        })}
      </>
    );
  }

  return <InstancedBoxes />;
}
