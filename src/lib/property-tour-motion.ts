export type TourDirection = "forward" | "back" | "left" | "right";

export const TOUR_DRAG_SPEED = -0.3;
export const TOUR_RADIUS = 0.6;
export const TOUR_CLEARANCE = 0.25;
export const TOUR_HEIGHT_OFFSETS = [-0.15, 0, 0.15] as const;

export function tourKeyDirection(code: string): TourDirection | undefined {
  return ({ KeyW: "forward", KeyS: "back", KeyA: "left", KeyD: "right", ArrowUp: "forward", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right" } as const)[code as "KeyW"];
}

// Separate sources let a released button coexist with a held key. OS key-repeat never drives movement.
export class TourMotion {
  private inputs = new Map<string, TourDirection>();
  private right = 0;
  private forward = 0;
  private pulseTime = 0;

  press(source: string, direction: TourDirection) { this.inputs.set(source, direction); }
  start(direction: TourDirection) { this.press("button", direction); }
  release(source = "button") { return this.inputs.delete(source); }
  pulse(direction: TourDirection) { this.press("pulse", direction); this.pulseTime = 0.16; }

  cancel(source?: string) {
    if (source) {
      this.inputs.delete(source);
      if (!this.inputs.size) this.right = this.forward = 0;
      return;
    }
    this.inputs.clear();
    this.right = this.forward = this.pulseTime = 0;
  }

  step(elapsed: number) {
    if (!Number.isFinite(elapsed) || elapsed <= 0) return null;
    const dt = Math.min(elapsed, 0.05);
    if (this.pulseTime > 0) {
      this.pulseTime -= dt;
      if (this.pulseTime <= 0) this.inputs.delete("pulse");
    }
    let x = 0, z = 0;
    for (const direction of this.inputs.values()) {
      if (direction === "right") x += 1;
      if (direction === "left") x -= 1;
      if (direction === "forward") z += 1;
      if (direction === "back") z -= 1;
    }
    const length = Math.hypot(x, z);
    const targetX = length ? x / length * 0.65 : 0;
    const targetZ = length ? z / length * 0.65 : 0;
    const easing = 1 - Math.exp(-dt / 0.065);
    // Integrate the easing curve analytically so 30/60/120 Hz cover the same distance.
    const right = targetX * dt + (this.right - targetX) * 0.065 * easing;
    const forward = targetZ * dt + (this.forward - targetZ) * 0.065 * easing;
    this.right += (targetX - this.right) * easing;
    this.forward += (targetZ - this.forward) * easing;
    if (!length && Math.hypot(this.right, this.forward) < 0.0001) this.right = this.forward = 0;
    return Math.hypot(right, forward) > 0.000001 ? { right, forward } : null;
  }
}
