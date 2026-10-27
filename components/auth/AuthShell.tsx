import Image from "next/image";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle: string;
  eyebrow: string;
  children: React.ReactNode;
  size?: "default" | "wide";
}

export function AuthShell({
  title,
  subtitle,
  eyebrow,
  children,
  size = "default",
}: AuthShellProps) {
  return (
    <main className="atp-page grid min-h-dvh place-items-center px-4 py-7 sm:py-8">
      <section
        aria-labelledby="auth-title"
        className={`w-full ${size === "wide" ? "max-w-2xl" : "max-w-md"}`}
      >
        <Link
          href="/"
          aria-label="Arma tu pogo - Ir a la cartelera"
          className="mx-auto mb-4 flex w-fit items-center gap-2.5 text-white transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-4 focus-visible:ring-offset-black"
        >
          <Image
            src="/branding/arma-tu-pogo-logo.optimized.webp"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
            loading="eager"
          />
          <span className="atp-heading text-2xl sm:text-3xl">Arma tu pogo</span>
        </Link>

        <div className="atp-panel overflow-hidden border-t-2 border-t-red-600 shadow-2xl shadow-black/40">
          <header className="border-b border-neutral-800 px-5 py-4 sm:px-7 sm:py-5">
            <p className="atp-kicker mb-2">{eyebrow}</p>
            <h1 id="auth-title" className="atp-heading atp-section-title">
              {title}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-neutral-400">
              {subtitle}
            </p>
          </header>

          <div className="px-5 py-5 sm:px-7 sm:py-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
