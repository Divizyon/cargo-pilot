import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { calcCenterOfGravity, calcBalance, buildCogInputs } from '@/lib/utils/calcCenterOfGravity';
import { SCENE } from '@/lib/config/scene-config';

const SPHERE_RADIUS = 12;
const CROSSHAIR_HALF = 60;
const GROUND_Y = 0.5;
const DROP_LINE_COLOR = new THREE.Color(SCENE.COLORS.SELECTED);

function CrosshairLines({ x, z, warning }: { x: number; z: number; warning: boolean }) {
  const geometry = useMemo(() => {
    const pts = [
      x - CROSSHAIR_HALF,
      GROUND_Y,
      z,
      x + CROSSHAIR_HALF,
      GROUND_Y,
      z,
      x,
      GROUND_Y,
      z - CROSSHAIR_HALF,
      x,
      GROUND_Y,
      z + CROSSHAIR_HALF,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [x, z]);

  const color = warning ? SCENE.COLORS.VIOLATION : SCENE.COLORS.SELECTED;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} />
    </lineSegments>
  );
}

function DropLine({ x, cogY, z }: { x: number; cogY: number; z: number }) {
  const { scene } = useThree();
  const lineRef = useRef<THREE.Line | null>(null);

  useEffect(() => {
    const pts = [x, GROUND_Y, z, x, cogY, z];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineDashedMaterial({
      color: DROP_LINE_COLOR,
      dashSize: 8,
      gapSize: 6,
      opacity: 0.6,
      transparent: true,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
    lineRef.current = line;

    return () => {
      scene.remove(line);
      geo.dispose();
      mat.dispose();
    };
  }, [x, cogY, z, scene]);

  return null;
}

export function CogMarker() {
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const vehicle = usePlanStore((s) => s.selectedVehicle);
  const showCog = useSceneStore((s) => s.showCog);

  const balance = useMemo(() => {
    if (!vehicle || placements.length === 0) return null;

    const weightByItemId: Record<string, number> = {};
    for (const { item } of selectedItems) {
      weightByItemId[item.id] = item.weight;
    }

    const inputs = buildCogInputs(
      placements.filter((p) => !p.isStagingArea),
      weightByItemId,
    );
    const cog = calcCenterOfGravity(inputs);
    if (!cog) return null;

    return calcBalance(cog, vehicle.width, vehicle.length);
  }, [placements, selectedItems, vehicle]);

  if (!balance || !showCog) return null;

  const { cog, isLateralWarning, isLongitudinalWarning } = balance;
  const warning = isLateralWarning || isLongitudinalWarning;
  const sphereColor = warning ? SCENE.COLORS.VIOLATION : SCENE.COLORS.SELECTED;

  return (
    <group>
      <CrosshairLines x={cog.x} z={cog.z} warning={warning} />
      <DropLine x={cog.x} cogY={cog.y} z={cog.z} />
      {/* eslint-disable-next-line no-restricted-syntax -- CoG marker sphere, not a cargo box */}
      <mesh position={[cog.x, cog.y, cog.z]}>
        <sphereGeometry args={[SPHERE_RADIUS, 12, 12]} />
        <meshBasicMaterial color={sphereColor} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
