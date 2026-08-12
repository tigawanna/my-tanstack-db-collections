interface ReportSiteErrorData {
  name: string;
  message: string;
  stack: string | undefined;
  pathname: string;
  fingerprint: string;
}

export function reportSiteError({ data }: { data: ReportSiteErrorData }) {
  return new Promise((resolve) => {
    console.error(data);
    resolve(true);
  });
}
