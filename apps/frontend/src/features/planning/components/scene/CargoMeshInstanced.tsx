import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { BoxWrapper } from '@/components/shared/BoxWrapper';
import { LandingWireframe } from '@/components/shared/LandingWireframe';
import { SCENE } from '@/lib/config/scene-config';
import { applyOrientationQuaternion, rotatedDimensions } from '@/lib/utils/boxOrientations';
import { isGhosted, isPlacementVisible } from '@/lib/utils/sceneFilter';
import { useLandingAnimation } from '@/features/planning/components/scene/useLandingAnimation';
import { useLoadingAnimation } from '@/features/planning/components/scene/useLoadingAnimation';
import { buildLoadOrder } from '@/lib/utils/loadOrder';
import { buildBoxLabel } from '@/lib/utils/buildBoxLabel';
import { buildAtlasTexture } from '@/lib/utils/buildAtlasTexture';
import type { AtlasResult } from '@/lib/utils/buildAtlasTexture';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

// ─── Atlas label ShaderMaterial ────────────────────────────────────────────────
// Per-instance UV offset via InstancedBufferAttribute (aUvOffset, aCellSize)

// ShaderMaterial (non-raw) kullanıyoruz — Three.js built-in uniform'lar (projectionMatrix,
// modelViewMatrix, instanceMatrix) otomatik inject edilir, GLSL1 ile uyumlu.
const LABEL_VERT = /* glsl */ `
  attribute vec2 aUvOffset;
  attribute float aCellSize;
  varying vec2 vUv;
  void main() {
    vUv = vec2(aUvOffset.x + uv.x * aCellSize, aUvOffset.y + uv.y * aCellSize);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const LABEL_FRAG = /* glsl */ `
  uniform sampler2D uAtlas;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uAtlas, vUv);
  }
