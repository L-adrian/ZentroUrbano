import { isServerTrackedEvent } from "@/lib/tracking-events";

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
};

export function trackAnalyticsEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  const gtag = (window as AnalyticsWindow).gtag;
  const sanitizedParams = sanitizeAnalyticsParams(params);

  if (gtag) {
    gtag("event", eventName, sanitizedParams);
  }

  if (isServerTrackedEvent(eventName)) {
    queueServerTracking(eventName, sanitizedParams);
  }
}

// Like trackAnalyticsEvent, but resolves once the server answered (or failed). The first answer
// sets the anonymous device cookie, so an event sent right after it counts as the same person.
export function trackAnalyticsEventThen(eventName: string, params?: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const sanitizedParams = sanitizeAnalyticsParams(params);
  (window as AnalyticsWindow).gtag?.("event", eventName, sanitizedParams);
  if (!isServerTrackedEvent(eventName)) return Promise.resolve();
  return fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, params: sanitizedParams, path: window.location.pathname }),
    keepalive: true,
  }).then(() => undefined, () => undefined);
}

function sanitizeAnalyticsParams(params?: Record<string, unknown>) {
  if (!params) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  );
}

function queueServerTracking(eventName: string, params: Record<string, unknown>) {
  const body = JSON.stringify({
    eventName,
    params,
    path: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    return;
  }

  fetch("/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics should never block the UX.
  });
}
