type GoogleTag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
    __zentroGaMeasurementId?: string;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

if (measurementId) {
  try {
    window.dataLayer ??= [];
    window.gtag ??= function gtag() {
      // gtag.js only recognizes the native arguments object; rest parameters would silently break GA.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };

    if (window.__zentroGaMeasurementId !== measurementId) {
      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false });
      window.__zentroGaMeasurementId = measurementId;
    }
  } catch {
    // Analytics failures must never prevent the application from hydrating.
  }
}

export {};
