import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';
import { SCENE } from '@/lib/config/scene-config';
import { applyOrientationQuaternion, rotatedDimensions } from '@/lib/utils/boxOrientations';
import { useDragBox } from '@/features/planning/components/scene/useDragBox';
import type { DragState } from '@/features/planning/components/scene/useDragBox';

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
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

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

  // US-OPT-14: InstancedMesh tek bir draw call — frustum culling avantaj sağlamaz, ama
  // unit-cube bounding sphere yüzünden kamera off-axis olunca tüm sahne kaybolma riski var.
  // matrixAutoUpdate=false: root mesh statik, dünya matrisinin her frame yeniden hesaplanması gereksiz.
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.frustumCulled = false;
      meshRef.current.matrixAutoUpdate = false;
    }
    if (edgeMeshRef.current) {
      edgeMeshRef.current.frustumCulled = false;
      edgeMeshRef.current.matrixAutoUpdate = false;
    }
  }, []);

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

      // Drag sırasında live pozisyon kullan
      const px = dragState?.idx === i ? dragState.x : p.positionX;
      const py = dragState?.idx === i ? dragState.y : p.positionY;
      const pz = dragState?.idx === i ? dragState.z : p.positionZ;

      // Effective dims (rotated) zaten p.width/height/depth'te. Base'i türetip scale'e veriyoruz.
      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);

      position.set(px + p.width / 2, py + p.height / 2, pz + p.depth / 2);
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
  }, [placements, selectedItemId, selectedInstanceId, hiddenItemIds, dragState]);

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
          setSelectedItemId(null);
          setSelectedInstanceId(selectedInstanceId === instanceId ? null : instanceId);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId === undefined || !vehicle) return;
          setSelectedItemId(null);
          setSelectedInstanceId(instanceId);
          startDrag(instanceId, placements, vehicle, setDragState, e);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={edgeMeshRef} args={[edgesGeo, undefined, placements.length]}>
        <lineBasicMaterial color="#000000" />
      </instancedMesh>
      {selectedPlacements.map(({ p, idx }) => {
        const ds = dragState?.idx === idx ? dragState : null;
        const px = ds ? ds.x : p.positionX;
        const py = ds ? ds.y : p.positionY;
        const pz = ds ? ds.z : p.positionZ;
        return (
          <BoxWrapper
            key={`glow-${idx}`}
            width={p.width}
            height={p.height}
            depth={p.depth}
            positionX={px}
            positionY={py}
            positionZ={pz}
            color={p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)}
            itemId={p.itemId}
            isSelected={true}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === idx ? null : idx);
            }}
            onPointerDown={(e) => {
              if (!vehicle) return;
              startDrag(idx, placements, vehicle, setDragState, e);
            }}
          />
        );
      })}
    </>
  );
}

export function CargoMeshInstanced({ planId: _planId }: CargoMeshInstancedProps) {
  const placements = usePlanStore((s) => s.placements);
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

  if (placements.length === 0) return null;

  if (placements.length < INSTANCED_THRESHOLD) {
    return (
      <>
        {placements.map((p, i) => {
          const isInstanceSelected = selectedInstanceId === i;
          const isItemSelected = p.itemId === selectedItemId;
          const ds = dragState?.idx === i ? dragState : null;
          const px = ds ? ds.x : p.positionX;
          const py = ds ? ds.y : p.positionY;
          const pz = ds ? ds.z : p.positionZ;
          return (
            <BoxWrapper
              key={`${p.itemId}-${i}`}
              width={p.width}
              height={p.height}
              depth={p.depth}
              positionX={px}
              positionY={py}
              positionZ={pz}
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
              onPointerDown={(e) => {
                if (!vehicle) return;
                setSelectedItemId(null);
                setSelectedInstanceId(i);
                startDrag(i, placements, vehicle, setDragState, e);
              }}
            />
          );
        })}
      </>
    );
  }

  return <InstancedBoxes />;
}
