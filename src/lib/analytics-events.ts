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

  queueServerTracking(eventName, sanitizedParams);
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
