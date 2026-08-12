import { SiteIcon } from "@/components/icon/SiteIcon";
import { Link } from "@tanstack/react-router";

export function RouterNotFoundComponent() {
  return (
    <div
      data-test="router-not-found"
      className="landing-void-surface relative flex min-h-screen flex-col"
    >
      <div className="landing-void-glow-center pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
        <RouterNotFoundContent />
      </div>
    </div>
  );
}

export function RouterNotFoundProduction() {
  return (
    <div
      data-test="router-not-found-production"
      className="landing-void-surface relative flex min-h-screen flex-col items-center justify-center px-6 py-20"
    >
      <div className="landing-void-glow-center pointer-events-none absolute inset-0" />
      <div className="relative z-10">
        <RouterNotFoundContent />
      </div>
    </div>
  );
}

/** In-layout not-found for shells that already provide page chrome (e.g. backstage sidebar). */
export function RouterNotFoundSection() {
  return (
    <div
      data-test="router-not-found-section"
      className="-m-6 flex min-h-screen h-full flex-1 flex-col items-center justify-center p-6 w-full"
    >
      <div className="landing-void-surface relative w-full max-w-lg overflow-hidden rounded-2xl px-6 py-16">
        <div className="landing-void-glow-center pointer-events-none absolute inset-0" />
        <div className="relative z-10">
          <RouterNotFoundContent homeTo="/" homeLabel="Back to projects" />
        </div>
      </div>
    </div>
  );
}

interface RouterNotFoundContentProps {
  homeTo?: "/";
  homeLabel?: string;
}

function RouterNotFoundContent({
  homeTo = "/",
  homeLabel = "Back home",
}: RouterNotFoundContentProps) {
  return (
    <div className="flex max-w-md flex-col items-center text-center">
      <SiteIcon size={88} className="text-landing-sage/35" aria-hidden />

      <p className="mt-8 text-xl tracking-[0.32em] text-landing-sage/50 uppercase">404</p>

      <h1 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">
        Page not found
      </h1>

      <p className="mt-5 text-base leading-7 text-landing-sage/65">
        The page you&apos;re looking for doesn&apos;t exist or may have moved. Head back home and
        try another path.
      </p>

      <svg
        viewBox="0 0 400 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mt-10 h-5 w-full max-w-xs text-landing-sage/25"
        aria-hidden="true"
      >
        <path
          d="M0 14C60 4 120 22 200 12C280 2 340 20 400 10"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={homeTo}
          data-test="router-not-found-home"
          className="rounded-full border border-landing-sage/20 bg-landing-sage/8 px-6 py-2.5 text-sm text-landing-sage transition-colors hover:bg-landing-sage/14"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
