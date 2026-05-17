import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CraneAnimationProps {
  mirror?: boolean;
  /** Override theme detection — true = always light container on dark bg, false = follow system */
  dark?: boolean;
}

export function CraneAnimation({ mirror = false, dark }: CraneAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 288;
    const H = el.clientHeight || 400;

    const systemIsDark = () => document.documentElement.classList.contains('dark');
    const isDark = () => (dark !== undefined ? dark : systemIsDark());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
    camera.position.set(mirror ? -8.5 : 8.5, 11.0, 10.0);
    camera.lookAt(0, 2.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, isDark() ? 0.35 : 0.5);
    scene.add(ambientLight);

    // Ana ışık — doğrudan önden, kaburgalarda yumuşak gölge
    const dl = new THREE.DirectionalLight(0xffffff, 1.0);
    dl.position.set(0, 5, 10);
    scene.add(dl);

    // Sağ köşe PointLight — konteyner bu tarafa yaklaştıkça o bölgeyi doğal aydınlatır
    const cornerLight = new THREE.PointLight(0xffffff, 2.5, 10);
    cornerLight.position.set(5, 1, 5);
    scene.add(cornerLight);

    // Rim ışık — sol arka kenar silüeti
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(-5, 2, -5);
    scene.add(rim);

    // SpotLight — sadece ön yüzü aydınlatır, arkaya geçmez
    const logoLight = new THREE.SpotLight(0xffffff, 1.5, 5, Math.PI / 6, 0.4, 1.5);
    logoLight.position.set(0, 0, 2.5);
    logoLight.target.position.set(0, 0, -1);
    // containerMesh'e sonradan ekleniyor (aşağıda)

    const pivotY = 5.8;
    const containerW = 2.9;
    const containerH = 1.1;
    const containerD = 1.35;
    const cableLength = 4.2;
    const armLength = cableLength + containerH / 2;

    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(0, pivotY, 0);
    scene.add(pivotGroup);

    const containerMat = new THREE.MeshLambertMaterial({ color: isDark() ? 0xf2f2f2 : 0xf2f2f2 });
    const edgesMat = new THREE.LineBasicMaterial({ color: isDark() ? 0xaaaaaa : 0xaaaaaa });
    const ribMat = new THREE.MeshLambertMaterial({ color: isDark() ? 0xdedede : 0xdedede });
    const fittingMat = new THREE.MeshLambertMaterial({ color: isDark() ? 0xcccccc : 0xcccccc });
    const liftPadMat = new THREE.MeshLambertMaterial({ color: isDark() ? 0xbbbbbb : 0xbbbbbb });
    const cableMat = new THREE.MeshLambertMaterial({ color: isDark() ? 0x999999 : 0x999999 });

    const applyTheme = () => {
      if (dark !== undefined) return; // fixed theme, no updates needed
      const d = systemIsDark();
      containerMat.color.set(d ? 0x202020 : 0xf2f2f2);
      edgesMat.color.set(d ? 0x585858 : 0xaaaaaa);
      ribMat.color.set(d ? 0x282828 : 0xdedede);
      fittingMat.color.set(d ? 0x484848 : 0xcccccc);
      liftPadMat.color.set(d ? 0x565656 : 0xbbbbbb);
      cableMat.color.set(d ? 0x888888 : 0x999999);
      ambientLight.intensity = d ? 0.35 : 0.5;
    };

    // Apply correct initial colors when following system theme
    if (dark === undefined) applyTheme();

    // Container body
    const containerGeom = new THREE.BoxGeometry(containerW, containerH, containerD);
    const containerMesh = new THREE.Mesh(containerGeom, containerMat);
    containerMesh.position.set(0, -armLength, 0);
    pivotGroup.add(containerMesh);
    containerMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(containerGeom), edgesMat));
    containerMesh.add(logoLight);
    containerMesh.add(logoLight.target);

    // Logo on top of container
    const logoSize = 256;
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = logoSize;
    logoCanvas.height = logoSize;
    const logoCtx = logoCanvas.getContext('2d')!;
    const logoTexture = new THREE.CanvasTexture(logoCanvas);
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254"><path fill="#000000" d="M817.15,541.55c-.42-2.84-1.52-5.54-2.86-6.43s-5.47-1.61-6.94-.85l-25.79,13.31-91.1,48.79c-2.51,1.34-4.13,5.82-4.13,8.91v257.4s-75.21,41.44-75.21,41.44c-3.18,1.75-8.19.81-10.81-.82-2.43-1.51-4.85-5.4-4.85-9.56l.02-346.55c0-5.9,2.62-12.37,7.7-15.21l139.53-78.21,57.14-31.85c6.39-3.56,11.98-3.23,18.2.13l52.44,28.37,25.37,15.7c6.83,4.23,10.97,11.7,10.96,20.15l-.03,112.65-1.37,69.97c.2,8.73-3.49,16.02-10.98,20.69l-183.42,101.59-.07-112.98,106.13-58.74.08-77.93Z"/><path fill="#000000" d="M437.01,692.39c.12,5.02,1.62,8.13,4.92,10.84l128.65,71.53-.15,111.43-204.28-117.05c-12.31-8.71-18.4-21.23-18.4-36.31l.05-232.64c1.39-14.78,8.91-26.06,21.61-32.98l115.97-63.25,150,80.64-44.26,25.41c-12.84,8.15-20.61,20.64-20.53,36.09l-.17,62.95-121.62-66.69c-1.88-1.03-6.44-.21-8.07.67-1.78.96-3.78,4.06-3.77,7.08l.05,142.28Z"/><path fill="#000000" d="M661.05,470.39l-149.81-80.14,104.73-56.15c11.05-4.04,22.27-3.94,32.9,1.07l131.7,69-119.53,66.21Z"/></svg>`;
    const logoImg = new Image();
    logoImg.onload = () => {
      logoCtx.drawImage(logoImg, 0, 0, logoSize, logoSize);
      logoTexture.needsUpdate = true;
    };
    logoImg.src = 'data:image/svg+xml;base64,' + btoa(svgMarkup);

    const logoGeom = new THREE.PlaneGeometry(containerH * 1.1, containerH * 1.1, 40, 40);
    const ribSpacing = containerW / 11.0;
    const logoUniforms = {
      uTexture:    { value: logoTexture },
      uRibSpacing: { value: ribSpacing },
      uLightDir:   { value: new THREE.Vector3(0.3, 0.5, 1.0).normalize() },
    };
    const logoMat = new THREE.ShaderMaterial({
      uniforms: logoUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uRibSpacing;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float pi = 3.14159265;
          float fx = (2.0 * pi) / uRibSpacing;
          float fy = (1.5 * pi) / uRibSpacing;
          float wx = sin(pos.x * fx) * 0.014;
          float wy = sin(pos.y * fy) * 0.006;
          pos.z += wx + wy;
          // Analitik normal — dalga türevlerinden
          float dzdx = cos(pos.x * fx) * fx * 0.014;
          float dzdy = cos(pos.y * fy) * fy * 0.006;
          vNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uLightDir;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          float diffuse = max(dot(vNormal, uLightDir), 0.0);
          float light = 0.55 + 0.45 * diffuse;
          gl_FragColor = vec4(texColor.rgb * light, texColor.a);
        }
      `,
    });
    const logoMesh = new THREE.Mesh(logoGeom, logoMat);
    logoMesh.renderOrder = 1;
    logoMesh.position.set(0, 0, containerD / 2 + 0.05);
    containerMesh.add(logoMesh);

    const sideRibGeom = new THREE.BoxGeometry(0.035, containerH * 1.005, 0.048);
    const endRibGeom = new THREE.BoxGeometry(0.048, containerH * 1.005, 0.035);
    const topRibGeom = new THREE.BoxGeometry(containerW * 1.005, 0.038, 0.048);

    for (let i = 1; i <= 10; i++) {
      const x = -containerW / 2 + (i / 11) * containerW;
      for (const zs of [-1, 1]) {
        const r = new THREE.Mesh(sideRibGeom, ribMat);
        r.position.set(x, 0, zs * (containerD / 2 + 0.024));
        containerMesh.add(r);
      }
    }

    for (let i = 1; i <= 4; i++) {
      const z = -containerD / 2 + (i / 5) * containerD;
      for (const xs of [-1, 1]) {
        const r = new THREE.Mesh(endRibGeom, ribMat);
        r.position.set(xs * (containerW / 2 + 0.024), 0, z);
        containerMesh.add(r);
      }
    }

    for (let i = 1; i <= 8; i++) {
      const z = -containerD / 2 + (i / 9) * containerD;
      const r = new THREE.Mesh(topRibGeom, ribMat);
      r.position.set(0, containerH / 2 + 0.019, z);
      containerMesh.add(r);
    }

    const castingGeom = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    for (const xs of [-1, 1])
      for (const ys of [-1, 1])
        for (const zs of [-1, 1]) {
          const c = new THREE.Mesh(castingGeom, fittingMat);
          c.position.set((xs * containerW) / 2, (ys * containerH) / 2, (zs * containerD) / 2);
          containerMesh.add(c);
        }

    const colGeom = new THREE.BoxGeometry(0.065, containerH, 0.065);
    for (const xs of [-1, 1])
      for (const zs of [-1, 1]) {
        const col = new THREE.Mesh(colGeom, fittingMat);
        col.position.set((xs * containerW) / 2, 0, (zs * containerD) / 2);
        containerMesh.add(col);
      }

    const hRailXGeom = new THREE.BoxGeometry(containerW, 0.065, 0.065);
    const hRailZGeom = new THREE.BoxGeometry(0.065, 0.065, containerD);
    for (const ys of [-1, 1]) {
      const y = (ys * containerH) / 2;
      for (const zs of [-1, 1]) {
        const r = new THREE.Mesh(hRailXGeom, fittingMat);
        r.position.set(0, y, (zs * containerD) / 2);
        containerMesh.add(r);
      }
      for (const xs of [-1, 1]) {
        const r = new THREE.Mesh(hRailZGeom, fittingMat);
        r.position.set((xs * containerW) / 2, y, 0);
        containerMesh.add(r);
      }
    }

    const liftPadY = -cableLength * 0.38;
    const liftPadGeom = new THREE.BoxGeometry(0.2, 0.11, 0.2);
    const liftPadMesh = new THREE.Mesh(liftPadGeom, liftPadMat);
    liftPadMesh.position.set(0, liftPadY, 0);
    pivotGroup.add(liftPadMesh);
    liftPadMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(liftPadGeom), edgesMat));

    const cableGeoms: THREE.BufferGeometry[] = [];
    const addCable = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.022) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const length = dir.length();
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const geom = new THREE.CylinderGeometry(radius, radius, length, 6);
      cableGeoms.push(geom);
      const mesh = new THREE.Mesh(geom, cableMat);
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      pivotGroup.add(mesh);
    };

    addCable(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 8.0, 0));
    addCable(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, liftPadY, 0));

    const cx = (containerW / 2) * 0.88;
    const cz = (containerD / 2) * 0.88;
    const topY = -cableLength;
    for (const [ox, oz] of [
      [-cx, -cz],
      [cx, -cz],
      [-cx, cz],
      [cx, cz],
    ] as [number, number][]) {
      addCable(new THREE.Vector3(0, liftPadY, 0), new THREE.Vector3(ox, topY, oz));
    }

    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const initAngle = mirror ? -0.18 : 0.18;
    let angle = initAngle;
    let angularVelocity = 0;
    const gravity = 0.4;
    const damp = 0.0;
    let lastTime = performance.now();

    let rafId: number;
    function tick() {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      angularVelocity += -(gravity / armLength) * Math.sin(angle) * dt;
      angle += angularVelocity * dt;
      pivotGroup.rotation.z = angle;

      // Öne gelirken parlak, arkaya giderken gölge — lerp ile yumuşak geçiş
      const facingFactor = Math.max(0, Math.cos(angle));
      const comingForward = Math.sign(angle) !== Math.sign(angularVelocity);
      const targetIntensity = comingForward
        ? 2.2 * facingFactor
        : 0.3 * facingFactor;
      logoLight.intensity += (targetIntensity - logoLight.intensity) * Math.min(1, dt * 3.5);

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      const nW = el.clientWidth,
        nH = el.clientHeight;
      if (!nW || !nH) return;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      themeObserver.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      [
        containerGeom,
        sideRibGeom,
        endRibGeom,
        topRibGeom,
        castingGeom,
        colGeom,
        hRailXGeom,
        hRailZGeom,
        liftPadGeom,
      ].forEach((g) => g.dispose());
      [containerMat, ribMat, fittingMat, liftPadMat, logoMat].forEach((m) => m.dispose());
      [edgesMat, cableMat].forEach((m) => m.dispose());
      logoGeom.dispose();
      logoTexture.dispose();
      cableGeoms.forEach((g) => g.dispose());
    };
  }, [mirror, dark]);

  return <div ref={mountRef} className="w-full h-full" />;
}
