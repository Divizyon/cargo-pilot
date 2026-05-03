import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';
import { SCENE } from '@/lib/config/scene-config';
import { applyOrientationQuaternion, rotatedDimensions } from '@/lib/utils/boxOrientations';
import { isGhosted, isPlacementVisible } from '@/lib/utils/sceneFilter';
import { useDragBox } from '@/features/planning/components/scene/useDragBox';
import type { DragState } from '@/features/planning/components/scene/useDragBox';

const INSTANCED_THRESHOLD = SCENE.INSTANCED_THRESHOLD;
const COLOR_VIOLATION = new THREE.Color(SCENE.COLORS.VIOLATION);
const COLOR_NORMAL = new THREE.Color(SCENE.COLORS.NORMAL);
const SCALE_ZERO = new THREE.Vector3(0, 0, 0);

interface CargoMeshInstancedProps {
  planId: string;
}

// ─── InstancedBoxes ────────────────────────────────────────────────────────────

function InstancedBoxes() {
  const opaqueRef = useRef<THREE.InstancedMesh>(null);
  const ghostWireRef = useRef<THREE.InstancedMesh>(null);
  const violationRef = useRef<THREE.InstancedMesh>(null);

  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const activeLayer = useSceneStore((s) => s.activeLayer);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  const { startDrag } = useDragBox();
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    for (const ref of [opaqueRef, ghostWireRef, violationRef]) {
      if (ref.current) {
        ref.current.frustumCulled = false;
        ref.current.matrixAutoUpdate = false;
      }
    }
  }, []);

  useEffect(() => {
    if (!opaqueRef.current || !ghostWireRef.current || !violationRef.current) return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    placements.forEach((p, i) => {
      const visible = isPlacementVisible(p, i, {
        selectedInstanceId,
        selectedItemId,
        hiddenItemIds,
      });
      const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);

      const px = dragState?.idx === i ? dragState.x : p.positionX;
      const py = dragState?.idx === i ? dragState.y : p.positionY;
      const pz = dragState?.idx === i ? dragState.z : p.positionZ;

      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
      position.set(px + p.width / 2, py + p.height / 2, pz + p.depth / 2);
      applyOrientationQuaternion(quaternion, p.orientationIndex);

      // Opaque mesh: visible ve ghost değil
      if (visible && !ghosted) {
        scale.set(base.width, base.height, base.depth);
      } else {
        scale.copy(SCALE_ZERO);
      }
      matrix.compose(position, quaternion, scale);
      opaqueRef.current!.setMatrixAt(i, matrix);

      // Ghost edge mesh: visible ve ghosted — sadece wireframe çizer, solid yok
      if (visible && ghosted) {
        scale.set(base.width, base.height, base.depth);
      } else {
        scale.copy(SCALE_ZERO);
      }
      matrix.compose(position, quaternion, scale);
      ghostWireRef.current!.setMatrixAt(i, matrix);

      // Violation wireframe: sadece xRayMode açıkken ihlal olan kutular
      if (xRayMode && p.isViolation && visible) {
        scale.set(base.width, base.height, base.depth);
      } else {
        scale.copy(SCALE_ZERO);
      }
      matrix.compose(position, quaternion, scale);
      violationRef.current!.setMatrixAt(i, matrix);

      // Renk (opaque mesh için)
      color.copy(p.isViolation ? COLOR_VIOLATION : p.color ? color.set(p.color) : COLOR_NORMAL);
      opaqueRef.current!.setColorAt(i, color);
    });

    opaqueRef.current.instanceMatrix.needsUpdate = true;
    ghostWireRef.current.instanceMatrix.needsUpdate = true;
    violationRef.current.instanceMatrix.needsUpdate = true;

    if (opaqueRef.current.instanceColor) opaqueRef.current.instanceColor.needsUpdate = true;
  }, [
    placements,
    selectedItemId,
    selectedInstanceId,
    hiddenItemIds,
    activeLayer,
    xRayMode,
    focusedGroupItemIds,
    dragState,
  ]);

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
      {/* Opaque mesh — normal görünür kutular */}
      <instancedMesh
        key={`opaque-${placements.length}`}
        ref={opaqueRef}
        args={[undefined, undefined, placements.length]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId === undefined) return;
          if (!placements[instanceId]) return;
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

      {/* Ghost wireframe mesh — grup dışı kutular sadece çerçeve olarak görünür */}
      <instancedMesh
        key={`ghost-${placements.length}`}
        ref={ghostWireRef}
        args={[undefined, undefined, placements.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Violation wireframe — xRayMode'da ihlaller her zaman görünür */}
      <instancedMesh
        key={`violation-${placements.length}`}
        ref={violationRef}
        args={[undefined, undefined, placements.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={SCENE.COLORS.VIOLATION}
          wireframe
          depthTest={false}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* Selected box — BoxWrapper ile glow */}
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
            color={
              p.isViolation ? SCENE.COLORS.VIOLATION_STR : (p.color ?? SCENE.COLORS.NORMAL_STR)
            }
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

// ─── CargoMeshInstanced ────────────────────────────────────────────────────────

export function CargoMeshInstanced({ planId: _planId }: CargoMeshInstancedProps) {
  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);
  const vehicle = usePlanStore((s) => s.selectedVehicle);

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );
  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const activeLayer = useSceneStore((s) => s.activeLayer);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
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
          const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
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
              isGhosted={ghosted}
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
