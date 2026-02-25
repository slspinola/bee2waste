// Default PT-PT contaminant type label mapping (in-code fallback).
// Keys are the actual values returned by the BrighterBins Vision API.
// Used when the DB is unavailable or for a key not yet in the DB.
export const DEFAULT_CONTAMINANT_LABELS: Record<string, string> = {
  // Real BrighterBins API keys (confirmed from production data)
  "C&D_debris":               "Resíduos de Construção e Demolição",
  "Cardboard&packaging waste": "Cartão e Embalagens",
  "covered_truck":             "Camião com Cobertura",
  "empty_truck":               "Camião Vazio",
  "general_mixed_waste":       "Resíduos Mistos Gerais",
  "metal_waste":               "Resíduos Metálicos",
  "no_truck":                  "Sem Camião",
  "wood_waste":                "Resíduos de Madeira",
};

/**
 * Returns the human-readable PT-PT label for a contaminant API key.
 * Looks up in the provided map first (from DB), then falls back to the
 * built-in default map, then returns the raw key as-is.
 */
export function getContaminantLabel(
  apiKey: string,
  labelsMap: Record<string, string> = {}
): string {
  return labelsMap[apiKey] ?? DEFAULT_CONTAMINANT_LABELS[apiKey] ?? apiKey;
}
