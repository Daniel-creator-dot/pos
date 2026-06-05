"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Register Service Worker for offline PWA features
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope: ", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed: ", error);
          });
      });
    }

    // 2. Request persistent storage permission so transaction queues are never cleared
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persisted) => {
        if (persisted) {
          console.log("Persistent storage granted. Offline database secured.");
        } else {
          console.log("Persistent storage not granted. Offline database might be cleared under storage pressure.");
        }
      });
    }
  }, []);

  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}