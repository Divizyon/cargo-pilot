---
description: Squad 2 3D sahne kuralları — scene-config, koordinat/BoxWrapper, InstancedMesh, animasyon ve bellek yönetimi
alwaysApply: true
---

# Squad 2 — 3D Sahne Standartları

## scene-config.ts

Tüm sabitler `lib/config/scene-config.ts`'te — bileşene hardcoded değer yazılmaz.

> **Bu bölüm 2026-08-15'te gerçek dosyadan yeniden üretildi.** Önceki örnek uydurma değerler
> içeriyordu (`CAMERA_POSITION: [0,8,14]`, `ORBIT_MIN/MAX: 2/50`, `VIOLATION: 0xdc2626`) ve
> sahne birimi cm olduğu için tamamen yanlış ölçekteydi. Aşağısı `scene-config.ts`'in **kısaltılmış**
> özetidir; gerçek dosyada ~50 anahtar vardır — tek doğru kaynak dosyanın kendisidir.

```ts
// lib/config/scene-config.ts — kısaltılmış özet (birim: cm)
export const SCENE = {
  CAMERA_POSITION: [0, 300, 600] as const,
  CAMERA_FOV: 50,
  CAMERA_NEAR: 1,
  CAMERA_FAR: 20000,

  ORBIT_MIN_DISTANCE: 50,
  ORBIT_MAX_DISTANCE: 4000,
  ORBIT_MAX_POLAR_ANGLE: Math.PI / 2,
  ORBIT_AUTO_ROTATE_SPEED: 0.6,
  ORBIT_DAMPING_FACTOR: 0.05,

  LOAD_INTERVAL_MS: 380,
  DROP_EASING: 0.12,
  DROP_GLOW: 0.25,
  IDLE_GLOW: 0.06,

  AMBIENT_INTENSITY: 0.6,
  DIRECTIONAL_INTENSITY: 1,
  DIRECTIONAL_POSITION: [800, 1000, 500] as const,
  RIM_INTENSITY: 0.3,
  RIM_POSITION: [-600, 400, -500] as const,
  RIM_COLOR: 0x4488ff,

  BACKGROUND_COLOR: '#f3f4f6',
  CONTACT_SHADOW_OPACITY: 0.4,
  CONTACT_SHADOW_BLUR: 2.5,
  CONTACT_SHADOW_SCALE_FACTOR: 2,

  COLORS: {
    VIOLATION: 0xe11d48,        // + VIOLATION_STR
    SELECTED: 0xa7f3d0,         // + SELECTED_STR
    COG_NORMAL: 0xfbbf24,
    COG_WARNING: 0xe11d48,
    NORMAL: 0x2dd4bf,           // + NORMAL_STR
    CONTAINER_EDGE / CONTAINER_DOOR / CONTAINER_INSIDE / GRID,
    GROUPS: { A: 0xef4444, B: 0x3b82f6, C: 0xf59e0b, D: 0x22c55e },
    SKU_PALETTE: [ /* 13 renklik fallback paleti */ ],
  },

  DOOR_REAR_OPEN_ANGLE / DOOR_SIDE_OPEN_ANGLE / DOOR_EASING
    / DOOR_THICKNESS_CM: 5 / DOOR_SIDE_PANEL_W_CM: 15,

  INSTANCED_THRESHOLD: 50,

  // Yükleme animasyonu (adaptive schedule)
  ANIM_BASE_MS: 2000, ANIM_PER_BOX_MS: 70,
  ANIM_MIN_MS: 2500,  ANIM_MAX_MS: 4500,
  ANIM_FLIGHT_MIN_MS: 500, ANIM_FLIGHT_MAX_MS: 900, ANIM_FLIGHT_RATIO: 1.8,
  ANIM_DOOR_OFFSET_CM: 200, LANDING_START_OFFSET: 150,

  GRID_STEP_CM: 50, LEVEL_FILTER_STEP_CM: 10, DRAG_SNAP_THRESHOLD_CM: 15,
  STAGING_GAP_CM: 150, STAGING_INTER_GAP_CM: 10,
  STAGING_WIDTH_CM: 600, STAGING_DEPTH_CM: 400,

  SHADOW_MAP_SIZE: 2048, SHADOW_CAMERA_SIZE: 1500,
  SHADOW_CAMERA_NEAR: 1, SHADOW_CAMERA_FAR: 5000,

  CAMERA_TRANSITION_S: 0.8, CAMERA_DISTANCE_FACTOR: 1.5,
  CAMERA_PRESETS: { TOP, FRONT, BACK, SIDE_RIGHT, SIDE_LEFT, ISO },  // { dir, label }
} as const;
```

