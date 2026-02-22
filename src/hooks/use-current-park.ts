"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { createElement } from "react";

const PARK_COOKIE_KEY = "bee2waste-current-park";

interface ParkContextValue {
  currentParkId: string | null;
  setPark: (parkId: string | null) => void;
}

const ParkContext = createContext<ParkContextValue | null>(null);

export function ParkProvider({ children }: { children: ReactNode }) {
  const [currentParkId, setCurrentParkId] = useState<string | null>(null);

  useEffect(() => {
    const stored = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${PARK_COOKIE_KEY}=`))
      ?.split("=")[1];
    if (stored) {
      setCurrentParkId(stored);
    }
  }, []);

  const setPark = useCallback((parkId: string | null) => {
    setCurrentParkId(parkId);
    if (parkId) {
      document.cookie = `${PARK_COOKIE_KEY}=${parkId};path=/;max-age=${60 * 60 * 24 * 365}`;
    } else {
      document.cookie = `${PARK_COOKIE_KEY}=;path=/;max-age=0`;
    }
  }, []);

  return createElement(ParkContext.Provider, { value: { currentParkId, setPark } }, children);
}

export function useCurrentPark() {
  const ctx = useContext(ParkContext);
  if (!ctx) {
    throw new Error("useCurrentPark must be used within a ParkProvider");
  }
  return ctx;
}
