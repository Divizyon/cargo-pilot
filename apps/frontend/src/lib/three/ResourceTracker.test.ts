import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ResourceTracker } from '@/lib/three/ResourceTracker';

function spyGeo() {
  const geo = new THREE.BufferGeometry();
  vi.spyOn(geo, 'dispose');
  return geo;
}

function spyMat(init?: THREE.MeshStandardMaterialParameters) {
  const mat = new THREE.MeshStandardMaterial(init);
  vi.spyOn(mat, 'dispose');
  return mat;
}

function spyTex() {
  const tex = new THREE.Texture();
  vi.spyOn(tex, 'dispose');
  return tex;
}

describe('ResourceTracker', () => {
  let tracker: ResourceTracker;

  beforeEach(() => {
    tracker = new ResourceTracker();
  });

  test('geometry dispose edilir', () => {
    const geo = spyGeo();
    tracker.track(geo);
    tracker.disposeAll();
    expect(geo.dispose).toHaveBeenCalledTimes(1);
  });

  test('material dispose edilir', () => {
    const mat = spyMat();
    tracker.track(mat);
    tracker.disposeAll();
    expect(mat.dispose).toHaveBeenCalledTimes(1);
  });

  test('texture dispose edilir', () => {
    const tex = spyTex();
    tracker.track(tex);
    tracker.disposeAll();
    expect(tex.dispose).toHaveBeenCalledTimes(1);
  });

  test('material üzerindeki map slotu otomatik takibe alınır', () => {
    const tex = spyTex();
    const mat = spyMat({ map: tex });
    tracker.track(mat);
    tracker.disposeAll();
    expect(mat.dispose).toHaveBeenCalledTimes(1);
    expect(tex.dispose).toHaveBeenCalledTimes(1);
  });

  test('Mesh traverse ile geometry ve material bulunur', () => {
    const geo = spyGeo();
    const mat = spyMat();
    const mesh = new THREE.Mesh(geo, mat);
    tracker.track(mesh);
    tracker.disposeAll();
    expect(geo.dispose).toHaveBeenCalledTimes(1);
    expect(mat.dispose).toHaveBeenCalledTimes(1);
  });

  test('Scene altındaki çoklu mesh kaynakları toplanır', () => {
    const geoA = spyGeo();
    const geoB = spyGeo();
    const matA = spyMat();
    const matB = spyMat();
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geoA, matA));
    scene.add(new THREE.Mesh(geoB, matB));

    tracker.track(scene);
    tracker.disposeAll();

    expect(geoA.dispose).toHaveBeenCalledTimes(1);
    expect(geoB.dispose).toHaveBeenCalledTimes(1);
    expect(matA.dispose).toHaveBeenCalledTimes(1);
    expect(matB.dispose).toHaveBeenCalledTimes(1);
  });

  test('paylaşılan kaynak iki kez track edilse bile bir kez dispose edilir', () => {
    const geo = spyGeo();
    tracker.track(geo);
    tracker.track(geo);
    tracker.disposeAll();
    expect(geo.dispose).toHaveBeenCalledTimes(1);
  });

  test('disposeAll sonrası stats sıfırlanır', () => {
    tracker.track(spyGeo());
    tracker.track(spyMat());
    tracker.track(spyTex());
    expect(tracker.stats.geometries + tracker.stats.materials + tracker.stats.textures).toBe(3);

    tracker.disposeAll();

    const { geometries, materials, textures, targets } = tracker.stats;
    expect(geometries + materials + textures + targets).toBe(0);
  });

  test('disposeAll idempotent — ikinci çağrıda dispose tekrar çağrılmaz', () => {
    const geo = spyGeo();
    tracker.track(geo);
    tracker.disposeAll();
    tracker.disposeAll();
    expect(geo.dispose).toHaveBeenCalledTimes(1);
  });

  test('InstancedMesh kaynakları toplanır', () => {
    const geo = spyGeo();
    const mat = spyMat();
    const instanced = new THREE.InstancedMesh(geo, mat, 10);
    tracker.track(instanced);
    tracker.disposeAll();
    expect(geo.dispose).toHaveBeenCalledTimes(1);
    expect(mat.dispose).toHaveBeenCalledTimes(1);
  });
});
