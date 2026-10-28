"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "@/app/actions/notifications";

export interface NotificationItem {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string | null;
  leida: boolean;
  creadoEn: string | Date;
}

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return "Hace un momento";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Hace ${diffInDays} d`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Carga inicial de conteo de no leídas
  useEffect(() => {
    let mounted = true;
    async function loadInitialCount() {
      try {
        const res = await getUnreadCount();
        if (mounted && res.success && typeof res.count === "number") {
          setUnreadCount(res.count);
        }
      } catch {
        // Silenciar errores de polling inicial
      }
    }
    loadInitialCount();
    return () => {
      mounted = false;
    };
  }, []);

  // Cargar lista al abrir el dropdown
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await getMyNotifications(10);
      if (res.success && res.data) {
        setNotifications(res.data as NotificationItem[]);
        const unread = (res.data as NotificationItem[]).filter((n) => !n.leida).length;
        setUnreadCount(unread);
      }
    } catch {
      // Silenciar errores
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  // Cerrar al clickear afuera o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.leida) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markAsRead(notif.id);
      } catch {
        // Error silencioso, optimista preservado
      }
    }

    setIsOpen(false);

    if (notif.enlace) {
      router.push(notif.enlace);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    setUnreadCount(0);

    try {
      await markAllAsRead();
    } catch {
      // Revert si falló
      loadNotifications();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notificaciones (${unreadCount} no leídas)`
            : "Notificaciones"
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/50 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 bg-neutral-950/60">
            <h2 className="text-sm font-semibold text-white">Notificaciones</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium focus:outline-none focus:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No tenés notificaciones
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-neutral-800/60 focus:outline-none focus:bg-neutral-800/60 ${
                    notif.leida ? "bg-transparent text-neutral-300" : "bg-neutral-800/30 text-white"
                  }`}
                >
                  <div className="pt-1 shrink-0">
                    <span
                      className={`block h-2 w-2 rounded-full ${
                        notif.leida ? "bg-transparent" : "bg-red-500 ring-2 ring-red-500/20"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-xs font-semibold truncate ${notif.leida ? "text-neutral-300" : "text-white"}`}>
                        {notif.titulo}
                      </p>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        {formatRelativeTime(notif.creadoEn)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {notif.mensaje}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

