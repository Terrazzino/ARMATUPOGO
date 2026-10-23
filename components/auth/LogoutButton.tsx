/**
 * Botón de logout
 * Client Component
 */

"use client";

import { useState } from "react";
import { logoutUser } from "@/app/actions/auth";

interface LogoutButtonProps {
  variant?: "public" | "dashboard";
}

export function LogoutButton({ variant = "public" }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    await logoutUser();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      aria-busy={isLoading}
      className={
        variant === "dashboard"
          ? "atp-button atp-button-ghost min-h-9 whitespace-nowrap px-2.5 text-xs text-neutral-400 hover:text-red-300 sm:px-3 sm:text-sm"
          : "px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      }
    >
      {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
