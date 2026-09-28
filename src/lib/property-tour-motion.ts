export type TourDirection = "forward" | "back" | "left" | "right";

export function tourDragSpeed(pointerType: string) {
  return pointerType === "touch" ? -0.3 : 0.3;
}

// Held controls use elapsed time, not click repetition. A quick tap still travels one small step.
export class TourMotion {
  private direction: TourDirection | null = null;
  private held = false;
  private remaining = 0;
  private speed = 0;

  start(direction: TourDirection) {
    this.cancel();
    this.direction = direction;
    this.held = true;
    this.remaining = 0.1;
  }

  release() {
    this.held = false;
    this.remaining = Math.max(this.remaining, this.speed * 0.06);
  }

  cancel() {
    this.direction = null;
    this.held = false;
    this.remaining = this.speed = 0;
  }

  step(elapsed: number) {
    if (!this.direction || !Number.isFinite(elapsed) || elapsed <= 0) return null;
    const dt = Math.min(elapsed, 0.05);
    const target = this.held ? 0.45 : Math.min(0.45, this.remaining * 14);
    this.speed += (target - this.speed) * (1 - Math.exp(-dt / 0.08));
    const distance = Math.min(this.speed * dt, this.held ? Infinity : this.remaining);
    const direction = this.direction;
    this.remaining = Math.max(0, this.remaining - distance);
    if (!this.held && this.remaining < 0.0001) this.cancel();
    return { direction, distance };
  }
}
