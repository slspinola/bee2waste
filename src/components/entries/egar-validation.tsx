"use client";

import { useState } from "react";
import { FileCheck, Search, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EgarData {
  valid: boolean;
  egar_number: string;
  origin_name?: string;
  origin_nif?: string;
  origin_address?: string;
  transporter_name?: string;
  transporter_nif?: string;
  transporter_plate?: string;
  ler_code?: string;
  declared_weight_kg?: number;
  error?: string;
}

interface EgarValidationProps {
  onValidated: (data: EgarData) => void;
  disabled?: boolean;
}

export function EgarValidation({ onValidated, disabled }: EgarValidationProps) {
  const [egarNumber, setEgarNumber] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<EgarData | null>(null);

  async function handleValidate() {
    if (!egarNumber.trim()) return;
    setIsValidating(true);
    setResult(null);

    try {
      const res = await fetch("/api/mock/egar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", egar_number: egarNumber.trim() }),
      });
      const data = await res.json();
      setResult(data);
      if (data.valid) {
        onValidated(data);
      }
    } catch {
      setResult({ valid: false, egar_number: egarNumber, error: "Erro de comunicação com SILiAmb" });
    }
    setIsValidating(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Validação e-GAR</h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={egarNumber}
          onChange={(e) => setEgarNumber(e.target.value)}
          placeholder="Introduza o número e-GAR (ex: eGAR-2026-001234)"
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled || isValidating}
          onKeyDown={(e) => e.key === "Enter" && handleValidate()}
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={disabled || isValidating || !egarNumber.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {isValidating ? "A validar..." : "Validar"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Use &quot;ERR-&quot; como prefixo para simular erro de validação (ex: ERR-001)
      </p>

      {result && (
        <div className={cn(
          "rounded-lg border p-4",
          result.valid
            ? "border-success/30 bg-success-surface"
            : "border-destructive/30 bg-destructive-surface"
        )}>
          <div className="flex items-center gap-2 mb-3">
            {result.valid ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium text-success">e-GAR válida</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="font-medium text-destructive">
                  {result.error || "e-GAR inválida"}
                </span>
              </>
            )}
          </div>

          {result.valid && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Origem:</span>
                <p className="font-medium">{result.origin_name}</p>
                <p className="text-xs text-muted-foreground">NIF: {result.origin_nif}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Transportador:</span>
                <p className="font-medium">{result.transporter_name}</p>
                <p className="text-xs text-muted-foreground">Matrícula: {result.transporter_plate}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Código LER:</span>
                <p className="font-mono font-medium">{result.ler_code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Peso Declarado:</span>
                <p className="font-mono font-medium">
                  {result.declared_weight_kg?.toLocaleString("pt-PT")} kg
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
