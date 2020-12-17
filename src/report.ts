import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";

if (import.meta.env.MODE !== "development") {
  Sentry.init({
    dsn:
      "https://2c3ec152a48344829f1aac2c608affe6@o492889.ingest.sentry.io/5561026",
    autoSessionTracking: true,
    integrations: [new Integrations.BrowserTracing()],
  });
}

export function reportError(error: Error) {
  console.error(error);
  Sentry.captureException(error);
}
