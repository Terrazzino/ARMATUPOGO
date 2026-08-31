/**
 * Botón de logout
 * Client Component
 */

"use client";

import { useState } from "react";
import { logoutUser } from "@/app/actions/auth";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    await logoutUser();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
