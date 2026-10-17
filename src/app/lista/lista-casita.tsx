"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, DoorOpen, Download, FileText, MapPin, MessageCircle, Share2, Sparkles, X } from "lucide-react";
import { trackAnalyticsEvent } from "@/lib/analytics-events";
import { listaItems, listaTotal, type ListaFx, type ListaItem, type ListaRoom } from "@/lib/lista";
import { ItemRow, ProblemsCard, type ListaMarks } from "./lista-items";

// The pixel house is drawn at 176x124 (see the casita.py source in the project files) and scaled up with
// image-rendering: pixelated. Rooms are rectangles in those native pixels; every layer shares the same frame.
const NATIVE_W = 176;
const NATIVE_H = 124;
const ASSETS = "/lista/casita";
type HouseRoom = Exclude<ListaRoom, "afuera" | "dueno">;
const HOUSE: Record<HouseRoom, { x: number; y: number; w: number; h: number; chibiX: number }> = {
  dormitorio: { x: 12, y: 28, w: 74, h: 38, chibiX: 4 },
  bano: { x: 90, y: 28, w: 74, h: 38, chibiX: 18 },
  sala: { x: 12, y: 72, w: 74, h: 38, chibiX: 16 },
  cocina: { x: 90, y: 72, w: 74, h: 38, chibiX: 36 },
};
const HOUSE_ROOMS = Object.keys(HOUSE) as HouseRoom[];
const CHIBI_W = 16;
const CHIBI_H = 24;
const STREET_Y = 112;

const ROOMS: Record<ListaRoom, { name: string; inRoom: string; note?: string }> = {
  bano: { name: "Baño", inRoom: "el baño" },
  cocina: { name: "Cocina", inRoom: "la cocina" },
  sala: { name: "Sala y entrada", inRoom: "la sala" },
  dormitorio: { name: "Dormitorio", inRoom: "el dormitorio" },
  afuera: { name: "Afuera y la zona", inRoom: "afuera", note: "Algunos se hacen otro día: de noche o en hora pico." },
  dueno: { name: "Con el dueño", inRoom: "la charla con el dueño", note: "Preguntas, papeles, plata y contrato." },
};
const ROOM_ORDER: ListaRoom[] = ["sala", "cocina", "bano", "dormitorio", "afuera", "dueno"];

const FX_TOAST: Record<ListaFx, string> = {
  gotera: "Apareció una gotera en tu casita",
  fisura: "Se dibujó la fisura en tu casita",
  cucaracha: "Apareció una cucaracha en tu casita",
  calefon: "El calefón quedó marcado en rojo",
  humedad: "La humedad ya se ve en tu casita",
};

const pct = (value: number, total: number) => `${(value / total) * 100}%`;
const itemsIn = (room: ListaRoom) => listaItems.filter(item => item.room === room);

function litRooms(marks: ListaMarks, current: ListaRoom | null) {
  return HOUSE_ROOMS.filter(room => marks.rooms.includes(room) || room === current);
}

function chibiSpot(current: ListaRoom | null) {
  if (current && current in HOUSE) {
    const room = HOUSE[current as HouseRoom];
    return { x: room.x + room.chibiX, y: room.y + room.h + 1 - CHIBI_H };
  }
  return { x: -1, y: STREET_Y + 2 - CHIBI_H };
}

function Casita({ marks, current, onPick }: { marks: ListaMarks; current: ListaRoom | null; onPick: (room: HouseRoom) => void }) {
  const lit = litRooms(marks, current);
  const fx = listaItems.filter(item => item.fx && marks.problems.includes(item.id)).map(item => item.fx as ListaFx);
  const chibi = chibiSpot(current);
  return <div className="cz-house">
    <img src={`${ASSETS}/casita-oscura.png`} alt="" width={NATIVE_W} height={NATIVE_H} />
    {lit.map(room => {
      const { x, y, w, h } = HOUSE[room];
      const clip = `inset(${pct(y, NATIVE_H)} ${pct(NATIVE_W - x - w, NATIVE_W)} ${pct(NATIVE_H - y - h, NATIVE_H)} ${pct(x, NATIVE_W)})`;
      return <img key={room} className="layer" src={`${ASSETS}/casita-luz.png`} alt="" style={{ clipPath: clip }} />;
    })}
    {[...new Set(fx)].map(effect => <img key={effect} className="layer pop" src={`${ASSETS}/problema-${effect}.png`} alt="" />)}
    <img className="cz-chibi" src={`${ASSETS}/chibi.png`} alt="" style={{ left: pct(chibi.x, NATIVE_W), top: pct(chibi.y, NATIVE_H), width: pct(CHIBI_W, NATIVE_W) }} />
    {HOUSE_ROOMS.map(room => {
      const { x, y, w, h } = HOUSE[room];
      const visited = marks.rooms.includes(room);
      const bad = itemsIn(room).some(item => marks.problems.includes(item.id));
      const style: CSSProperties = { left: pct(x, NATIVE_W), top: pct(y, NATIVE_H), width: pct(w, NATIVE_W), height: pct(h, NATIVE_H) };
      return <button key={room} type="button" className={`cz-spot${room === current ? " here" : ""}`} style={style} onClick={() => onPick(room)} aria-label={`Revisar ${ROOMS[room].inRoom}`}>
        <span className="badges">{bad && <i className="bad">!</i>}{visited && <i className="ok">✓</i>}</span>
      </button>;
    })}
    {!current && marks.rooms.length === 0 && <p className="cz-bubble">Tocá el cuarto donde estás</p>}
  </div>;
}

