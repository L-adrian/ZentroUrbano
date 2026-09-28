"use client";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import type { PublicTour } from "@/lib/property-tour-contract";
import { tourRenderQuality } from "@/lib/property-tour-quality";
import { TourMotion, TOUR_DRAG_SPEED, TOUR_RADIUS, TOUR_CLEARANCE, TOUR_HEIGHT_OFFSETS, tourKeyDirection, type TourDirection } from "@/lib/property-tour-motion";
import { createTourCollider } from "@/lib/property-tour-collider";

export type TourActions = { reset: () => void; startMove: (direction: TourDirection) => void; stopMove: (cancel?: boolean) => void; nudge: (direction: TourDirection) => void };

export default function TourScene({ tour, quality, actionsRef, onReady, onError, onLimitChange }: { tour: PublicTour; quality: string; actionsRef: RefObject<TourActions | null>; onReady: () => void; onError: () => void; onLimitChange: (limit: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current!;
    const abort = new AbortController();
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined, spark: SparkRenderer | undefined, mesh: SplatMesh | undefined, collider: SplatMesh | undefined, controls: OrbitControls | undefined, observer: ResizeObserver | undefined;
    let firstFrame = true, inspectPixels = true, lastPixelCheck = 0;
    const qa = ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("tourQA");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.02, 150);
    const anchor = new THREE.Vector3(0, tour.groundOffset, 0);
    const motion = new TourMotion();
    let lastFrame = 0;
    const deadline = setTimeout(() => abort.abort(), 45000);
    const fail = () => { if (!disposed) { motion.cancel(); renderer?.setAnimationLoop(null); onError(); } };
    const reset = () => {
      motion.cancel();
      controls!.enableDamping = false; controls!.update();
      camera.position.copy(anchor); controls!.target.copy(anchor).add(new THREE.Vector3(0, 0, -0.001)); controls!.update();
      controls!.enableDamping = true; inspectPixels = true;
    };
    const drag = () => renderer?.domElement.focus({ preventScroll: true });
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
        controls.enableZoom = controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.18;
        controls.minDistance = controls.maxDistance = 0.001;
        controls.minPolarAngle = 0.15;
        controls.maxPolarAngle = Math.PI - 0.15;
        controls.rotateSpeed = TOUR_DRAG_SPEED;
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
        collider = await createTourCollider(mesh, anchor);
        if (disposed) { collider.dispose(); return; }
        if (qa) {
          const probeCanvas = renderer.domElement as HTMLCanvasElement & { collisionProbe?: () => object };
          probeCanvas.collisionProbe = () => {
            let fullMs = 0, localMs = 0, mismatches = 0, checked = 0, blocked = 0;
            const probe = new THREE.Raycaster();
            for (const x of [-0.4, 0, 0.4]) for (const z of [-0.4, 0, 0.4]) for (const height of TOUR_HEIGHT_OFFSETS) for (let i = 0; i < 8; i++) {
              probe.set(anchor.clone().add(new THREE.Vector3(x, height, z)), new THREE.Vector3(Math.sin(i * Math.PI / 4), 0, Math.cos(i * Math.PI / 4)));
              probe.near = 0.025; probe.far = TOUR_CLEARANCE;
              const begin = performance.now(), original = probe.intersectObject(mesh!, false), middle = performance.now();
              const local = probe.intersectObject(collider!, false), end = performance.now();
              fullMs += middle - begin; localMs += end - middle; checked++;
              if (original.length) blocked++;
              if (Boolean(original.length) !== Boolean(local.length)) mismatches++;
            }
            return { checked, blocked, mismatches, fullMs, localMs, fullSplats: mesh!.numSplats, collisionSplats: collider!.numSplats };
          };
        }
        const forward = new THREE.Vector3(), right = new THREE.Vector3(), delta = new THREE.Vector3(), next = new THREE.Vector3();
        const heading = new THREE.Vector3(), origin = new THREE.Vector3();
        const ray = new THREE.Raycaster();
        const hits: THREE.Intersection[] = [];
        const move = (step: { right: number; forward: number }) => {
          camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
          right.crossVectors(forward, camera.up).normalize();
          delta.copy(forward).multiplyScalar(step.forward).addScaledVector(right, step.right);
          next.copy(camera.position).add(delta);
          // Small exploration radius plus opaque-splat clearance; this is not a measured floor plan.
          if (next.distanceTo(anchor) > TOUR_RADIUS) return false;
          heading.copy(delta).normalize();
          for (const offset of TOUR_HEIGHT_OFFSETS) {
            origin.copy(camera.position); origin.y += offset;
            ray.set(origin, heading); ray.near = 0.025; ray.far = TOUR_CLEARANCE;
            hits.length = 0;
            ray.intersectObject(collider!, false, hits);
            if (hits.length) return false;
          }
          camera.position.copy(next); controls!.target.add(delta); inspectPixels = true;
          return true;
        };
        actionsRef.current = {
          reset,
          startMove: direction => { onLimitChange(false); motion.start(direction); },
          stopMove: cancel => { if (cancel) motion.cancel("button"); else motion.release(); },
          nudge: direction => { onLimitChange(false); motion.pulse(direction); },
        };
        renderer.setAnimationLoop(time => {
          if (disposed || document.hidden) return;
          const step = motion.step(lastFrame ? (time - lastFrame) / 1000 : 0);
          lastFrame = time;
          controls!.update();
          if (step && !move(step)) { motion.cancel(); onLimitChange(true); }
          renderer!.render(scene, camera);
          const canvas = renderer!.domElement;
          canvas.dataset.camera = camera.position.toArray().map(v => v.toFixed(4)).join(",");
          if (qa) {
            canvas.dataset.direction = camera.getWorldDirection(forward).toArray().map(v => v.toFixed(4)).join(",");
            canvas.dataset.collisionSplats = String(collider!.numSplats);
          }
          if (qa && inspectPixels && (firstFrame || time - lastPixelCheck > 500)) {
            const gl = renderer!.getContext(), rgba = new Uint8Array(4), samples: string[] = [];
            for (const x of [0.2, 0.5, 0.8]) for (const y of [0.2, 0.5, 0.8]) { gl.readPixels(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba); samples.push(Array.from(rgba).join(",")); }
            canvas.dataset.pixels = samples.join(";"); inspectPixels = false; lastPixelCheck = time;
          }
          if (firstFrame) { firstFrame = false; canvas.dataset.ready = "true"; canvas.dataset.gaussians = String(mesh!.numSplats); onReady(); }
        });
      } catch { clearTimeout(deadline); fail(); }
    }
    const inputHost: HTMLElement = container.closest<HTMLDialogElement>("dialog") ?? container;
    const keyDown = (event: KeyboardEvent) => {
      if ((event.target as Element)?.closest?.("input,select,textarea,[contenteditable=true]")) return;
      const direction = tourKeyDirection(event.code);
      if (!direction || !actionsRef.current || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (!event.repeat) { onLimitChange(false); motion.press(event.code, direction); }
    };
    const keyUp = (event: KeyboardEvent) => { if (motion.release(event.code)) event.preventDefault(); };
    const focusOut = (event: FocusEvent) => { if (!inputHost.contains(event.relatedTarget as Node)) motion.cancel(); };
    inputHost.addEventListener("keydown", keyDown);
    inputHost.addEventListener("focusout", focusOut);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", cancelMotion);
    document.addEventListener("visibilitychange", visibility);
    void start();
    return () => {
      disposed = true; clearTimeout(deadline); abort.abort(); actionsRef.current = null;
      inputHost.removeEventListener("keydown", keyDown); inputHost.removeEventListener("focusout", focusOut);
      window.removeEventListener("keyup", keyUp); observer?.disconnect(); controls?.dispose();
      window.removeEventListener("blur", cancelMotion); document.removeEventListener("visibilitychange", visibility);
      renderer?.domElement.removeEventListener("pointerdown", drag, true);
      renderer?.setAnimationLoop(null); renderer?.domElement.removeEventListener("webglcontextlost", fail);
      if (mesh?.isInitialized) mesh.dispose(); collider?.dispose(); spark?.dispose(); renderer?.dispose(); renderer?.domElement.remove();
    };
  }, [tour.assetBase, tour.metricScale, tour.groundOffset, quality, actionsRef, onReady, onError, onLimitChange]);
  return <div className="tour-scene-host" ref={host} />;
}
