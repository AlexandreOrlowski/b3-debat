"use client";

import { useEffect, useRef, useState } from "react";

interface PerfumeSceneProps {
  progress: number;
  onReady: () => void;
}

const columns = 8;
const rows = 4;
const views = columns * rows;
const frameWidth = 416;
const frameHeight = 768;
const frameAspect = frameWidth / frameHeight;
const viewHeight = 3.38;
const tilt = -0.145;
const startAngle = -0.07;
const assetPath = "/parfum/";

// Each studio exposure includes the reflections and refraction through the
// original glass. Project the neighboring exposures onto the rotating GLB.
const vertexShader = `
  uniform mat4 previousView;
  uniform mat4 nextView;
  varying vec2 previousUv;
  varying vec2 nextUv;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.);
    previousUv = (previousView * world).xy * .5 + .5;
    nextUv = (nextView * world).xy * .5 + .5;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform sampler2D studio;
  uniform vec2 previousTile;
  uniform vec2 nextTile;
  uniform float fraction;
  varying vec2 previousUv;
  varying vec2 nextUv;

  vec4 exposure(vec2 tile, vec2 uv) {
    return texture2D(studio, (tile + clamp(uv, .001, .999)) / vec2(${columns}., ${rows}.));
  }

  void main() {
    vec4 a = exposure(previousTile, previousUv);
    vec4 b = exposure(nextTile, nextUv);
    float aWeight = (1. - fraction) * a.a;
    float bWeight = fraction * b.a;
    vec3 color = (a.rgb * aWeight + b.rgb * bWeight) / max(aWeight + bWeight, .001);
    gl_FragColor = vec4(color, 1.);
  }
`;

