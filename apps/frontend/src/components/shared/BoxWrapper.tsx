import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

interface BoxWrapperProps {
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  color?: string;
  opacity?: number;
  onClick?: (id: string) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  itemId?: string;
  isSelected?: boolean;
  isHidden?: boolean;
}

export function BoxWrapper({
  width,
  height,
  depth,
  positionX,
  positionY,
  positionZ,
  color = '#2563EB',
  opacity = 0.85,
  onClick,
  onPointerDown,
  itemId,
  isSelected = false,
  isHidden = false,
}: BoxWrapperProps) {
  const cx = positionX + width / 2;
  const cy = positionY + height / 2;
  const cz = positionZ + depth / 2;

  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [width, height, depth]);

  useEffect(
    () => () => {
      edgesGeo.dispose();
    },
    [edgesGeo],
  );

  if (isHidden) return null;

  return (
    <group
      position={[cx, cy, cz]}
      onClick={(e) => {
        e.stopPropagation();
        if (itemId !== undefined) onClick?.(itemId);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
    >
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.95 : opacity}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={isSelected ? color : '#000000'} />
      </lineSegments>
    </group>
  );
}
