"use client";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import type { PublicTour } from "@/lib/property-tour-contract";
import { tourRenderQuality } from "@/lib/property-tour-quality";
import { TourMotion, tourDragSpeed, type TourDirection } from "@/lib/property-tour-motion";

export type TourActions = { reset: () => void; move: (direction: TourDirection) => boolean; startMove: (direction: TourDirection) => void; stopMove: (cancel?: boolean) => void };

export default function TourScene({ tour, quality, actionsRef, onReady, onError, onLimitChange }: { tour: PublicTour; quality: string; actionsRef: RefObject<TourActions | null>; onReady: () => void; onError: () => void; onLimitChange: (limit: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current!;
    const abort = new AbortController();
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined, spark: SparkRenderer | undefined, mesh: SplatMesh | undefined, controls: OrbitControls | undefined, observer: ResizeObserver | undefined;
    let firstFrame = true, inspectPixels = true;
    const qa = ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("tourQA");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.02, 150);
    const anchor = new THREE.Vector3(0, tour.groundOffset, 0);
    const motion = new TourMotion();
    let lastFrame = 0;
    const deadline = setTimeout(() => abort.abort(), 45000);
    const fail = () => { if (!disposed) { motion.cancel(); renderer?.setAnimationLoop(null); onError(); } };
    const reset = () => { motion.cancel(); camera.position.copy(anchor); controls!.target.copy(anchor).add(new THREE.Vector3(0, 0, -0.001)); controls!.update(); inspectPixels = true; };
    const drag = (event: PointerEvent) => { if (controls) controls.rotateSpeed = tourDragSpeed(event.pointerType); };
    const cancelMotion = () => motion.cancel();
    const visibility = () => { if (document.hidden) motion.cancel(); lastFrame = 0; };
    async function start() {
      try {
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        const renderQuality = tourRenderQuality(quality, Boolean(connection?.saveData), devicePixelRatio);
        renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: qa });
        renderer.setPixelRatio(renderQuality.pixelRatio);
        renderer.setClearColor("#242826");
        renderer.domElement.tabIndex = 0;
        renderer.domElement.dataset.asset = renderQuality.fileName;
        renderer.domElement.setAttribute("aria-label", "Recorrido 3D de la vivienda");
        renderer.domElement.addEventListener("webglcontextlost", fail);
        renderer.domElement.addEventListener("pointerdown", drag, true);
        container.appendChild(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = controls.enablePan = controls.enableDamping = false;
        controls.minDistance = controls.maxDistance = 0.001;
        controls.minPolarAngle = 0.15;
        controls.maxPolarAngle = Math.PI - 0.15;
        controls.rotateSpeed = 0.3;
        controls.addEventListener("change", () => { inspectPixels = true; });
        reset();
        observer = new ResizeObserver(() => {
          const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
          camera.aspect = width / height; camera.updateProjectionMatrix(); renderer!.setSize(width, height);
        });
        observer.observe(container);
        spark = new SparkRenderer({ renderer });
        scene.add(spark);
        const response = await fetch(tour.assetBase + renderQuality.fileName, { signal: abort.signal });
        if (!response.ok) throw new Error("Unavailable tour");
        const bytes = await response.arrayBuffer();
        if (disposed) return;
        mesh = new SplatMesh({ fileBytes: bytes, fileName: "world.spz", raycastable: true, minRaycastOpacity: 0.5 });
        const frame = new THREE.Group();
        frame.rotation.x = Math.PI;
        mesh.scale.setScalar(tour.metricScale);
        mesh.position.y = -tour.groundOffset;
        frame.add(mesh); scene.add(frame);
        await mesh.initialized;
        clearTimeout(deadline);
        if (disposed) { mesh.dispose(); return; }
        if (!mesh.numSplats) throw new Error("Empty scene");
        scene.updateMatrixWorld(true);
        const move = (direction: TourDirection, distance: number) => {
            const forward = camera.getWorldDirection(new THREE.Vector3()); forward.y = 0; forward.normalize();
            const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
            const heading = { forward, back: forward.clone().negate(), right, left: right.clone().negate() }[direction];
            const delta = heading.clone().multiplyScalar(distance);
            const next = camera.position.clone().add(delta);
            // Small exploration radius plus opaque-splat clearance; this is not a measured floor plan.
            if (next.distanceTo(anchor) > 0.6) return false;
            for (const offset of [-0.15, 0, 0.15]) {
              const origin = camera.position.clone(); origin.y += offset;
              const ray = new THREE.Raycaster(origin, heading, 0.025, 0.25);
              if (ray.intersectObject(mesh!, false).length) return false;
            }
            camera.position.copy(next); controls!.target.add(delta); controls!.update(); inspectPixels = true;
            return true;
        };
        actionsRef.current = {
          reset,
          move: direction => { motion.cancel(); return move(direction, 0.1); },
          startMove: direction => { onLimitChange(false); motion.start(direction); },
          stopMove: cancel => { if (cancel) motion.cancel(); else motion.release(); },
        };
        renderer.setAnimationLoop(time => {
          if (disposed || document.hidden) return;
          const step = motion.step(lastFrame ? (time - lastFrame) / 1000 : 0);
          lastFrame = time;
          if (step && step.distance > 0 && !move(step.direction, step.distance)) { motion.cancel(); onLimitChange(true); }
          renderer!.render(scene, camera);
          const canvas = renderer!.domElement;
          canvas.dataset.camera = camera.position.toArray().map(v => v.toFixed(4)).join(",");
          if (qa) canvas.dataset.direction = camera.getWorldDirection(new THREE.Vector3()).toArray().map(v => v.toFixed(4)).join(",");
          if (qa && inspectPixels) {
            const gl = renderer!.getContext(), rgba = new Uint8Array(4), samples: string[] = [];
            for (const x of [0.2, 0.5, 0.8]) for (const y of [0.2, 0.5, 0.8]) { gl.readPixels(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba); samples.push(Array.from(rgba).join(",")); }
            canvas.dataset.pixels = samples.join(";"); inspectPixels = false;
          }
          if (firstFrame) { firstFrame = false; canvas.dataset.ready = "true"; canvas.dataset.gaussians = String(mesh!.numSplats); onReady(); }
        });
      } catch { clearTimeout(deadline); fail(); }
    }
    const key = (event: KeyboardEvent) => {
      const direction = ({ w: "forward", a: "left", s: "back", d: "right", ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right" } as const)[event.key as "w"];
      if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); actionsRef.current?.move(direction); }
    };
    container.addEventListener("keydown", key);
    window.addEventListener("blur", cancelMotion);
    document.addEventListener("visibilitychange", visibility);
    void start();
    return () => {
      disposed = true; clearTimeout(deadline); abort.abort(); actionsRef.current = null;
      container.removeEventListener("keydown", key); observer?.disconnect(); controls?.dispose();
      window.removeEventListener("blur", cancelMotion); document.removeEventListener("visibilitychange", visibility);
      renderer?.domElement.removeEventListener("pointerdown", drag, true);
      renderer?.setAnimationLoop(null); renderer?.domElement.removeEventListener("webglcontextlost", fail);
      if (mesh?.isInitialized) mesh.dispose(); spark?.dispose(); renderer?.dispose(); renderer?.domElement.remove();
    };
  }, [tour.assetBase, tour.metricScale, tour.groundOffset, quality, actionsRef, onReady, onError, onLimitChange]);
  return <div className="tour-scene-host" ref={host} />;
}
