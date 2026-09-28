"use client";

import { SplatEdit, SplatEditSdf, SplatEditSdfType, SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, House, LoaderCircle, Maximize, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import type { PrivateShowcaseRoom, PrivateTourShowcase } from "@/lib/private-tour-showcase";
import "./private-tour-showcase.css";

const RAD = Math.PI / 180;
type Direction = "forward" | "back" | "left" | "right";
type ShowcaseActions = {
  reset: () => void;
  go: (id: string) => void;
  hold: (direction: Direction, active: boolean) => void;
  top: () => void;
};

type SceneItem = {
  room: PrivateShowcaseRoom;
  group: THREE.Group;
  frame: THREE.Group;
  mesh: SplatMesh;
  edits: SplatEdit[];
  portalEdit?: SplatEdit;
  supports: THREE.Mesh[];
};

export function PrivateTourShowcaseViewer({ showcase }: { showcase: PrivateTourShowcase }) {
  const [status, setStatus] = useState("Cargando recorrido");
  const [selected, setSelected] = useState<PrivateShowcaseRoom["id"]>("sala");
  const actions = useRef<ShowcaseActions | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const registerActions = useCallback((value: ShowcaseActions | null) => { actions.current = value; }, []);
  return (
    <div className="private-showcase" ref={shell}>
      <header className="private-showcase-header">
        <div className="private-showcase-brand"><House size={20} /><strong>{showcase.title}</strong><span>Muestra privada</span></div>
        <div className="private-showcase-tools">
          <Icon label="Volver al inicio" onClick={() => actions.current?.reset()}><RotateCcw size={18} /></Icon>
          <Icon label="Pantalla completa" onClick={() => document.fullscreenElement ? document.exitFullscreen() : shell.current?.requestFullscreen()}><Maximize size={18} /></Icon>
        </div>
      </header>
      <nav className="private-showcase-rooms" aria-label="Ambientes del recorrido">
        {showcase.rooms.map(room => (
          <button key={room.id} type="button" aria-pressed={selected === room.id} onClick={() => { setSelected(room.id); actions.current?.go(room.id); }}>
            <Camera size={14} />{room.name}
          </button>
        ))}
      </nav>
      <main className="private-showcase-workspace">
        <PrivateShowcaseScene showcase={showcase} onActions={registerActions} onStatus={setStatus} />
        {status ? <div className={`private-showcase-status${status.startsWith("Error") ? " is-error" : ""}`} role="status">
          {!status.startsWith("Error") ? <LoaderCircle className="private-showcase-spin" /> : null}{status}
        </div> : null}
        {!status ? <MovementControls actions={actions} /> : null}
      </main>
      <footer className="private-showcase-footer"><span>{showcase.disclaimer}</span><small>World Labs / Marble</small></footer>
    </div>
  );
}

function Icon({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return <button className="private-showcase-icon" type="button" title={label} aria-label={label} onClick={onClick}>{children}</button>;
}

function MovementControls({ actions }: { actions: React.RefObject<ShowcaseActions | null> }) {
  const buttons: [Direction, string, typeof ArrowUp][] = [
    ["left", "Izquierda", ArrowLeft], ["forward", "Avanzar", ArrowUp],
    ["back", "Retroceder", ArrowDown], ["right", "Derecha", ArrowRight],
  ];
  const release = (direction: Direction) => actions.current?.hold(direction, false);
  return <div className="private-showcase-movement" aria-label="Movimiento">
    {buttons.map(([direction, label, Glyph]) => <button
      key={direction}
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        actions.current?.hold(direction, true);
      }}
      onPointerUp={() => release(direction)}
      onPointerCancel={() => release(direction)}
      onLostPointerCapture={() => release(direction)}
      onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); actions.current?.hold(direction, true); } }}
      onKeyUp={() => release(direction)}
      onBlur={() => release(direction)}
    ><Glyph size={22} /></button>)}
  </div>;
}

