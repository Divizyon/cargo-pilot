import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SCENE } from '@/lib/config/scene-config';
import type { ProductType } from '@/features/data-management/schemas/productSchema';

interface Props {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  productType?: ProductType;
  color?: string;
}

const TYPE_COLORS: Record<ProductType, string> = {
  koli: SCENE.COLORS.NORMAL_STR,
  varil: '#f59e0b',
  palet: '#22c55e',
};

const PREVIEW_DIST_FACTOR = 2.5;
const MESH_OPACITY = 0.85;

function SceneSetup({ maxDim }: { maxDim: number }) {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const dist = maxDim * PREVIEW_DIST_FACTOR;

  useEffect(() => {
    camera.position.set(dist * 0.55, dist * 0.5, dist * 0.9);
    camera.lookAt(0, 0, 0);
    orbitRef.current?.update();
  }, [camera, dist]);

  return (
    <>
      <ambientLight intensity={SCENE.AMBIENT_INTENSITY} />
      <directionalLight
        position={[maxDim * 2, maxDim * 2, maxDim]}
        intensity={SCENE.DIRECTIONAL_INTENSITY}
      />
      <OrbitControls
        ref={orbitRef}
        autoRotate
        autoRotateSpeed={SCENE.ORBIT_AUTO_ROTATE_SPEED}
        enableDamping
        dampingFactor={SCENE.ORBIT_DAMPING_FACTOR}
        enablePan={false}
        enableZoom={false}
        onStart={() => {
          if (orbitRef.current) orbitRef.current.autoRotate = false;
        }}
      />
    </>
  );
}

interface ShapeProps {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  color: string;
}

function KoliScene({ widthCm, heightCm, depthCm, color }: ShapeProps) {
  const maxDim = Math.max(widthCm, heightCm, depthCm);

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [widthCm, heightCm, depthCm]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  return (
    <>
      <SceneSetup maxDim={maxDim} />
      <group>
        <mesh>
          <boxGeometry args={[widthCm, heightCm, depthCm]} />
          <meshStandardMaterial color={color} transparent opacity={MESH_OPACITY} />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      </group>
    </>
  );
}

function VarilScene({ widthCm, heightCm, depthCm, color }: ShapeProps) {
  const radius = Math.min(widthCm, depthCm) / 2;
  const maxDim = Math.max(radius * 2, heightCm);

  const edgesGeo = useMemo(() => {
    const cyl = new THREE.CylinderGeometry(radius, radius, heightCm, 32);
    const edges = new THREE.EdgesGeometry(cyl, 30);
    cyl.dispose();
    return edges;
  }, [radius, heightCm]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  return (
    <>
      <SceneSetup maxDim={maxDim} />
      <group>
        <mesh>
          <cylinderGeometry args={[radius, radius, heightCm, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      </group>
    </>
  );
}

function PaletScene({ widthCm, heightCm, depthCm, color }: ShapeProps) {
  const maxDim = Math.max(widthCm, heightCm, depthCm);

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [widthCm, heightCm, depthCm]);

  const boardLinesGeo = useMemo(() => {
    const positions: number[] = [];
    const yTop = heightCm / 2;
    const slats = 5;
    for (let i = 1; i < slats; i++) {
      const x = -widthCm / 2 + (widthCm / slats) * i;
      positions.push(x, yTop, -depthCm / 2, x, yTop, depthCm / 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [widthCm, heightCm, depthCm]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
      boardLinesGeo.dispose();
    },
    [edgesGeo, boardLinesGeo],
  );

  return (
    <>
      <SceneSetup maxDim={maxDim} />
      <group>
        <mesh>
          <boxGeometry args={[widthCm, heightCm, depthCm]} />
          <meshStandardMaterial color={color} transparent opacity={MESH_OPACITY} />
        </mesh>
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color="#000000" />
        </lineSegments>
        <lineSegments geometry={boardLinesGeo}>
          <lineBasicMaterial color="#000000" opacity={0.5} transparent />
        </lineSegments>
      </group>
    </>
  );
}

export function ProductPreview3D({
  widthCm,
  heightCm,
  depthCm,
  productType = 'koli',
  color,
}: Props) {
  const resolvedColor = color ?? TYPE_COLORS[productType];

  const SceneComponent =
    productType === 'varil' ? VarilScene : productType === 'palet' ? PaletScene : KoliScene;

  return (
    <Canvas
      camera={{ fov: SCENE.CAMERA_FOV, near: SCENE.CAMERA_NEAR, far: SCENE.CAMERA_FAR }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={[SCENE.BACKGROUND_COLOR]} />
      <SceneComponent
        widthCm={widthCm}
        heightCm={heightCm}
        depthCm={depthCm}
        color={resolvedColor}
      />
    </Canvas>
  );
}