## Koordinat & BoxWrapper

X=Genişlik · Y=Yükseklik · Z=Derinlik · Origin=Sol-Alt-Arka · Rotasyon=Derece

`<mesh position={[p.x,p.y,p.z]}>` yasak — `BoxWrapper` zorunlu:

```tsx
<mesh position={[positionX+width/2, positionY+height/2, positionZ+depth/2]}>
```

Animasyonda başlangıç ve hedefe offset uygulanır. 50+ kutuda `InstancedMesh` kullan, offset `setMatrixAt()` içinde.

## Canvas

```tsx
<Canvas
  camera={{ position: SCENE.CAMERA_POSITION, fov: SCENE.CAMERA_FOV }}
  gl={{ antialias: true, preserveDrawingBuffer: true }}
  shadows
  style={{ width: '100%', height: '100%' }}
>
  <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
  <directionalLight position={SCENE.DIRECTIONAL_POSITION} intensity={SCENE.DIRECTIONAL_INTENSITY} castShadow />
  <pointLight position={SCENE.RIM_POSITION} intensity={SCENE.RIM_INTENSITY} color={SCENE.RIM_COLOR} />
  <OrbitControls
    ref={orbitRef}
    enableDamping
    dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
    autoRotate
    autoRotateSpeed={SCENE.ORBIT_AUTO_ROTATE_SPEED}
    minDistance={SCENE.ORBIT_MIN_DISTANCE}
    maxDistance={SCENE.ORBIT_MAX_DISTANCE}
    onStart={() => {
      orbitRef.current.autoRotate = false;
    }}
  />
</Canvas>
```

`autoRotate` ref ile tutulur — `useState` canvas'ı re-render ettirir.

## InstancedMesh + Raycaster

50+ kutuda ayrı `<mesh>` yasak. `onClick` → `e.instanceId` (standart Mesh'te `e.object`) — `placements[e.instanceId]` ile kutu bulunur. Seçim mantığı `scene/hooks/` altında bir hook'a izole edilir. `useSceneStore`'a `selectedInstanceId:number|null`.

## Animasyon State Machine

`useSceneStore`: `animationState:'idle'|'loading'|'complete'` · `animationSpeed:number`

```ts
// useFrame — sadece aktif kutular
meshes.forEach((m) => {
  if (!m.userData.active) return;
  const d = m.userData.targetY - m.position.y;
  if (Math.abs(d) > 0.005) {
    m.position.y += d * SCENE.DROP_EASING;
  } else {
    m.position.y = m.userData.targetY;
    m.userData.active = false;
    m.material.emissiveIntensity = SCENE.IDLE_GLOW;
  }
});
// Cancel — plan değişince
useEffect(() => {
  if (animationState === 'loading') {
    cancelAnimation();
    clearScene();
    setAnimationState('idle');
  }
}, [selectedPlanId]);
```

## useFrame Kuralları

- `setState` yasak → `useSceneStore.getState().setX(val)`
- `new THREE.Vector3()` frame içinde yasak → dışarıda yarat, `.set()` ile reuse
- Ağır hesaplama yasak → `useMemo` dışarıda
- Sadece pozisyon/matris ve emissive geçişleri

## Violation

`useSceneStore`: `violations:{instanceId:number;reason:string}[]`

```ts
violations.forEach(({ instanceId }) => {
  currentColor.lerp(violationColor, 0.15);
  meshRef.current.setColorAt(instanceId, currentColor);
});
meshRef.current.instanceColor.needsUpdate = true;
```

## Memory & Snapshot

```ts
// Dispose — R3F JSX otomatik, manuel THREE'de zorunlu
return () => {
  geo.dispose();
  mat.dispose();
};

// Snapshot — sadece complete state'inde
requestAnimationFrame(() => {
  resolve(gl.domElement.toDataURL('image/png'));
});
```

## Figma Referansı

`/yukleme-plani-olustur` → `YuklemePlaniLayout` (focus mode, sidebar yok). 3D ekran yapısı: sol panel (araç+ürün listesi) · merkez (canvas + view toggle: 3D/Önden/Yandan/Üstten) · sağ panel (istatistik+aksiyonlar).

Araç tipleri: `"Kamyon"|"Konteyner"|"Römork"|"Tır"` · Kapı: `"Arka"|"Yan"|"Üst"` · Kısıt: `"fragile"|"heavy_side"|"bottom_only"|"hazmat"`
