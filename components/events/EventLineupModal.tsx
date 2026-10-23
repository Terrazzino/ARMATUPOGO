"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface LineupProject {
  id: string;
  nombre: string;
  genero: string;
  links: Array<{ label: string; url: string }>;
}

interface EventLineupModalProps {
  eventTitle: string;
  projects: LineupProject[];
}

export function EventLineupModal({ eventTitle, projects }: EventLineupModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 flex-1 items-center justify-center border border-neutral-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-red-500 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Bandas de la noche
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lineup-title"
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto border border-neutral-700 bg-neutral-950 shadow-2xl shadow-black"
          >
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-neutral-800 bg-neutral-950 p-5 sm:p-6">
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-red-500">
                  Line-up confirmado
                </p>
                <h2 id="lineup-title" className="text-xl font-black text-white sm:text-2xl">
                  {eventTitle}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar bandas de la noche"
                className="grid h-11 w-11 shrink-0 place-items-center border border-neutral-700 text-2xl text-neutral-300 hover:border-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              {projects.length === 0 ? (
                <p className="border border-dashed border-neutral-700 p-5 text-sm text-neutral-400">
                  Todavía no hay bandas confirmadas públicamente para esta fecha.
                </p>
              ) : (
                projects.map((project, index) => (
                  <article key={project.id} className="border-l-2 border-red-600 bg-neutral-900 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Banda {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">{project.nombre}</h3>
                    <p className="text-sm text-neutral-400">{project.genero}</p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-bold text-red-400 hover:text-red-300 hover:underline"
                      >
                        Ver perfil
                      </Link>
                      {project.links.map((link) => (
                        <a
                          key={`${project.id}-${link.label}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-300 hover:text-white hover:underline"
                        >
                          {link.label}
                          <span className="sr-only"> (abre en una pestaña nueva)</span>
                        </a>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
