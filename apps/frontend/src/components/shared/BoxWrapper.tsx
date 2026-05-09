import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { ProductType } from '@/lib/types/item';

const CYLINDER_SEGMENTS = 16;

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
  isGhosted?: boolean;
  productType?: ProductType;
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
  isGhosted = false,
  productType,
}: BoxWrapperProps) {
  const cx = positionX + width / 2;
  const cy = positionY + height / 2;
  const cz = positionZ + depth / 2;

  const isVaril = productType === 'varil';
  const radius = Math.min(width, depth) / 2;

  const edgesGeo = useMemo(() => {
    if (isVaril) {
      const cyl = new THREE.CylinderGeometry(radius, radius, height, CYLINDER_SEGMENTS);
      const edges = new THREE.EdgesGeometry(cyl);
      cyl.dispose();
      return edges;
    }
    const box = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [isVaril, radius, width, height, depth]);

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
      {!isGhosted && (
        <mesh>
          {isVaril ? (
            <cylinderGeometry args={[radius, radius, height, CYLINDER_SEGMENTS]} />
          ) : (
            <boxGeometry args={[width, height, depth]} />
          )}
          <meshStandardMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : opacity}
            emissive={isSelected ? color : '#000000'}
            emissiveIntensity={isSelected ? 0.25 : 0}
          />
        </mesh>
      )}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color={isGhosted ? '#94a3b8' : isSelected ? color : '#000000'}
          transparent={isGhosted}
          opacity={isGhosted ? 0.4 : 1}
        />
      </lineSegments>
    </group>
  );
}
