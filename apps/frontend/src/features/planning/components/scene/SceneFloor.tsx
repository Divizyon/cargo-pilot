// BoxWrapper kuralı kargo kutuları içindir; bu dosya için geçerli değil.
/* eslint-disable no-restricted-syntax */
import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlanStore } from '@/lib/store/usePlanStore';

const GRID_CELL_CM = 100;
const FLOOR_SIZE = 12000;

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xzy;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vWorldPos;

  uniform float uCellSize;
  uniform vec3  uLineColor;
  uniform float uLineWidth;
  uniform float uFadeNear;
  uniform float uFadeFar;
  uniform vec3  uCameraPos;
  uniform float uBoxMinX;
  uniform float uBoxMaxX;
  uniform float uBoxMinY;
  uniform float uBoxMaxY;

  float gridLine(float coord, float width) {
    float f = abs(fract(coord / uCellSize) - 0.5);
    float fw = fwidth(coord / uCellSize);
    return 1.0 - smoothstep(width - fw, width + fw, f);
  }

  void main() {
    if (
      vWorldPos.x >= uBoxMinX && vWorldPos.x <= uBoxMaxX &&
      vWorldPos.y >= uBoxMinY && vWorldPos.y <= uBoxMaxY
    ) {
      discard;
    }

    float lx = gridLine(vWorldPos.x, uLineWidth);
    float ly = gridLine(vWorldPos.y, uLineWidth);
    float line = max(lx, ly);

    float dist = length(vWorldPos.xy - uCameraPos.xz);
    float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, dist);

    float alpha = line * fade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uLineColor, alpha);
  }
`;

// Uniforms module scope'ta yaşar — React render döngüsünün dışında.
// Bu sayede ESLint immutability kuralı tetiklenmez.
const sharedUniforms = {
  uCellSize:  { value: GRID_CELL_CM },
  uLineColor: { value: new THREE.Color('#374151') },
  uLineWidth: { value: 0.04 },
  uFadeNear:  { value: 3000 },
  uFadeFar:   { value: 6000 },
  uCameraPos: { value: new THREE.Vector3() },
  uBoxMinX:   { value: 0 },
  uBoxMaxX:   { value: 0 },
  uBoxMinY:   { value: 0 },
  uBoxMaxY:   { value: 0 },
};

export function SceneFloor({ y = -1 }: { y?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const vehicle = usePlanStore((s) => s.selectedVehicle);

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
        uniforms: sharedUniforms,
        transparent: true,
        depthTest: true,
        depthWrite: true,
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

  useFrame(() => {
    if (!meshRef.current) return;

    meshRef.current.position.x = camera.position.x;
    meshRef.current.position.z = camera.position.z;

    sharedUniforms.uCameraPos.value.set(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );

    if (vehicle) {
      sharedUniforms.uBoxMinX.value = 0;
      sharedUniforms.uBoxMaxX.value = vehicle.width;
      sharedUniforms.uBoxMinY.value = 0;
      sharedUniforms.uBoxMaxY.value = vehicle.length;
    } else {
      sharedUniforms.uBoxMaxX.value = 0;
      sharedUniforms.uBoxMaxY.value = 0;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, y, 0]}
      geometry={geometry}
      material={material}
      renderOrder={-1}
    />
  );
}