function PrivateShowcaseScene({
  showcase,
  onActions,
  onStatus,
}: {
  showcase: PrivateTourShowcase;
  onActions: (value: ShowcaseActions | null) => void;
  onStatus: (status: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const mount = container;
    let disposed = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let spark: SparkRenderer | undefined;
    let observer: ResizeObserver | undefined;
    let lastFrame = 0;
    let pointer: { id: number; x: number; y: number } | undefined;
    let yaw = showcase.start.yaw * RAD;
    let pitch = 0;
    let topView = false;
    const camera = new THREE.PerspectiveCamera(70, 1, 0.025, 150);
    const scene = new THREE.Scene();
    const items: SceneItem[] = [];
    const keys = new Set<Direction>();
    const held = new Set<Direction>();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const start = new THREE.Vector3(...showcase.start.position);
    const rooms = new Map(showcase.rooms.map(room => [room.id, room]));
    const loadedRooms = new Set<PrivateShowcaseRoom["id"]>();
    const roomErrors = new Map<PrivateShowcaseRoom["id"], string>();
    let pendingRoom: PrivateShowcaseRoom["id"] | undefined;
    camera.position.copy(start);
    const aim = () => camera.rotation.set(pitch, yaw, 0, "YXZ");
    const reset = () => {
      pendingRoom = undefined;
      topView = false;
      pitch = 0;
      yaw = showcase.start.yaw * RAD;
      camera.position.copy(start);
      velocity.set(0, 0, 0);
      aim();
      onStatus("");
    };

    const portal = showcase.connection;
    const portalCenter = new THREE.Vector3(...portal.center);
    const portalRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), portal.yaw * RAD);
    const portalNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(portalRotation);
    const portalCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) =>
      new THREE.Vector3(x * portal.width / 2, y * portal.height / 2, 0).applyQuaternion(portalRotation).add(portalCenter),
    );
    const zAxis = new THREE.Vector3(0, 0, 1);
    const edgeA = new THREE.Vector3();
    const edgeB = new THREE.Vector3();
    const planeNormal = new THREE.Vector3();
    const toDoor = new THREE.Vector3();

    function updatePortal() {
      toDoor.subVectors(portalCenter, camera.position);
      const side = -toDoor.dot(portalNormal);
      const activeRoom = side > 0 ? portal.positiveRoom : portal.negativeRoom;
      for (const item of items) {
        if (!item.portalEdit) continue;
        const portalSdfs = item.portalEdit.sdfs;
        if (!portalSdfs) continue;
        const clip = !topView && item.room.id !== activeRoom && Math.abs(side) > 0.015;
        item.portalEdit.matrix.copy(item.mesh.matrixWorld).invert();
        item.portalEdit.matrixWorldNeedsUpdate = true;
        portalSdfs.forEach(sdf => { sdf.opacity = clip ? 0 : 1; });
        if (!clip) continue;
        for (let index = 0; index < 4; index += 1) {
          edgeA.subVectors(portalCorners[index], camera.position);
          edgeB.subVectors(portalCorners[(index + 1) % 4], camera.position);
          planeNormal.crossVectors(edgeA, edgeB).normalize();
          if (planeNormal.dot(toDoor) < 0) planeNormal.negate();
          const sdf = portalSdfs[index];
          sdf.position.copy(camera.position);
          sdf.quaternion.setFromUnitVectors(zAxis, planeNormal);
        }
        planeNormal.copy(portalNormal).multiplyScalar(item.room.id === portal.positiveRoom ? 1 : -1);
        const farPlane = portalSdfs[4];
        farPlane.position.copy(portalCenter);
        farPlane.quaternion.setFromUnitVectors(zAxis, planeNormal);
      }
    }

    function addCrop(item: SceneItem, cropBounds: [number, number, number, number], invert: boolean, y = 1.5, height = 5) {
      const edit = new SplatEdit({ softEdge: 0.02, invert, sdfs: [] });
      const box = new SplatEditSdf({ type: SplatEditSdfType.BOX, opacity: 0 });
      box.position.set((cropBounds[0] + cropBounds[1]) / 2, y, (cropBounds[2] + cropBounds[3]) / 2);
      box.scale.set((cropBounds[1] - cropBounds[0]) / 2, height / 2, (cropBounds[3] - cropBounds[2]) / 2);
      edit.addSdf(box);
      item.frame.updateMatrix();
      item.mesh.updateMatrix();
      edit.matrixAutoUpdate = false;
      edit.matrix.copy(item.frame.matrix).multiply(item.mesh.matrix).invert();
      item.mesh.add(edit);
      item.edits.push(edit);
    }

    function place(item: SceneItem) {
      const room = item.room;
      item.group.position.fromArray(room.position);
      item.group.rotation.y = room.yaw * RAD;
      item.frame.position.y = room.eyeHeight;
      item.mesh.scale.setScalar(room.scale);
      for (const patch of room.patches) {
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(...patch.size),
          new THREE.MeshBasicMaterial({ color: patch.color, side: THREE.DoubleSide }),
        );
        plane.position.fromArray(patch.position);
        plane.rotation.y = patch.yaw * RAD;
        item.group.add(plane);
        item.supports.push(plane);
      }
      addCrop(item, room.bounds, true, 2, 16);
      for (const opening of room.portals) addCrop(item, opening.bounds, false, opening.y, opening.height);
      item.portalEdit = new SplatEdit({ softEdge: 0.005, sdfs: [] });
      item.portalEdit.matrixAutoUpdate = false;
      for (let index = 0; index < 5; index += 1) item.portalEdit.addSdf(new SplatEditSdf({ type: SplatEditSdfType.PLANE, opacity: 1 }));
      item.mesh.add(item.portalEdit);
      item.mesh.edits = [...item.edits, item.portalEdit];
      item.group.updateMatrixWorld(true);
    }

    function go(id: string) {
      const room = rooms.get(id as PrivateShowcaseRoom["id"]);
      if (!room) return;
      const error = roomErrors.get(room.id);
      if (error) {
        onStatus(`Error: ${error}`);
        return;
      }
      if (!loadedRooms.has(room.id)) {
        pendingRoom = room.id;
        onStatus(`Cargando ${room.name.toLowerCase()}`);
        return;
      }
      pendingRoom = undefined;
      topView = false;
      pitch = 0;
      yaw = room.yaw * RAD;
      camera.position.fromArray(room.viewPosition ?? [room.position[0], room.eyeHeight + room.position[1], room.position[2]]);
      velocity.set(0, 0, 0);
      aim();
      onStatus("");
    }

    const keyMap: Record<string, Direction | undefined> = {
      KeyW: "forward", KeyS: "back", KeyA: "left", KeyD: "right",
      ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right",
    };
    const keyDown = (event: KeyboardEvent) => {
      if ((event.target as Element | null)?.closest?.("input,select,textarea,[contenteditable=true]")) return;
      const directionKey = keyMap[event.code];
      if (!directionKey || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      keys.add(directionKey);
    };
    const keyUp = (event: KeyboardEvent) => {
      const directionKey = keyMap[event.code];
      if (directionKey) keys.delete(directionKey);
    };
    const clear = () => { keys.clear(); held.clear(); pointer = undefined; velocity.set(0, 0, 0); };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !renderer) return;
      renderer.domElement.focus();
      renderer.domElement.setPointerCapture(event.pointerId);
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const pointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      yaw += (event.clientX - pointer.x) * 0.003;
      pitch = THREE.MathUtils.clamp(pitch + (event.clientY - pointer.y) * 0.003, -1.45, 1.45);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      topView = false;
      aim();
    };
    const pointerUp = () => { pointer = undefined; };

    async function load() {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor("#e8eceb");
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute("aria-label", "Recorrido privado 3D");
        mount.appendChild(renderer.domElement);
        renderer.domElement.addEventListener("pointerdown", pointerDown);
        renderer.domElement.addEventListener("pointermove", pointerMove);
        renderer.domElement.addEventListener("pointerup", pointerUp);
        renderer.domElement.addEventListener("pointercancel", pointerUp);
        window.addEventListener("keydown", keyDown);
        window.addEventListener("keyup", keyUp);
        window.addEventListener("blur", clear);
        document.addEventListener("visibilitychange", clear);
        observer = new ResizeObserver(() => {
          if (!renderer) return;
          const width = mount.clientWidth;
          const height = mount.clientHeight;
          camera.aspect = width / Math.max(1, height);
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        });
        observer.observe(mount);
        spark = new SparkRenderer({ renderer });
        scene.add(spark);
        aim();
        onActions({
          reset,
          go,
          hold: (movement, active) => active ? held.add(movement) : held.delete(movement),
          top: () => { topView = true; camera.position.set(1, 18, -4); pitch = -Math.PI / 2; yaw = 0; velocity.set(0, 0, 0); aim(); },
        });
        renderer.setAnimationLoop(time => {
          if (disposed || !renderer) return;
          const delta = Math.min(0.15, (time - lastFrame) / 1000 || 0);
          lastFrame = time;
          const active = (movement: Direction) => keys.has(movement) || held.has(movement);
          let forward = Number(active("forward")) - Number(active("back"));
          let right = Number(active("right")) - Number(active("left"));
          const magnitude = Math.hypot(forward, right);
          if (magnitude > 1) { forward /= magnitude; right /= magnitude; }
          direction.set(
            -Math.sin(yaw) * forward + Math.cos(yaw) * right,
            0,
            -Math.cos(yaw) * forward - Math.sin(yaw) * right,
          ).multiplyScalar(topView ? 4 : 1.5);
          velocity.lerp(direction, 1 - Math.exp(-12 * delta));
          camera.position.addScaledVector(velocity, delta);
          updatePortal();
          renderer.render(scene, camera);
        });
        for (const [index, room] of showcase.rooms.entries()) {
          if (disposed) return;
          if (index === 0 || pendingRoom === room.id) onStatus(`Cargando ${room.name.toLowerCase()}`);
          const group = new THREE.Group();
          const frame = new THREE.Group();
          frame.rotation.x = Math.PI;
          const mesh = new SplatMesh({ url: showcase.assetBase + room.asset, editable: true, enableLod: false });
          const item: SceneItem = { room, group, frame, mesh, edits: [], supports: [] };
          group.add(frame);
          frame.add(mesh);
          scene.add(group);
          items.push(item);
          place(item);
          try {
            await mesh.initialized;
            if (disposed) { mesh.dispose(); return; }
            if (!mesh.numSplats) throw new Error(`Escena vacía: ${room.name}`);
            loadedRooms.add(room.id);
            if (pendingRoom === room.id) go(room.id);
            else if (index === 0) onStatus("");
          } catch (error) {
            const message = error instanceof Error ? error.message : `No se pudo cargar ${room.name.toLowerCase()}`;
            roomErrors.set(room.id, message);
            if (index === 0 || pendingRoom === room.id) onStatus(`Error: ${message}`);
          }
        }
      } catch (error) {
        if (!disposed) onStatus(`Error: ${error instanceof Error ? error.message : "no se pudo cargar el recorrido"}`);
      }
    }
    void load();
    return () => {
      disposed = true;
      renderer?.setAnimationLoop(null);
      observer?.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      for (const item of items) {
        if (item.mesh.isInitialized) item.mesh.dispose();
        for (const support of item.supports) { support.geometry.dispose(); (support.material as THREE.Material).dispose(); }
      }
      spark?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      onActions(null);
    };
  }, [showcase, onActions, onStatus]);
  return <div className="private-showcase-canvas" ref={host} />;
}