export default function PerfumeScene({ progress, onReady }: PerfumeSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const currentProgress = useRef(progress);
  const draw = useRef<(() => void) | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => {
    currentProgress.current = progress;
    draw.current?.();
  }, [progress]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let releaseRenderer: (() => void) | undefined;
    let observer: ResizeObserver | undefined;
    const atlas = new Image();
    atlas.src = assetPath + "orbite.webp";
    const loaded = atlas.decode();

    function observe(render: () => void) {
      draw.current = render;
      observer = new ResizeObserver(render);
      observer.observe(container!);
      render();
      setShowCanvas(true);
      onReady();
    }

    // A canvas without WebGL still follows the scroll with the same exposures.
    function startImageFallback() {
      if (disposed || !container) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) { onReady(); return; }
      container.replaceChildren(canvas);
      observe(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        const index = Math.round(currentProgress.current * views) % views;
        const h = Math.min(pixelHeight, pixelWidth / frameAspect);
        const w = h * frameAspect;
        context.clearRect(0, 0, pixelWidth, pixelHeight);
        context.drawImage(atlas, index % columns * frameWidth, Math.floor(index / columns) * frameHeight,
          frameWidth, frameHeight, (pixelWidth - w) / 2, (pixelHeight - h) / 2, w, h);
      });
    }

    async function initialize() {
      const [THREE, { GLTFLoader }] = await Promise.all([
        import("three"), import("three/addons/loaders/GLTFLoader.js"), loaded,
      ]);
      if (disposed || !container) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
      if (!context) {
        startImageFallback();
        return;
      }
      const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
      releaseRenderer = () => renderer.dispose();
      renderer.setClearColor(0, 0);
      const { scene: bottle } = await new GLTFLoader().loadAsync(assetPath + "parfum.glb");
      const geometry = new Set<import("three").BufferGeometry>();
      const originals = new Set<import("three").Material>();
      bottle.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometry.add(object.geometry);
        for (const original of Array.isArray(object.material) ? object.material : [object.material]) originals.add(original);
      });
      for (const original of originals) {
        const map = (original as import("three").MeshStandardMaterial).map;
        if (typeof ImageBitmap !== "undefined" && map?.source.data instanceof ImageBitmap) map.source.data.close();
        map?.dispose();
        original.dispose();
      }
      if (disposed) {
        geometry.forEach((part) => part.dispose());
        return;
      }

      const texture = new THREE.Texture(atlas);
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      const uniforms = {
        studio: { value: texture },
        previousView: { value: new THREE.Matrix4() },
        nextView: { value: new THREE.Matrix4() },
        previousTile: { value: new THREE.Vector2() },
        nextTile: { value: new THREE.Vector2() },
        fraction: { value: 0 },
      };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
      bottle.traverse((object) => {
        if (object instanceof THREE.Mesh) object.material = material;
      });

      const scene = new THREE.Scene();
      const inclined = new THREE.Group();
      const rotating = new THREE.Group();
      inclined.rotation.z = tilt;
      // This GLB's origin lies at its foot. Rotate it around its visual center.
      bottle.position.y -= 1.555;
      scene.add(inclined);
      inclined.add(rotating);
      rotating.add(bottle);
      const half = viewHeight / 2;
      const camera = new THREE.OrthographicCamera(-half * frameAspect, half * frameAspect, half, -half, .01, 30);
      camera.position.set(0, .355, 9);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const studioCamera = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const roll = new THREE.Matrix4().makeRotationZ(tilt);
      const inverseRoll = new THREE.Matrix4().makeRotationZ(-tilt);
      const yaw = new THREE.Matrix4();

      function setExposure(matrix: import("three").Matrix4, tile: import("three").Vector2, frame: number, angle: number) {
        const difference = (frame - angle) * 2 * Math.PI / views;
        matrix.copy(studioCamera).multiply(roll).multiply(yaw.makeRotationY(difference)).multiply(inverseRoll);
        const index = frame % views;
        tile.set(index % columns, rows - 1 - Math.floor(index / columns));
      }

      function recoverContext(event: Event) {
        event.preventDefault();
        observer?.disconnect();
        releaseRenderer?.();
        releaseRenderer = undefined;
        startImageFallback();
      }
      canvas.addEventListener("webglcontextlost", recoverContext);
      releaseRenderer = () => {
        canvas.removeEventListener("webglcontextlost", recoverContext);
        geometry.forEach((part) => part.dispose());
        material.dispose();
        texture.dispose();
        renderer.dispose();
      };
      container.replaceChildren(canvas);
      let lastWidth = 0;
      let lastHeight = 0;
      observe(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        if (width !== lastWidth || height !== lastHeight) {
          const aspect = width / height;
          const h = half * Math.max(1, frameAspect / aspect);
          camera.left = -h * aspect;
          camera.right = h * aspect;
          camera.top = h;
          camera.bottom = -h;
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          lastWidth = width;
          lastHeight = height;
        }
        const angle = currentProgress.current * views;
        const previous = Math.floor(angle);
        rotating.rotation.y = startAngle + currentProgress.current * Math.PI * 2;
        setExposure(uniforms.previousView.value, uniforms.previousTile.value, previous, angle);
        setExposure(uniforms.nextView.value, uniforms.nextTile.value, previous + 1, angle);
        uniforms.fraction.value = angle - previous;
        renderer.render(scene, camera);
      });
    }

    void initialize().catch(async () => {
      if (disposed) return;
      releaseRenderer?.();
      releaseRenderer = undefined;
      try {
        await loaded;
        startImageFallback();
      } catch {
        if (!disposed) onReady();
      }
    });
    return () => {
      disposed = true;
      draw.current = null;
      observer?.disconnect();
      releaseRenderer?.();
      container.replaceChildren();
    };
  }, [onReady]);

  return (
    <div aria-hidden="true" style={{ position: "relative", width: "100%", height: "100%" }}>
      <img src="/parfum/flacon.webp" alt="" fetchPriority="high" style={{
        width: "100%", height: "100%", objectFit: "contain", display: "block", opacity: showCanvas ? 0 : 1,
      }} />
      <div className="perfume-canvas" ref={host} style={{ position: "absolute", inset: 0 }} />
      <style>{".perfume-canvas > canvas { display: block; width: 100%; height: 100%; }"}</style>
    </div>
  );
}
