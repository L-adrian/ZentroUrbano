"use client";

import { GripVertical, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type BoardLayout = { main: string[]; side: string[] };
export type BoardCard = { key: string; title: string; node: ReactNode };
type Column = keyof BoardLayout;

// Saved order first, then any card the saved order does not know yet, in its default column.
export function normalizeLayout(saved: BoardLayout | null, defaults: BoardLayout, available: string[]): BoardLayout {
  const known = new Set(available);
  const seen = new Set<string>();
  const keep = (keys: string[]) => keys.filter((key) => known.has(key) && !seen.has(key) && seen.add(key));
  const layout = { main: keep(saved?.main ?? []), side: keep(saved?.side ?? []) };
  for (const column of ["main", "side"] as const) {
    for (const key of defaults[column]) if (known.has(key) && !seen.has(key)) { seen.add(key); layout[column].push(key); }
  }
  return layout;
}

function moveCard(layout: BoardLayout, key: string, column: Column, index: number): BoardLayout {
  const next = { main: layout.main.filter((item) => item !== key), side: layout.side.filter((item) => item !== key) };
  next[column].splice(Math.max(0, Math.min(index, next[column].length)), 0, key);
  return next;
}

const sameLayout = (a: BoardLayout, b: BoardLayout) => a.main.join() === b.main.join() && a.side.join() === b.side.join();

// The aliado's panel as a small board: each card is dragged by its handle (mouse or finger) into
// any place of either column, or moved with the arrow keys. On phones the two columns stack.
export function AliadoBoard({
  cards,
  visible,
  layout: initialLayout,
  defaults,
  onSave,
}: {
  cards: BoardCard[];
  // The cards of the open tab; the order of every card is kept in one layout.
  visible: string[];
  layout: BoardLayout;
  defaults: BoardLayout;
  onSave: (layout: BoardLayout) => void;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const layoutRef = useRef(layout);
  const startRef = useRef(layout);
  const byKey = new Map(cards.map((card) => [card.key, card]));

  useEffect(() => { layoutRef.current = layout; }, [layout]);

  // No text gets selected while a card is dragged.
  useEffect(() => {
    if (!dragKey) return;
    document.body.classList.add("select-none");
    return () => document.body.classList.remove("select-none");
  }, [dragKey]);

  function update(next: BoardLayout) {
    layoutRef.current = next;
    setLayout(next);
  }

  function commit(next: BoardLayout) {
    if (!sameLayout(next, startRef.current)) onSave(next);
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, key: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    startRef.current = layoutRef.current;
    setDragKey(key);

    const onMove = (move: PointerEvent) => {
      if (move.clientY < 70) window.scrollBy(0, -14);
      else if (move.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
      const hit = document.elementFromPoint(move.clientX, move.clientY);
      const target = hit?.closest<HTMLElement>("[data-board-card]");
      const current = layoutRef.current;
      if (target) {
        const targetKey = target.dataset.boardCard!;
        if (targetKey === key) return;
        const column = target.dataset.boardColumn as Column;
        const rect = target.getBoundingClientRect();
        const index = current[column].filter((item) => item !== key).indexOf(targetKey) + (move.clientY > rect.top + rect.height / 2 ? 1 : 0);
        const next = moveCard(current, key, column, index);
        if (!sameLayout(next, current)) update(next);
        return;
      }
      const columnElement = hit?.closest<HTMLElement>("[data-board-drop]");
      if (columnElement) {
        const column = columnElement.dataset.boardDrop as Column;
        if (current[column].at(-1) === key) return;
        update(moveCard(current, key, column, current[column].length));
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragKey(null);
      commit(layoutRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function keyMove(event: React.KeyboardEvent<HTMLButtonElement>, key: string, column: Column) {
    const current = layoutRef.current;
    const shown = current[column].filter((item) => visible.includes(item));
    const index = shown.indexOf(key);
    const rest = current[column].filter((item) => item !== key);
    let next: BoardLayout | null = null;
    if (event.key === "ArrowUp" && index > 0) next = moveCard(current, key, column, rest.indexOf(shown[index - 1]));
    if (event.key === "ArrowDown" && index < shown.length - 1) next = moveCard(current, key, column, rest.indexOf(shown[index + 1]) + 1);
    if (event.key === "ArrowLeft" && column === "side") next = moveCard(current, key, "main", current.main.length);
    if (event.key === "ArrowRight" && column === "main") next = moveCard(current, key, "side", current.side.length);
    if (!next) return;
    event.preventDefault();
    startRef.current = current;
    update(next);
    commit(next);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-board-handle="${key}"]`)?.focus());
  }

  function reset() {
    startRef.current = layoutRef.current;
    const next = normalizeLayout(null, defaults, cards.map((card) => card.key));
    update(next);
    commit(next);
  }

  const renderColumn = (column: Column) => (
    <div data-board-drop={column} className={`grid min-w-0 content-start gap-6 ${column === "main" ? "" : "lg:min-h-40"} ${dragKey ? "rounded-[30px] outline-2 outline-dashed outline-offset-4 outline-[#087c65]/25" : ""}`}>
      {layout[column].map((key) => {
        const card = byKey.get(key);
        if (!card || !visible.includes(key)) return null;
        const dragging = dragKey === key;
        return (
          <div
            key={key}
            data-board-card={key}
            data-board-column={column}
            className={`relative min-w-0 transition-[opacity,transform] [&>section>*:first-child]:pr-10 ${dragging ? "z-10 scale-[1.01] opacity-70 [&>section]:shadow-[0_18px_40px_rgba(8,124,101,0.18)] [&>section]:ring-2 [&>section]:ring-[#087c65]" : ""}`}
          >
            {card.node}
            <button
              type="button"
              data-board-handle={key}
              onPointerDown={(event) => startDrag(event, key)}
              onKeyDown={(event) => keyMove(event, key, column)}
              className={`absolute right-3 top-3 inline-flex h-9 w-9 touch-none items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 sm:right-4 sm:top-4 ${dragging ? "cursor-grabbing bg-neutral-100 text-neutral-800" : "cursor-grab"}`}
              aria-label={`Mover la tarjeta "${card.title}". Arrástrala, o usa las flechas del teclado.`}
              title="Arrastra para ordenar"
            >
              <GripVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
        <p className="flex items-center gap-1.5">
          <GripVertical className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          Arrastra cada tarjeta desde este ícono para ordenarla a tu gusto.
        </p>
        <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-neutral-700 transition hover:bg-white hover:text-neutral-950">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Orden original
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {renderColumn("main")}
        {renderColumn("side")}
      </div>
    </div>
  );
}