`;

function buildLabelMaterial(atlas: AtlasResult): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: LABEL_VERT,
    fragmentShader: LABEL_FRAG,
    uniforms: { uAtlas: { value: atlas.texture } },
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

// 6 yüz: instanceIdx % 6 → yüz indeksi
// Her yüz için merkez-offset yönü ve plane rotasyonu
// offset: birim-küp yüzünden merkeze olan yön (scale ile çarpılacak)
// rotEuler: plane'in o yüze bakması için Euler açısı
const FACE_CONFIGS = [
  // +Z (kapı/ön)
  { ox: 0, oy: 0, oz: 1, rx: 0, ry: 0 },
  // -Z (arka)
  { ox: 0, oy: 0, oz: -1, rx: 0, ry: Math.PI },
  // +X (sağ)
  { ox: 1, oy: 0, oz: 0, rx: 0, ry: Math.PI / 2 },
  // -X (sol)
  { ox: -1, oy: 0, oz: 0, rx: 0, ry: -Math.PI / 2 },
  // +Y (üst)
  { ox: 0, oy: 1, oz: 0, rx: -Math.PI / 2, ry: 0 },
  // -Y (alt)
  { ox: 0, oy: -1, oz: 0, rx: Math.PI / 2, ry: 0 },
] as const;

const FACE_COUNT = FACE_CONFIGS.length;

const INSTANCED_THRESHOLD = SCENE.INSTANCED_THRESHOLD;
const COLOR_VIOLATION = new THREE.Color(SCENE.COLORS.VIOLATION);
const COLOR_NORMAL = new THREE.Color(SCENE.COLORS.NORMAL);
const COLOR_FOCUS = new THREE.Color(SCENE.COLORS.SELECTED); // amber — grup içi parlama
const COLOR_DIM_TARGET = new THREE.Color(0x444444); // grup dışı sönük taban
const SCALE_ZERO = new THREE.Vector3(0, 0, 0);

// Pre-allocated axis vectors for cylinder orientation (reused across frames)
const _CYL_AXIS_X = new THREE.Vector3(1, 0, 0);
const _CYL_AXIS_Z = new THREE.Vector3(0, 0, 1);

// Determine cylinder's long axis from placed bounding-box dimensions and set
// the appropriate quaternion + scale values.
// cylinderGeometry has its height axis along local Y (radius 0.5, height 1).
// When the barrel lies along X: rotate -90° around Z so local Y → world X.
// When the barrel lies along Z: rotate +90° around X so local Y → world Z.
function applyVarilOrientation(
  p: { width: number; height: number; depth: number },
  quaternion: THREE.Quaternion,
): { sw: number; sh: number; sd: number } {
  if (p.width > p.height && p.width > p.depth) {
    quaternion.setFromAxisAngle(_CYL_AXIS_Z, -Math.PI / 2);
    const d = Math.min(p.height, p.depth);
    return { sw: d, sh: p.width, sd: d };
  }
  if (p.depth > p.height && p.depth > p.width) {
    quaternion.setFromAxisAngle(_CYL_AXIS_X, Math.PI / 2);
    const d = Math.min(p.width, p.height);
    return { sw: d, sh: p.depth, sd: d };
  }
  // standing upright
  quaternion.identity();
  const d = Math.min(p.width, p.depth);
  return { sw: d, sh: p.height, sd: d };
}

// Unit cube edges centered at origin, 12 edges × 2 endpoints each
const UNIT_EDGES: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [-0.5, -0.5, -0.5, 0.5, -0.5, -0.5],
  [0.5, -0.5, -0.5, 0.5, -0.5, 0.5],
  [0.5, -0.5, 0.5, -0.5, -0.5, 0.5],
  [-0.5, -0.5, 0.5, -0.5, -0.5, -0.5],
  [-0.5, 0.5, -0.5, 0.5, 0.5, -0.5],
  [0.5, 0.5, -0.5, 0.5, 0.5, 0.5],
  [0.5, 0.5, 0.5, -0.5, 0.5, 0.5],
  [-0.5, 0.5, 0.5, -0.5, 0.5, -0.5],
  [-0.5, -0.5, -0.5, -0.5, 0.5, -0.5],
  [0.5, -0.5, -0.5, 0.5, 0.5, -0.5],
  [0.5, -0.5, 0.5, 0.5, 0.5, 0.5],
  [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5],
] as const;

function buildEdgesGeometry(
  placements: PlacementWithDimensions[],
  opts: {
    selectedInstanceId: number | null;
    selectedItemId: string | null;
    hiddenItemIds: string[];
    activeLayer: number;
    focusedGroupItemIds: string[] | null;
  },
): THREE.BufferGeometry {
  const { selectedInstanceId, selectedItemId, hiddenItemIds, activeLayer, focusedGroupItemIds } =
    opts;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const point = new THREE.Vector3();
  const positions: number[] = [];

  placements.forEach((p, i) => {
    // Palet kendi BoxWrapper'ı içinde kenar çizgileri çizer
    if (p.productType === 'palet') return;
    const visible = isPlacementVisible(p, i, { selectedInstanceId, selectedItemId, hiddenItemIds });
    const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
    if (!visible || ghosted) return;

    const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
    applyOrientationQuaternion(quaternion, p.orientationIndex);
    position.set(p.positionX + p.width / 2, p.positionY + p.height / 2, p.positionZ + p.depth / 2);
    scale.set(base.width, base.height, base.depth);
    matrix.compose(position, quaternion, scale);

    for (const [x1, y1, z1, x2, y2, z2] of UNIT_EDGES) {
      point.set(x1, y1, z1).applyMatrix4(matrix);
      positions.push(point.x, point.y, point.z);
      point.set(x2, y2, z2).applyMatrix4(matrix);
      positions.push(point.x, point.y, point.z);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

interface CargoMeshInstancedProps {
  planId: string;
}

// ─── InstancedBoxes ────────────────────────────────────────────────────────────

function InstancedBoxes() {
  // Box (koli/palet) refs
  const opaqueRef = useRef<THREE.InstancedMesh>(null);
  const ghostWireRef = useRef<THREE.InstancedMesh>(null);
  const violationRef = useRef<THREE.InstancedMesh>(null);
  // Cylinder (varil) refs
  const opaqueCylRef = useRef<THREE.InstancedMesh>(null);
  const ghostWireCylRef = useRef<THREE.InstancedMesh>(null);
  const violationCylRef = useRef<THREE.InstancedMesh>(null);

  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);
  const clearPreview = usePlanStore((s) => s.clearPreview);
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  const handleAllSettled = useCallback(() => {
    clearPreview();
  }, [clearPreview]);

  const landingMeshRefs = useLandingAnimation(
    previewPlacements,
    rawPlacements.length,
    handleAllSettled,
  );

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );

  // Varil / box / palet index mapping: globalIdx ↔ per-geometry instanceIdx
  // boxIndices[instanceIdx] = globalIdx, cylIndices[instanceIdx] = globalIdx
  // paletIndices: globalIdx listesi (InstancedMesh yerine BoxWrapper ile render edilir)
  const { boxIndices, cylIndices, paletIndices } = useMemo(() => {
    const box: number[] = [];
    const cyl: number[] = [];
    const pal: number[] = [];
    placements.forEach((p, i) => {
      if (p.productType === 'varil') cyl.push(i);
      else if (p.productType === 'palet') pal.push(i);
      else box.push(i);
    });
    return { boxIndices: box, cylIndices: cyl, paletIndices: pal };
  }, [placements]);

  const selectedItemId = useSceneStore((s) => s.selectedItemId);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const hiddenItemIds = useSceneStore((s) => s.hiddenItemIds);
  const activeLayer = useSceneStore((s) => s.activeLayer);
  const xRayMode = useSceneStore((s) => s.xRayMode);
  const focusedGroupItemIds = useSceneStore((s) => s.focusedGroupItemIds);
  const animationMode = useSceneStore((s) => s.animationMode);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);
  // Animasyon için: globalIdx → geçerli pozisyon (cm, merkez)
  // Animasyon aktif değilken placements'tan hedef pozisyon kullanılır
  const animPositionsRef = useRef<Map<number, THREE.Vector3>>(new Map());

  // Animasyon için yükleme sırası (arka→ön, alt→üst, sol→sağ)
  const loadOrder = useMemo(() => buildLoadOrder(placements), [placements]);

  const isAnimActive = animationMode === 'playing' || animationMode === 'stepped';

  // Label atlas — box instance'ları için (palet/varil hariç)
  const labelPlaneRef = useRef<THREE.InstancedMesh>(null);

  // globalIdx → atlasIdx (palet/varil hariç)
  const atlasIndexMap = useMemo<Map<number, number>>(() => {
    const map = new Map<number, number>();
    let atlasIdx = 0;
    loadOrder.forEach((globalIdx) => {
      const p = placements[globalIdx];
      if (!p || p.productType === 'palet' || p.productType === 'varil') return;
      map.set(globalIdx, atlasIdx++);
    });
    return map;
  }, [placements, loadOrder]);

  const atlas = useMemo<AtlasResult | null>(() => {
    const itemSkuMap = new Map(selectedItems.map(({ item }) => [item.id, item.sku]));
    const instanceCounter = new Map<string, number>();
    const entries: { sku: string; seqNo: number; instanceNo: number; bgColor: string }[] = [];
    loadOrder.forEach((globalIdx, seqIdx) => {
      const p = placements[globalIdx];
      if (!p || p.productType === 'palet' || p.productType === 'varil') return;
      const sku = itemSkuMap.get(p.itemId) ?? p.itemId.slice(0, 6);
      const instanceNo = (instanceCounter.get(p.itemId) ?? 0) + 1;
      instanceCounter.set(p.itemId, instanceNo);
      entries.push({
        sku,
        seqNo: seqIdx + 1,
        instanceNo,
        bgColor: p.color ?? SCENE.COLORS.NORMAL_STR,
      });
    });
    if (entries.length === 0) return null;
    return buildAtlasTexture(entries);
  }, [placements, loadOrder, selectedItems]);

  // ShaderMaterial + InstancedBufferAttribute'ları atlas değişince güncelle
  const labelMaterial = useMemo<THREE.ShaderMaterial | null>(() => {
    if (!atlas) return null;
    return buildLabelMaterial(atlas);
  }, [atlas]);

  // Plane geometry (1×1, UV 0..1) — box label'lar paylaşır
  const labelPlaneGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  // Box UV attributes
  useEffect(() => {
    if (!atlas || boxIndices.length === 0) return;

    const { uvOffsets, cellSize } = atlas;
    const boxCount = boxIndices.length;
    const total = boxCount * FACE_COUNT;

    const uvData = new Float32Array(total * 2);
    const cellSizeData = new Float32Array(total).fill(cellSize);

    for (let bi = 0; bi < boxCount; bi++) {
      const globalIdx = boxIndices[bi];
      const atlasIdx = atlasIndexMap.get(globalIdx) ?? -1;
      const u = atlasIdx >= 0 ? uvOffsets[atlasIdx * 2] : 0;
      const v = atlasIdx >= 0 ? uvOffsets[atlasIdx * 2 + 1] : 0;
      for (let f = 0; f < FACE_COUNT; f++) {
        uvData[(bi * FACE_COUNT + f) * 2] = u;
        uvData[(bi * FACE_COUNT + f) * 2 + 1] = v;
      }
    }

    const uvOffsetAttr = new THREE.InstancedBufferAttribute(uvData, 2);
    uvOffsetAttr.needsUpdate = true;
    const cellSizeAttr = new THREE.InstancedBufferAttribute(cellSizeData, 1);
    cellSizeAttr.needsUpdate = true;

    labelPlaneGeo.setAttribute('aUvOffset', uvOffsetAttr);
    labelPlaneGeo.setAttribute('aCellSize', cellSizeAttr);
  }, [atlas, atlasIndexMap, boxIndices, labelPlaneGeo]);

  useEffect(
    () => () => {
      atlas?.texture.dispose();
    },
    [atlas],
  );
  useEffect(
    () => () => {
      labelMaterial?.dispose();
    },
    [labelMaterial],
  );
  useEffect(
    () => () => {
      labelPlaneGeo.dispose();
    },
    [labelPlaneGeo],
  );

  // Palet kargo kutusu label texture'ları — globalIdx → CanvasTexture
  const paletLabelTextures = useMemo<Map<number, THREE.CanvasTexture>>(() => {
    const itemSkuMap = new Map(selectedItems.map(({ item }) => [item.id, item.sku]));
    const instanceCounter = new Map<string, number>();
    const map = new Map<number, THREE.CanvasTexture>();
    loadOrder.forEach((globalIdx, seqIdx) => {
      const p = placements[globalIdx];
      if (!p || p.productType !== 'palet') return;
      const sku = itemSkuMap.get(p.itemId) ?? p.itemId.slice(0, 6);
      const instanceNo = (instanceCounter.get(p.itemId) ?? 0) + 1;
      instanceCounter.set(p.itemId, instanceNo);
      map.set(
        globalIdx,
        buildBoxLabel(sku, seqIdx + 1, instanceNo, p.color ?? SCENE.COLORS.NORMAL_STR),
      );
    });
    return map;
  }, [placements, loadOrder, selectedItems]);

  useEffect(
    () => () => {
      paletLabelTextures.forEach((t) => t.dispose());
    },
    [paletLabelTextures],
  );

  // setPosition callback — useLoadingAnimation tarafından her frame'de çağrılır
  const setAnimPosition = useCallback((globalIdx: number, x: number, y: number, z: number) => {
    let v = animPositionsRef.current.get(globalIdx);
    if (!v) {
      v = new THREE.Vector3();
      animPositionsRef.current.set(globalIdx, v);
    }
    v.set(x, y, z);
  }, []);

  // Label plane matrix helper — her box için 6 yüze plane yazar
  // instanceIdx = boxInstanceIdx * FACE_COUNT + faceIdx
  const writeLabelPlaneMatrices = useCallback(
    (
      matrix: THREE.Matrix4,
      position: THREE.Vector3,
      scale: THREE.Vector3,
      quaternion: THREE.Quaternion,
      isStepped: boolean,
      currentAnimStep: number,
    ) => {
      if (!labelPlaneRef.current || !atlas) return;

      const faceQuat = new THREE.Quaternion();
      const boxQuat = new THREE.Quaternion();
      const faceEuler = new THREE.Euler();
      const offset = new THREE.Vector3();

      boxIndices.forEach((globalIdx, boxInstanceIdx) => {
        const baseInstanceIdx = boxInstanceIdx * FACE_COUNT;
        const p = placements[globalIdx];

        const hide = () => {
          scale.copy(SCALE_ZERO);
          matrix.compose(position, quaternion, scale);
          for (let f = 0; f < FACE_COUNT; f++) {
            labelPlaneRef.current!.setMatrixAt(baseInstanceIdx + f, matrix);
          }
        };

        if (!p || p.productType === 'palet' || p.productType === 'varil') {
          hide();
          return;
        }

        const atlasIdx = atlasIndexMap.get(globalIdx) ?? -1;
        if (atlasIdx < 0 || atlasIdx * 2 + 1 >= atlas.uvOffsets.length) {
          hide();
          return;
        }

        const seqIdx = loadOrder.indexOf(globalIdx);
        if (isStepped && seqIdx >= currentAnimStep) {
          hide();
          return;
        }

        const animPos = animPositionsRef.current.get(globalIdx);
        const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
        applyOrientationQuaternion(boxQuat, p.orientationIndex);

        let cx: number, cy: number, cz: number;
        if (animPos) {
          cx = animPos.x;
          cy = animPos.y;
          cz = animPos.z;
        } else {
          cx = p.positionX + p.width / 2;
          cy = p.positionY + p.height / 2;
          cz = p.positionZ + p.depth / 2;
        }

        const eps = 0.5; // z-fighting önleme (cm)
        const hw = base.width / 2 + eps;
        const hh = base.height / 2 + eps;
        const hd = base.depth / 2 + eps;

        // Her 6 yüz için ayrı matrix yaz
        FACE_CONFIGS.forEach((face, faceIdx) => {
          faceEuler.set(face.rx, face.ry, 0);
          faceQuat.setFromEuler(faceEuler);
          quaternion.multiplyQuaternions(boxQuat, faceQuat);

          // Yüz offset: kutunun yarı-boyutları ile face yönü çarpımı
          offset.set(face.ox * hw, face.oy * hh, face.oz * hd);
          // Box orientasyonu uygulanmış offset
          offset.applyQuaternion(boxQuat);

          position.set(cx + offset.x, cy + offset.y, cz + offset.z);

          // Plane scale: yüze göre boyut
          // +Z/-Z: width × height  |  +X/-X: depth × height  |  +Y/-Y: width × depth
          if (face.oz !== 0) scale.set(base.width, base.height, 1);
          else if (face.ox !== 0) scale.set(base.depth, base.height, 1);
          else scale.set(base.width, base.depth, 1);

          matrix.compose(position, quaternion, scale);
          labelPlaneRef.current!.setMatrixAt(baseInstanceIdx + faceIdx, matrix);
        });
      });
    },
    [placements, boxIndices, loadOrder, atlasIndexMap, atlas],
  );

  // onFrameUpdate — animasyon her frame bittikten sonra InstancedMesh matrislerini güncelle
  const onFrameUpdate = useCallback(() => {
    if (
      !opaqueRef.current ||
      !ghostWireRef.current ||
      !violationRef.current ||
      !opaqueCylRef.current ||
      !ghostWireCylRef.current ||
      !violationCylRef.current
    )
      return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    const currentAnimMode = useSceneStore.getState().animationMode;
    const currentAnimStep = useSceneStore.getState().animationStep;
    const isPlaying = currentAnimMode === 'playing';
    const isStepped = currentAnimMode === 'stepped';

    function writeAnimInstance(globalIdx: number, instanceIdx: number, isVaril: boolean) {
      const p = placements[globalIdx];
      if (!p) return;

      const oRef = isVaril ? opaqueCylRef : opaqueRef;
      const gRef = isVaril ? ghostWireCylRef : ghostWireRef;
      const vRef = isVaril ? violationCylRef : violationRef;

      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
      let sw: number, sh: number, sd: number;
      if (isVaril) {
        ({ sw, sh, sd } = applyVarilOrientation(p, quaternion));
      } else {
        applyOrientationQuaternion(quaternion, p.orientationIndex);
        sw = base.width;
        sh = base.height;
        sd = base.depth;
      }

      // stepped: sadece animationStep'e kadar olanlar görünür
      const seqIdx = loadOrder.indexOf(globalIdx);
      const visibleInStep = isStepped ? seqIdx < currentAnimStep : true;
      const visibleInPlay = isPlaying; // playing modda hook pozisyon set ettiğinde görünür

      const show = visibleInStep || visibleInPlay;

      if (show) {
        const animPos = animPositionsRef.current.get(globalIdx);
        if (animPos) {
          position.copy(animPos);
        } else {
          position.set(
            p.positionX + p.width / 2,
            p.positionY + p.height / 2,
            p.positionZ + p.depth / 2,
          );
        }
        scale.set(sw, sh, sd);
      } else {
        position.set(
          p.positionX + p.width / 2,
          p.positionY + p.height / 2,
          p.positionZ + p.depth / 2,
        );
        scale.copy(SCALE_ZERO);
      }

      matrix.compose(position, quaternion, scale);
      oRef.current!.setMatrixAt(instanceIdx, matrix);

      // Ghost ve violation her zaman gizli animasyon sırasında
      scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      gRef.current!.setMatrixAt(instanceIdx, matrix);
      vRef.current!.setMatrixAt(instanceIdx, matrix);

      color.copy(p.isViolation ? COLOR_VIOLATION : p.color ? color.set(p.color) : COLOR_NORMAL);
      oRef.current!.setColorAt(instanceIdx, color);
    }

    boxIndices.forEach((globalIdx, instanceIdx) =>
      writeAnimInstance(globalIdx, instanceIdx, false),
    );
    cylIndices.forEach((globalIdx, instanceIdx) => writeAnimInstance(globalIdx, instanceIdx, true));

    for (const ref of [
      opaqueRef,
      ghostWireRef,
      violationRef,
      opaqueCylRef,
      ghostWireCylRef,
      violationCylRef,
    ]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }
    if (opaqueRef.current?.instanceColor) opaqueRef.current.instanceColor.needsUpdate = true;
    if (opaqueCylRef.current?.instanceColor) opaqueCylRef.current.instanceColor.needsUpdate = true;

    // Label plane matrislerini opaque box'lardan türet
    if (labelPlaneRef.current && atlas) {
      writeLabelPlaneMatrices(matrix, position, scale, quaternion, isStepped, currentAnimStep);
      labelPlaneRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [placements, boxIndices, cylIndices, loadOrder, atlas, writeLabelPlaneMatrices]);

  useLoadingAnimation(placements, loadOrder, setAnimPosition, onFrameUpdate, vehicle?.length);

  // Animasyon idle'a döndüğünde pozisyon cache'ini temizle
  useEffect(() => {
    if (animationMode === 'idle') {
      animPositionsRef.current.clear();
    }
  }, [animationMode]);

  useEffect(() => {
    for (const ref of [
      opaqueRef,
      ghostWireRef,
      violationRef,
      opaqueCylRef,
      ghostWireCylRef,
      violationCylRef,
      labelPlaneRef,
    ]) {
      if (ref.current) {
        ref.current.frustumCulled = false;
        ref.current.matrixAutoUpdate = false;
      }
    }
  }, []);

  useEffect(() => {
    // Animasyon aktifken useFrame içindeki onFrameUpdate matris yazıyor — çift yazımı önle
    if (isAnimActive) return;

    if (
      !opaqueRef.current ||
      !ghostWireRef.current ||
      !violationRef.current ||
      !opaqueCylRef.current ||
      !ghostWireCylRef.current ||
      !violationCylRef.current
    )
      return;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();

    function writeInstance(globalIdx: number, instanceIdx: number, isVaril: boolean) {
      const p = placements[globalIdx];
      const visible = isPlacementVisible(p, globalIdx, {
        selectedInstanceId,
        selectedItemId,
        hiddenItemIds,
      });
      const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);

      const base = rotatedDimensions(p.width, p.height, p.depth, p.orientationIndex);
      let sw: number, sh: number, sd: number;
      if (isVaril) {
        ({ sw, sh, sd } = applyVarilOrientation(p, quaternion));
      } else {
        applyOrientationQuaternion(quaternion, p.orientationIndex);
        sw = base.width;
        sh = base.height;
        sd = base.depth;
      }
      position.set(
        p.positionX + p.width / 2,
        p.positionY + p.height / 2,
        p.positionZ + p.depth / 2,
      );

      const oRef = isVaril ? opaqueCylRef : opaqueRef;
      const gRef = isVaril ? ghostWireCylRef : ghostWireRef;
      const vRef = isVaril ? violationCylRef : violationRef;

      if (visible && !ghosted) scale.set(sw, sh, sd);
      else scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      oRef.current!.setMatrixAt(instanceIdx, matrix);

      if (visible && ghosted) scale.set(sw, sh, sd);
      else scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      gRef.current!.setMatrixAt(instanceIdx, matrix);

      if (xRayMode && p.isViolation && visible) scale.set(sw, sh, sd);
      else scale.copy(SCALE_ZERO);
      matrix.compose(position, quaternion, scale);
      vRef.current!.setMatrixAt(instanceIdx, matrix);

      if (p.isViolation) {
        color.copy(COLOR_VIOLATION);
      } else if (focusedGroupItemIds !== null && focusedGroupItemIds.includes(p.itemId)) {
        color.copy(COLOR_FOCUS);
      } else if (focusedGroupItemIds !== null) {
        color.set(p.color ?? SCENE.COLORS.NORMAL_STR);
        color.lerp(COLOR_DIM_TARGET, 0.5);
      } else {
        color.set(p.color ?? SCENE.COLORS.NORMAL_STR);
      }
      oRef.current!.setColorAt(instanceIdx, color);
    }

    boxIndices.forEach((globalIdx, instanceIdx) => writeInstance(globalIdx, instanceIdx, false));
    cylIndices.forEach((globalIdx, instanceIdx) => writeInstance(globalIdx, instanceIdx, true));

    for (const ref of [
      opaqueRef,
      ghostWireRef,
      violationRef,
      opaqueCylRef,
      ghostWireCylRef,
      violationCylRef,
    ]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }
    if (opaqueRef.current?.instanceColor) opaqueRef.current.instanceColor.needsUpdate = true;
    if (opaqueCylRef.current?.instanceColor) opaqueCylRef.current.instanceColor.needsUpdate = true;
  }, [
    isAnimActive,
    placements,
    boxIndices,
    cylIndices,
    selectedItemId,
    selectedInstanceId,
    hiddenItemIds,
    activeLayer,
    xRayMode,
    focusedGroupItemIds,
  ]);

  // Label plane matrislerini idle'da veya atlas/placements değişince güncelle
  // Ayrı effect: labelPlaneRef conditional JSX'ten mount olduğu için idle effect'i kaçırabilir
  useEffect(() => {
    if (isAnimActive) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    if (labelPlaneRef.current && atlas) {
      writeLabelPlaneMatrices(matrix, position, scale, quaternion, false, 0);
      labelPlaneRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [isAnimActive, atlas, placements, writeLabelPlaneMatrices]);

  // Build edge lineSegments geometry for all visible non-ghosted boxes.
  // InstancedMesh cannot render EdgesGeometry (line primitives), so we build
  // a single lineSegments with all box edges pre-transformed in world space.
  const edgesLineGeo = useMemo(() => {
    return buildEdgesGeometry(placements, {
      selectedInstanceId,
      selectedItemId,
      hiddenItemIds,
      activeLayer,
      focusedGroupItemIds,
    });
  }, [
    placements,
    selectedInstanceId,
    selectedItemId,
    hiddenItemIds,
    activeLayer,
    focusedGroupItemIds,
  ]);

  useEffect(() => () => edgesLineGeo.dispose(), [edgesLineGeo]);

  // Palet seçimini kendi BoxWrapper render döngüsü yönetir
  const selectedPlacements = useMemo(
    () =>
      placements
        .map((p, idx) => ({ p, idx }))
        .filter(
          ({ p, idx }) =>
            p.productType !== 'palet' &&
            ((selectedInstanceId !== null && idx === selectedInstanceId) ||
              (selectedInstanceId === null && p.itemId === selectedItemId)),
        ),
    [placements, selectedItemId, selectedInstanceId],
  );

  return (
    <>
      {/* ── Box (koli/palet) InstancedMesh'ler ── */}
      <instancedMesh
        key={`opaque-${placements.length}`}
        ref={opaqueRef}
        args={[undefined, undefined, Math.max(1, boxIndices.length)]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const iid = e.instanceId;
          if (iid === undefined) return;
          const globalIdx = boxIndices[iid];
          if (globalIdx === undefined) return;
          setSelectedItemId(null);
          setSelectedInstanceId(selectedInstanceId === globalIdx ? null : globalIdx);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>

      <instancedMesh
        key={`ghost-${placements.length}`}
        ref={ghostWireRef}
        args={[undefined, undefined, Math.max(1, boxIndices.length)]}
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

      <instancedMesh
        key={`violation-${placements.length}`}
        ref={violationRef}
        args={[undefined, undefined, Math.max(1, boxIndices.length)]}
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

      {/* ── Cylinder (varil) InstancedMesh'ler ── */}
      <instancedMesh
        key={`opaque-cyl-${placements.length}`}
        ref={opaqueCylRef}
        args={[undefined, undefined, Math.max(1, cylIndices.length)]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const iid = e.instanceId;
          if (iid === undefined) return;
          const globalIdx = cylIndices[iid];
          if (globalIdx === undefined) return;
          setSelectedItemId(null);
          setSelectedInstanceId(selectedInstanceId === globalIdx ? null : globalIdx);
        }}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshStandardMaterial transparent opacity={0.85} />
      </instancedMesh>

      <instancedMesh
        key={`ghost-cyl-${placements.length}`}
        ref={ghostWireCylRef}
        args={[undefined, undefined, Math.max(1, cylIndices.length)]}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        key={`violation-cyl-${placements.length}`}
        ref={violationCylRef}
        args={[undefined, undefined, Math.max(1, cylIndices.length)]}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshBasicMaterial
          color={SCENE.COLORS.VIOLATION}
          wireframe
          depthTest={false}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* Edge lines — animasyon sırasında gizle, kutular hareket ederken statik durmasın */}
      <lineSegments geometry={edgesLineGeo} visible={!isAnimActive}>
        <lineBasicMaterial color="#000000" />
      </lineSegments>

      {/* Landing wireframe — previewPlacements animasyon süresince */}
      {previewPlacements.map((p, idx) => {
        const key = `${p.itemId}-${idx}`;
        return (
          <LandingWireframe
            key={`landing-${key}`}
            placement={p}
            meshRefCallback={(node) => {
              if (node) {
                landingMeshRefs.current.set(key, node);
              } else {
                landingMeshRefs.current.delete(key);
              }
            }}
          />
        );
      })}

      {/* Palet items — InstancedMesh yerine ayrı BoxWrapper (tahtalı yapı için) */}
      {paletIndices.map((globalIdx) => {
        const p = placements[globalIdx];
        const visible = isPlacementVisible(p, globalIdx, {
          selectedInstanceId,
          selectedItemId,
          hiddenItemIds,
        });
        if (!visible) return null;
        const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);
        const isItemSelected =
          selectedInstanceId === globalIdx ||
          (selectedInstanceId === null && p.itemId === selectedItemId);
        return (
          <BoxWrapper
            key={`palet-${globalIdx}`}
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
            isSelected={isItemSelected}
            isGhosted={ghosted}
            productType={p.productType}
            labelTexture={ghosted ? null : (paletLabelTextures.get(globalIdx) ?? null)}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === globalIdx ? null : globalIdx);
            }}
          />
        );
      })}

      {/* Label planes — her box instance'ının 6 yüzüne atlas tile */}
      {atlas && labelMaterial && boxIndices.length > 0 && (
        <instancedMesh
          key={`label-${placements.length}`}
          ref={labelPlaneRef}
          args={[labelPlaneGeo, labelMaterial, Math.max(1, boxIndices.length * FACE_COUNT)]}
          frustumCulled={false}
          matrixAutoUpdate={false}
        />
      )}

      {/* Selected box — BoxWrapper ile glow */}
      {selectedPlacements.map(({ p, idx }) => {
        return (
          <BoxWrapper
            key={`glow-${idx}`}
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
            isSelected={true}
            productType={p.productType}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === idx ? null : idx);
            }}
          />
        );
      })}
    </>
  );
}

// ─── BoxPathBoxes ──────────────────────────────────────────────────────────────
// < INSTANCED_THRESHOLD senaryosu için BoxWrapper tabanlı render.
// BoxWrapper'da edge geo group pozisyonuna relatif olduğundan
// animasyonu position prop'larından geçirmek yeterli — ayrı wireframe gizleme gerekmez.

function BoxPathBoxes() {
  const rawPlacements = usePlanStore((s) => s.placements);
  const previewItemId = usePlanStore((s) => s.previewItemId);
  const previewPlacements = usePlanStore((s) => s.previewPlacements);
  const clearPreview = usePlanStore((s) => s.clearPreview);
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);

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
  const animationMode = useSceneStore((s) => s.animationMode);
  const setSelectedItemId = useSceneStore((s) => s.setSelectedItemId);
  const setSelectedInstanceId = useSceneStore((s) => s.setSelectedInstanceId);

  const handleAllSettled = useCallback(() => clearPreview(), [clearPreview]);
  const landingMeshRefs = useLandingAnimation(
    previewPlacements,
    rawPlacements.length,
    handleAllSettled,
  );

  const loadOrder = useMemo(() => buildLoadOrder(placements), [placements]);
  const isAnimActive = animationMode === 'playing' || animationMode === 'stepped';

  // Her placement için yükleme sıra no (1-based) ve aynı itemId içindeki instance no
  // globalIdx → { seqNo, instanceNo, sku } — varil hariç tüm tipler dahil
  const labelMap = useMemo(() => {
    const itemSkuMap = new Map(selectedItems.map(({ item }) => [item.id, item.sku]));
    const instanceCounter = new Map<string, number>();
    const result = new Map<number, { seqNo: number; instanceNo: number; sku: string }>();
    loadOrder.forEach((globalIdx, seqIdx) => {
      const p = placements[globalIdx];
      if (!p || p.productType === 'varil') return;
      const sku = itemSkuMap.get(p.itemId) ?? p.itemId.slice(0, 6);
      const instanceNo = (instanceCounter.get(p.itemId) ?? 0) + 1;
      instanceCounter.set(p.itemId, instanceNo);
      result.set(globalIdx, { seqNo: seqIdx + 1, instanceNo, sku });
    });
    return result;
  }, [placements, loadOrder, selectedItems]);

  // Label texture cache: globalIdx → CanvasTexture (varil için null, palet dahil)
  const labelTextures = useMemo(() => {
    const map = new Map<number, THREE.Texture>();
    placements.forEach((p, i) => {
      if (p.productType === 'varil') return;
      const info = labelMap.get(i);
      if (!info) return;
      const color = p.color ?? SCENE.COLORS.NORMAL_STR;
      map.set(i, buildBoxLabel(info.sku, info.seqNo, info.instanceNo, color));
    });
    return map;
  }, [placements, labelMap]);

  // Texture'ları dispose et
  useEffect(
    () => () => {
      labelTextures.forEach((t) => t.dispose());
    },
    [labelTextures],
  );

  // Animasyonlu pozisyon state: globalIdx → merkez koordinatları
  // useState olarak tutulur — render sırasında okunabilir (ref kuralı ihlali yok)
  const [animPositions, setAnimPositions] = useState<
    Map<number, { x: number; y: number; z: number }>
  >(() => new Map());

  const setAnimPosition = useCallback((globalIdx: number, x: number, y: number, z: number) => {
    setAnimPositions((prev) => {
      const next = new Map(prev);
      next.set(globalIdx, { x, y, z });
      return next;
    });
  }, []);

  const onFrameUpdate = useCallback(() => {
    // setAnimPosition zaten state update tetikliyor — ek forceUpdate gerekmez
  }, []);

  useLoadingAnimation(placements, loadOrder, setAnimPosition, onFrameUpdate, vehicle?.length);

  return (
    <>
      {placements.map((p, i) => {
        const isInstanceSelected = selectedInstanceId === i;
        const isItemSelected = p.itemId === selectedItemId;
        const ghosted = isGhosted(p, activeLayer, focusedGroupItemIds);

        // Animasyon aktifken stepped modda henüz gelmemiş kutuları gizle
        const seqIdx = isAnimActive ? loadOrder.indexOf(i) : -1;
        const hiddenByAnim =
          animationMode === 'stepped' &&
          seqIdx >= 0 &&
          seqIdx >= useSceneStore.getState().animationStep;

        // Animasyon pozisyonunu al (playing modunda hook tarafından set edilir)
        const animPos = isAnimActive ? animPositions.get(i) : undefined;

        // AnimPos merkez koordinatı — BoxWrapper bottom-left-rear bekliyor, ters çevir
        let px: number, py: number, pz: number;
        if (animPos) {
          px = animPos.x - p.width / 2;
          py = animPos.y - p.height / 2;
          pz = animPos.z - p.depth / 2;
        } else {
          px = p.positionX;
          py = p.positionY;
          pz = p.positionZ;
        }

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
            isHidden={hiddenItemIds.includes(p.itemId) || hiddenByAnim}
            isGhosted={ghosted}
            productType={p.productType}
            labelTexture={labelTextures.get(i) ?? null}
            onClick={() => {
              setSelectedItemId(null);
              setSelectedInstanceId(selectedInstanceId === i ? null : i);
            }}
          />
        );
      })}
      {/* Landing wireframe — < threshold yolu */}
      {previewPlacements.map((p, idx) => {
        const key = `${p.itemId}-${idx}`;
        return (
          <LandingWireframe
            key={`landing-${key}`}
            placement={p}
            meshRefCallback={(node) => {
              if (node) landingMeshRefs.current.set(key, node);
              else landingMeshRefs.current.delete(key);
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

  const placements = useMemo(
    () =>
      previewItemId
        ? [...rawPlacements.filter((p) => p.itemId !== previewItemId), ...previewPlacements]
        : rawPlacements,
    [rawPlacements, previewItemId, previewPlacements],
  );

  if (placements.length === 0) return null;
  if (placements.length < INSTANCED_THRESHOLD) return <BoxPathBoxes />;
  return <InstancedBoxes />;
}
