"use client";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { TourActions } from "./property-tour-scene";
import type { TourDirection } from "@/lib/property-tour-motion";

export default function TourMovement({ actions, limit }: { actions: RefObject<TourActions | null>; limit: boolean }) {
  const [pressed, setPressed] = useState<TourDirection | null>(null);
  const pointer = useRef<number | null>(null);
  const pointerClick = useRef(false);
  const keyHeld = useRef(false);
  useEffect(() => {
    const controller = actions.current;
    const cancel = () => { pointer.current = null; keyHeld.current = false; setPressed(null); controller?.stopMove(true); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      controller?.stopMove(true);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [actions]);

  return <div className="tour-movement">
    <span role="status">{limit ? "Obstáculo delante" : ""}</span>
    <div className="tour-direction-pad" role="group" aria-label="Desplazamiento de cámara">
      {([["forward", "Avanzar", ArrowUp], ["left", "Mover a la izquierda", ArrowLeft], ["back", "Retroceder", ArrowDown], ["right", "Mover a la derecha", ArrowRight]] as const).map(([direction, label, Icon]) => <button
        key={direction} className="tour-icon" data-direction={direction} data-active={pressed === direction}
        type="button" title={label} aria-label={label}
        onPointerDown={event => {
          if (event.button !== 0 || pointer.current !== null) return;
          pointer.current = event.pointerId;
          pointerClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setPressed(direction);
          actions.current?.startMove(direction);
        }}
        onPointerUp={event => {
          if (pointer.current !== event.pointerId) return;
          pointer.current = null;
          setPressed(null);
          actions.current?.stopMove();
        }}
        onPointerCancel={event => {
          if (pointer.current !== event.pointerId) return;
          pointer.current = null;
          setPressed(null);
          actions.current?.stopMove(true);
        }}
        onLostPointerCapture={event => {
          if (pointer.current !== event.pointerId) return;
          pointer.current = null;
          setPressed(null);
          actions.current?.stopMove(true);
        }}
        onKeyDown={event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (event.repeat || keyHeld.current) return;
          keyHeld.current = true; pointerClick.current = false; setPressed(direction);
          actions.current?.startMove(direction);
        }}
        onKeyUp={event => {
          if (!keyHeld.current || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault(); keyHeld.current = false; setPressed(null); actions.current?.stopMove();
        }}
        onBlur={() => {
          if (!keyHeld.current) return;
          keyHeld.current = false; setPressed(null); actions.current?.stopMove(true);
        }}
        onClick={() => {
          if (pointerClick.current) { pointerClick.current = false; return; }
          actions.current?.nudge(direction);
        }}
        onContextMenu={event => event.preventDefault()}
      ><Icon size={21} aria-hidden="true" /></button>)}
    </div>
  </div>;
}
