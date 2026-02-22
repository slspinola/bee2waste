import { NextRequest, NextResponse } from "next/server";

/**
 * Mock e-GAR / SILiAmb endpoint — simulates e-GAR validation and issuance.
 * POST /api/mock/egar
 * Body: { action: 'validate' | 'issue', egar_number?: string, ... }
 *
 * Validate: checks an e-GAR number. Numbers starting with "ERR-" simulate errors.
 * Issue: creates a new mock e-GAR number.
 */

interface ValidateBody {
  action: "validate";
  egar_number: string;
}

interface IssueBody {
  action: "issue";
  ler_code: string;
  origin_nif: string;
  destination_nif: string;
  weight_kg: number;
}

type RequestBody = ValidateBody | IssueBody;

// Some NIFs match registered demo clients, some don't (to test both flows)
const MOCK_ORIGINS = [
  { name: "Sucateira do Sul, Lda.", nif: "503456789", address: "Zona Industrial de Setúbal, Lote 12, 2900-000 Setúbal" },
  { name: "EcoRecolha Portugal", nif: "504567890", address: "Av. das Indústrias, 45, 2840-000 Seixal" },
  { name: "Empresa Avulsa, Lda.", nif: "501234567", address: "Rua das Flores, 123, 1000-100 Lisboa" },
  { name: "Resíduos do Norte, S.A.", nif: "502345678", address: "Rua Industrial, 8, 4400-000 Vila Nova de Gaia" },
];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;

  // Simulate API delay (300-1200ms)
  await new Promise((resolve) =>
    setTimeout(resolve, 300 + Math.random() * 900)
  );

  if (body.action === "validate") {
    return handleValidate(body as ValidateBody);
  }

  if (body.action === "issue") {
    return handleIssue(body as IssueBody);
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'validate' or 'issue'." },
    { status: 400 }
  );
}

function handleValidate(body: ValidateBody) {
  const { egar_number } = body;

  if (!egar_number) {
    return NextResponse.json(
      { error: "egar_number is required" },
      { status: 400 }
    );
  }

  // Numbers starting with "ERR-" simulate validation failures
  if (egar_number.startsWith("ERR-")) {
    return NextResponse.json(
      {
        valid: false,
        error: "e-GAR não encontrada ou inválida no SILiAmb.",
        egar_number,
      },
      { status: 422 }
    );
  }

  // Generate mock e-GAR data — rotate origins to test both registered and unregistered flows
  const origin = MOCK_ORIGINS[Math.floor(Math.random() * MOCK_ORIGINS.length)];
  const lerCodes = [
    "15 01 01", "15 01 02", "16 01 06", "17 04 05",
    "19 12 02", "20 01 39", "20 03 01",
  ];
  const randomLer = lerCodes[Math.floor(Math.random() * lerCodes.length)];

  return NextResponse.json({
    valid: true,
    egar_number,
    status: "active",
    origin_name: origin.name,
    origin_nif: origin.nif,
    origin_address: origin.address,
    transporter_name: "Transportes Silva, S.A.",
    transporter_nif: "509876543",
    transporter_plate: `${Math.random() > 0.5 ? "AA" : "BB"}-${String(Math.floor(Math.random() * 100)).padStart(2, "0")}-${Math.random() > 0.5 ? "CC" : "DD"}`,
    ler_code: randomLer,
    declared_weight_kg: Math.round(1000 + Math.random() * 20000),
    issue_date: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
}

function handleIssue(body: IssueBody) {
  const { ler_code, origin_nif, destination_nif, weight_kg } = body;

  if (!ler_code || !weight_kg) {
    return NextResponse.json(
      { error: "ler_code and weight_kg are required" },
      { status: 400 }
    );
  }

  // Generate a mock e-GAR number
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  const egar_number = `eGAR-${year}-${seq}`;

  return NextResponse.json({
    success: true,
    egar_number,
    status: "issued",
    ler_code,
    origin_nif: origin_nif || "000000000",
    destination_nif: destination_nif || "000000000",
    weight_kg,
    issued_at: new Date().toISOString(),
  });
}
