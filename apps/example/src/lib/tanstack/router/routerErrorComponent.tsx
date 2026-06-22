import { useState } from "react";

interface RouterErrorComponentProps {
  error: Error;
}

export function RouterErrorComponent({ error }: RouterErrorComponentProps) {
  const [copied, setCopied] = useState(false);

  const copyStackTrace = async () => {
    if (error.stack) {
      await navigator.clipboard.writeText(error.stack);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="bg-base-200 flex h-full min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="card border-error bg-base-100 w-full max-w-[70%] border shadow-xl">
        <div className="card-body w-full">
          <h2 className="card-title text-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error.name}
          </h2>
          <p className="text-base-content/70">{error.message}</p>
          {error.stack && (
            <div className="collapse-arrow bg-base-200 collapse mt-2 w-full">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-medium">View stack trace</div>
              <div className="collapse-content">
                <div className="relative">
                  <button
                    onClick={copyStackTrace}
                    className="btn btn-sm absolute top-2 right-2 z-10"
                    title="Copy stack trace"
                  >
                    {copied ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                  <pre className="w-full overflow-x-auto text-xs">{error.stack}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