type Verdict = { tone: "rojo" | "amarillo" | "verde"; title: string; reason: string };

function verdictFor(marks: ListaMarks): Verdict {
  const problems = listaItems.filter(item => marks.problems.includes(item.id));
  const serious = problems.find(item => item.serious);
  const seen = new Set([...marks.done, ...marks.problems]).size;
  const plain = (item: ListaItem) => item.title.replace(/\.$/, "").toLowerCase();
  if (serious) return { tone: "rojo", title: "GAME OVER", reason: `Este depa no: ${plain(serious)}.` };
  if (problems.length) return { tone: "amarillo", title: "OJO", reason: problems.length === 1 ? "Hay 1 cosa para hablar antes de firmar." : `Hay ${problems.length} cosas para hablar antes de firmar.` };
  if (seen < 30) return { tone: "amarillo", title: "FALTA REVISAR", reason: `Revisaste ${seen} de ${listaTotal} puntos.` };
  return { tone: "verde", title: "¡A MUDARSE!", reason: "No encontraste problemas en la visita." };
}

const TONE_COLOR = { rojo: "#ff6a50", amarillo: "#ffd04a", verde: "#5fd3a0" };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the shareable card (1080x1350, the Instagram portrait size) from the same layers as the page.
async function drawCard(marks: ListaMarks, verdict: Verdict, date: string) {
  const font = new FontFace("ZUPixel", `url(${ASSETS}/PressStart2P.ttf)`);
  await font.load();
  document.fonts.add(font);
  const problems = listaItems.filter(item => marks.problems.includes(item.id));
  const effects = [...new Set(problems.map(item => item.fx).filter((effect): effect is ListaFx => Boolean(effect)))];
  const [dark, light, chibi, ...fxImages] = await Promise.all([
    loadImage(`${ASSETS}/casita-oscura.png`), loadImage(`${ASSETS}/casita-luz.png`), loadImage(`${ASSETS}/chibi.png`),
    ...effects.map(effect => loadImage(`${ASSETS}/problema-${effect}.png`)),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d")!;
  const body = getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = "#0a1510"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#13231c"; ctx.fillRect(24, 24, 1032, 1302);
  ctx.strokeStyle = "#e8b23a"; ctx.lineWidth = 6; ctx.strokeRect(34, 34, 1012, 1282);

  ctx.textBaseline = "top";
  ctx.font = "30px ZUPixel"; ctx.fillStyle = "#e8b23a";
  ctx.textAlign = "left"; ctx.fillText("MI VISITA", 90, 90);
  ctx.textAlign = "right"; ctx.fillText(date, 990, 90);

  const scale = 5, hx = 100, hy = 150;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(dark, hx, hy, NATIVE_W * scale, NATIVE_H * scale);
  for (const room of litRooms(marks, null)) {
    const { x, y, w, h } = HOUSE[room];
    ctx.drawImage(light, x, y, w, h, hx + x * scale, hy + y * scale, w * scale, h * scale);
  }
  for (const image of fxImages) ctx.drawImage(image, hx, hy, NATIVE_W * scale, NATIVE_H * scale);
  const spot = chibiSpot(null);
  ctx.drawImage(chibi, hx + spot.x * scale, hy + spot.y * scale, CHIBI_W * scale, CHIBI_H * scale);
  ctx.strokeStyle = "#0a1510"; ctx.lineWidth = 8; ctx.strokeRect(hx, hy, NATIVE_W * scale, NATIVE_H * scale);

  const tones: Verdict["tone"][] = ["rojo", "amarillo", "verde"];
  tones.forEach((tone, index) => {
    const x = 540 - 110 + index * 80, y = 800;
    ctx.fillStyle = tone === verdict.tone ? TONE_COLOR[tone] : "#2a3a32";
    ctx.fillRect(x, y, 60, 60);
    ctx.strokeStyle = "#0a1510"; ctx.lineWidth = 6; ctx.strokeRect(x, y, 60, 60);
  });

  ctx.textAlign = "center";
  ctx.font = `${verdict.title.length > 10 ? 52 : 68}px ZUPixel`;
  ctx.fillStyle = "#0a1510"; ctx.fillText(verdict.title, 546, 896);
  ctx.fillStyle = TONE_COLOR[verdict.tone]; ctx.fillText(verdict.title, 540, 890);

  ctx.font = `600 34px ${body}`; ctx.fillStyle = "#f4f2ea";
  let y = 990;
  for (const line of wrap(ctx, verdict.reason, 860)) { ctx.fillText(line, 540, y); y += 44; }

  ctx.textAlign = "left"; ctx.font = `30px ${body}`;
  y += 16;
  const shown = problems.slice(0, 4);
  for (const item of shown) {
    ctx.fillStyle = item.serious ? "#e04a30" : "#e8b23a";
    ctx.fillRect(110, y + 10, 16, 16);
    ctx.fillStyle = "#f4f2ea";
    ctx.fillText(wrap(ctx, item.title.replace(/\.$/, ""), 800)[0], 144, y);
    y += 44;
  }
  if (problems.length > shown.length) { ctx.fillStyle = "#9fd8bc"; ctx.fillText(`y ${problems.length - shown.length} más`, 144, y); }

  const seen = new Set([...marks.done, ...marks.problems]).size;
  ctx.textAlign = "center"; ctx.font = `26px ${body}`; ctx.fillStyle = "#cfe6dc";
  ctx.fillText(`${marks.done.length} bien · ${problems.length} con problema · ${listaTotal - seen} sin revisar`, 540, 1196);
  ctx.font = `22px ${body}`; ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.fillText("Es mi opinión de una visita, no un peritaje.", 540, 1234);
  ctx.font = "20px ZUPixel"; ctx.fillStyle = "#9fd8bc";
  ctx.textAlign = "left"; ctx.fillText("ZENTRO URBANO", 90, 1272);
  ctx.textAlign = "right"; ctx.fillText("zentrourbano.com/lista", 990, 1272);
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
}

function Carta({ marks, onClose }: { marks: ListaMarks; onClose: () => void }) {
  const verdict = verdictFor(marks);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const problems = listaItems.filter(item => marks.problems.includes(item.id));
  const seen = new Set([...marks.done, ...marks.problems]).size;
  const date = new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit" });
  const summary = `Mi visita a un depa: ${verdict.title}. ${verdict.reason}${problems.length ? `\n${problems.map(item => `- ${item.title}`).join("\n")}` : ""}\nHacé tu casita gratis en https://zentrourbano.com/lista`;

  useEffect(() => {
    dialog.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function share() {
    setBusy(true);
    trackAnalyticsEvent("lista_carta_compartir", { veredicto: verdict.tone });
    try {
      const blob = await drawCard(marks, verdict, date);
      if (!blob) return;
      const file = new File([blob], "mi-visita-zentro-urbano.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: summary });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      }
    } catch {
      // The person closed the share sheet, or the browser blocked it: nothing to undo.
    } finally {
      setBusy(false);
    }
  }

  // Rendered on <body> so the site header and bottom bar never sit on top of it.
  return createPortal(<div className="lst cz-modal" role="dialog" aria-modal="true" aria-label="Tu carta de la visita" onClick={onClose}>
    <div className="cz-modal-box" ref={dialog} tabIndex={-1} onClick={event => event.stopPropagation()}>
      <button type="button" className="cz-close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
      <div className={`cz-card t-${verdict.tone}`}>
        <div className="cz-card-top"><span>MI VISITA</span><span>{date}</span></div>
        <div className="cz-card-house"><Casita marks={marks} current={null} onPick={() => undefined} /></div>
        <div className="cz-light" aria-hidden="true">{(["rojo", "amarillo", "verde"] as const).map(tone => <i key={tone} className={tone === verdict.tone ? `on ${tone}` : ""} />)}</div>
        <p className="cz-over">{verdict.title}</p>
        <p className="cz-why">{verdict.reason}</p>
        {problems.length > 0 && <ul>{problems.slice(0, 6).map(item => <li key={item.id} className={item.serious ? "red" : ""}>{item.title.replace(/\.$/, "")}</li>)}</ul>}
        <p className="cz-score"><b>{marks.done.length}</b> bien · <b>{problems.length}</b> con problema · {listaTotal - seen} sin revisar</p>
        <p className="cz-fine">Es mi opinión de una visita, no un peritaje.</p>
        <div className="cz-card-foot"><span>ZENTRO URBANO</span><span>zentrourbano.com/lista</span></div>
      </div>
      <div className="cz-card-actions">
        <button type="button" className="btn pri" onClick={share} disabled={busy}>{busy ? <Download size={18} /> : <Share2 size={18} />}{busy ? "Armando la imagen…" : "Compartir mi carta"}</button>
        <a className="btn wa" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer" onClick={() => trackAnalyticsEvent("lista_share", { method: "whatsapp_carta" })}><MessageCircle size={18} />Mandar el resumen por WhatsApp</a>
      </div>
    </div>
  </div>, document.body);
}

// "Recorrer el depa": the same list, walked room by room on the pixel house. Rooms light up as you walk them,
// failed points get drawn on the house, and at the end there is a card to share.
export function CasitaWalk({ marks, save, onToggle, onFlag, onReset }: {
  marks: ListaMarks;
  save: (next: ListaMarks) => void;
  onToggle: (id: string) => void;
  onFlag: (id: string) => void;
  onReset: () => void;
}) {
  const [current, setCurrent] = useState<ListaRoom | null>(null);
  const [card, setCard] = useState(false);
  const [toast, setToast] = useState("");
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  function enter(room: ListaRoom) {
    setCurrent(room);
    trackAnalyticsEvent("lista_cuarto", { cuarto: room });
    requestAnimationFrame(() => stage.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function flag(id: string) {
    const item = listaItems.find(entry => entry.id === id);
    if (item?.fx && !marks.problems.includes(id)) setToast(FX_TOAST[item.fx]);
    onFlag(id);
  }

  function leave() {
    if (current && !marks.rooms.includes(current)) save({ ...marks, rooms: [...marks.rooms, current] });
    setCurrent(null);
    requestAnimationFrame(() => stage.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openCard() {
    setCard(true);
    trackAnalyticsEvent("lista_carta", { veredicto: verdictFor(marks).tone });
  }

  const marked = new Set([...marks.done, ...marks.problems]);
  const walked = HOUSE_ROOMS.filter(room => marks.rooms.includes(room)).length;
  const roomItems = current ? itemsIn(current) : [];

  return <div className={`cz-walk${current ? " inroom" : ""}`} ref={stage}>
    <div className="cz-stage">
      <Casita marks={marks} current={current} onPick={enter} />
      <div className="cz-progress">
        <span><b>{walked} de 4</b> cuartos · <b>{marked.size}</b> de {listaTotal} puntos</span>
        <span className="bar" aria-hidden="true"><span style={{ width: `${(marked.size / listaTotal) * 100}%` }} /></span>
        {marked.size > 0 && <button type="button" onClick={() => { onReset(); setCurrent(null); }}>Empezar de nuevo</button>}
      </div>
    </div>

    <div className="cz-panel">
      {current ? <>
        <div className="cz-roomhead">
          <button type="button" className="back" onClick={() => setCurrent(null)}><ChevronLeft size={18} />Casita</button>
          <h3>{ROOMS[current].name}</h3>
          <span>{roomItems.filter(item => marked.has(item.id)).length} de {roomItems.length}</span>
        </div>
        {ROOMS[current].note && <p className="cz-note">{ROOMS[current].note}</p>}
        <section className="lst-sec cz-sec">
          <ul>{roomItems.map(item => <ItemRow key={item.id} item={item} marks={marks} onToggle={onToggle} onFlag={flag} />)}</ul>
        </section>
        <button type="button" className="cz-next" onClick={leave}><DoorOpen size={18} />Ya revisé {ROOMS[current].inRoom}</button>
      </> : <>
        <div className="cz-rooms">
          {ROOM_ORDER.map(room => {
            const items = itemsIn(room);
            const count = items.filter(item => marked.has(item.id)).length;
            const bad = items.filter(item => marks.problems.includes(item.id)).length;
            const extra = room === "afuera" || room === "dueno";
            const Glyph = room === "afuera" ? MapPin : FileText;
            return <button key={room} type="button" className={`${extra ? "extra" : ""}${marks.rooms.includes(room) ? " done" : ""}`} onClick={() => enter(room)}>
              {extra && <Glyph size={18} aria-hidden="true" />}
              <span><b>{ROOMS[room].name}</b><small>{count} de {items.length} puntos{bad > 0 && <em> · {bad} con problema</em>}{extra && ROOMS[room].note ? ` · ${ROOMS[room].note}` : ""}</small></span>
            </button>;
          })}
        </div>
        <button type="button" className="cz-cardbtn" onClick={openCard}><Sparkles size={18} aria-hidden="true" />Ver mi carta de la visita</button>
        <ProblemsCard marks={marks} />
      </>}
    </div>

    {toast && <p className="cz-toast" role="status">{toast}</p>}
    {card && <Carta marks={marks} onClose={() => setCard(false)} />}
  </div>;
}
