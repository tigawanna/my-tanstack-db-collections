import { reportSiteError } from "@/modules/site-errors/report-site-error";
import { useEffect } from "react";

const reportedStoragePrefix = "site-error-reported:";

function buildSiteErrorFingerprint(pathname: string, error: Error) {
  return `${pathname}|${error.name}|${error.message}`;
}

export function useReportSiteError(error: Error) {
  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    const pathname = window.location.pathname;
    if (pathname.startsWith("/preview/error")) {
      return;
    }

    const fingerprint = buildSiteErrorFingerprint(pathname, error);
    const storageKey = `${reportedStoragePrefix}${fingerprint}`;

    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    sessionStorage.setItem(storageKey, "1");

    void reportSiteError({
      data: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        pathname,
        fingerprint,
      },
    }).catch(() => {
      sessionStorage.removeItem(storageKey);
    });
  }, [error]);
}
