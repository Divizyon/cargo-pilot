---
description:
alwaysApply: true
---

# Squad 2 — 3D Sahne Standartları

## scene-config.ts

Tüm sabitler `lib/config/scene-config.ts`'te — bileşene hardcoded değer yazılmaz:

```ts
export const SCENE = {
  CAMERA_POSITION: [0, 8, 14] as const,
  CAMERA_FOV: 50,
  ORBIT_MIN_DISTANCE: 2,
  ORBIT_MAX_DISTANCE: 50,
  LOAD_INTERVAL_MS: 380,
  DROP_EASING: 0.12,
  DROP_GLOW: 0.25,
  IDLE_GLOW: 0.06,
  COLORS: {
    VIOLATION: 0xdc2626,
    SELECTED: 0xfbbf24,
    GROUPS: { A: 0xef4444, B: 0x3b82f6, C: 0xf59e0b, D: 0x22c55e },
  },
  INSTANCED_THRESHOLD: 50,
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
  <ambientLight intensity={0.6} />
  <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
  <pointLight position={[-8, 4, -6]} intensity={0.3} color={0x4488ff} />
  <OrbitControls
    ref={orbitRef}
    enableDamping
    dampingFactor={0.05}
    autoRotate
    autoRotateSpeed={0.6}
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
