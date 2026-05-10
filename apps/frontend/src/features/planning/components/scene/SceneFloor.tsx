// BoxWrapper kuralı kargo kutuları içindir; bu dosya için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Plane kamera ile XZ'de hareket eder; grid world koordinatına bağlı → sonsuz zemin etkisi.
// Sahne birimi = cm. 1m = 100cm.
const GRID_CELL_CM = 100;
// Görünür alanı FAR'ın ~%60'ı kadar tut — precision sorunu yaşatmaz, horizon'u kapatır.
const FLOOR_SIZE = 12000;

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xzy; // XZ düzlemi → shader'da XY olarak kullan
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vWorldPos;

  uniform float uCellSize;   // 1m = 100cm
  uniform vec3  uBgColor;
  uniform vec3  uLineColor;
  uniform float uLineWidth;
  uniform float uFadeNear;   // fade başlama mesafesi (cm)
  uniform float uFadeFar;    // tamamen saydamlaşma mesafesi (cm)
  uniform vec3  uCameraPos;

  float gridLine(float coord, float width) {
    float f = abs(fract(coord / uCellSize) - 0.5);
    float fw = fwidth(coord / uCellSize);
    return 1.0 - smoothstep(width - fw, width + fw, f);
  }

  void main() {
    float lx = gridLine(vWorldPos.x, uLineWidth);
    float ly = gridLine(vWorldPos.y, uLineWidth);
    float line = max(lx, ly);

    // Kameraya olan XZ mesafesine göre fade
    float dist = length(vWorldPos.xy - uCameraPos.xz);
    float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, dist);

    vec3 color = mix(uBgColor, uLineColor, line);
    gl_FragColor = vec4(color, fade);
  }
`;

export function SceneFloor({ y = -1 }: { y?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uCellSize: { value: GRID_CELL_CM },
          uBgColor: { value: new THREE.Color('#111827') },
          uLineColor: { value: new THREE.Color('#374151') },
          uLineWidth: { value: 0.04 },
          uFadeNear: { value: 3000 },
          uFadeFar: { value: 6000 },
          uCameraPos: { value: new THREE.Vector3() },
        },
        transparent: true,
        side: THREE.FrontSide,
        extensions: { derivatives: true } as unknown as { derivatives: boolean },
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Plane'i kamera XZ pozisyonuna snap'le — grid world'e sabitli göründüğü için
  // sonsuz zemin etkisi verir. Allocation yok, sadece .set() çağrısı.
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.x = camera.position.x;
    meshRef.current.position.z = camera.position.z;
    (material.uniforms.uCameraPos.value as THREE.Vector3).set(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, y, 0]}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  );
}
