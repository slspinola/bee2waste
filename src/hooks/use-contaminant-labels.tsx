"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getContaminantLabelsMap, getContaminantColorsMap } from "@/actions/contaminant-labels";
import { DEFAULT_CONTAMINANT_LABELS } from "@/lib/contaminant-labels";

type LabelsMap = Record<string, string>;
type ColorsMap = Record<string, string>;

interface ContaminantLabelsContextValue {
  labelsMap: LabelsMap;
  colorsMap: ColorsMap;
  /** Call after saving changes in settings so all consumers see fresh data immediately. */
  refresh: () => void;
}

const ContaminantLabelsContext = createContext<ContaminantLabelsContextValue>({
  labelsMap: DEFAULT_CONTAMINANT_LABELS,
  colorsMap: {},
  refresh: () => {},
});

export function ContaminantLabelsProvider({ children }: { children: React.ReactNode }) {
  const [labelsMap, setLabelsMap] = useState<LabelsMap>(DEFAULT_CONTAMINANT_LABELS);
  const [colorsMap, setColorsMap] = useState<ColorsMap>({});

  const fetchData = useCallback(async () => {
    try {
      const [labels, colors] = await Promise.all([
        getContaminantLabelsMap(),
        getContaminantColorsMap(),
      ]);
      setLabelsMap({ ...DEFAULT_CONTAMINANT_LABELS, ...labels });
      setColorsMap(colors);
    } catch {
      // silently keep current values on error
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ContaminantLabelsContext.Provider value={{ labelsMap, colorsMap, refresh: fetchData }}>
      {children}
    </ContaminantLabelsContext.Provider>
  );
}

/**
 * Returns the contaminant labels map, colors map, and a refresh function.
 * Falls back to DEFAULT_CONTAMINANT_LABELS (no colors) until the DB data loads.
 *
 * Usage:
 *   const { labelsMap, colorsMap, refresh } = useContaminantLabels();
 *   labelsMap["metal_waste"] // → "Resíduos Metálicos"
 *   colorsMap["metal_waste"] // → "#ef4444" (if set)
 *   refresh()                // call after saving to push updates to all consumers
 */
export function useContaminantLabels(): ContaminantLabelsContextValue {
  return useContext(ContaminantLabelsContext);
}
