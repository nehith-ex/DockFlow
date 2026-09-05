export type Strategy = "cost" | "delivery" | "risk" | "balanced";

export type ProcurementRequest = {
  cargo: string;
  quantity: number;
  origin: string;
  destination: string;
  arrivalWindow: string;
  vesselClass: string;
  maxDraft: number;
  minDwt: number;
  cargoSensitivity: "standard" | "fragile" | "hazardous";
};

export type Scenario = {
  freight: number;
  congestion: number;
  fuel: number;
  demand: number;
};

export type ForecastPoint = {
  week: string;
  freight: number;
  low: number;
  high: number;
  congestion: number;
  congestionLow: number;
  congestionHigh: number;
  delivery: number;
  deliveryLow: number;
  deliveryHigh: number;
  confidence: number;
};

export type DecisionTraceStep = {
  id: number;
  label: string;
  status: "complete";
  detail: string;
};

export type VesselCandidate = {
  name: string;
  operator: string;
  vesselClass: "Handysize" | "Supramax" | "Panamax";
  dwt: number;
  draft: number;
  cargoes: string[];
  baseCost: number;
  transitDays: number;
  reliability: number;
  risk: number;
  emissions: number;
};

export type FeasibilityResult = {
  candidate: VesselCandidate;
  feasible: boolean;
  checks: { label: string; passed: boolean; detail: string }[];
  rejectionReason?: string;
};

export type RankedVessel = FeasibilityResult & {
  landedCost: number;
  deliveryDays: number;
  riskScore: number;
  costScore: number;
  deliveryScore: number;
  resilienceScore: number;
  overallScore: number;
  rationale: string;
  flags: string[];
};

export const defaultRequest: ProcurementRequest = {
  cargo: "Thermal coal",
  quantity: 48_000,
  origin: "Richards Bay, South Africa",
  destination: "Paradip, India",
  arrivalWindow: "15–30 Nov 2026",
  vesselClass: "Any",
  maxDraft: 12.5,
  minDwt: 40_000,
  cargoSensitivity: "standard",
};

export const defaultScenario: Scenario = { freight: 0, congestion: 0, fuel: 0, demand: 0 };

export function validateRequest(request: ProcurementRequest) {
  const errors: Record<string, string> = {};
  if (!request.origin) errors.origin = "Select an origin port.";
  if (!request.destination) errors.destination = "Select a destination port.";
  if (request.origin === request.destination) errors.destination = "Origin and destination must differ.";
  if (!request.cargo) errors.cargo = "Select a cargo type.";
  if (!Number.isFinite(request.quantity) || request.quantity < 1_000) errors.quantity = "Quantity must be at least 1,000 MT.";
  if (!Number.isFinite(request.maxDraft) || request.maxDraft < 8 || request.maxDraft > 18) errors.maxDraft = "Draft must be between 8.0 m and 18.0 m.";
  if (!Number.isFinite(request.minDwt) || request.minDwt < 10_000) errors.minDwt = "Minimum capacity must be at least 10,000 DWT.";
  if (!request.arrivalWindow) errors.arrivalWindow = "Select an arrival window.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function buildDecisionFeatures(request: ProcurementRequest, scenario: Scenario) {
  return {
    route: `${request.origin} → ${request.destination}`,
    cargo: request.cargo,
    volumeBand: request.quantity >= 60_000 ? "large" : request.quantity >= 30_000 ? "medium" : "small",
    constraintSet: `${request.maxDraft.toFixed(1)} m draft / ${request.minDwt.toLocaleString()} DWT minimum`,
    marketPressure: Math.round((scenario.freight + scenario.congestion + scenario.fuel + scenario.demand) / 4),
  };
}

export const vesselCandidates: VesselCandidate[] = [
  {
    name: "MV Atlas Meridian",
    operator: "Northstar Bulk",
    vesselClass: "Supramax",
    dwt: 58_000,
    draft: 11.6,
    cargoes: ["Thermal coal", "Steel", "Grain", "Ore"],
    baseCost: 1_280_000,
    transitDays: 27,
    reliability: 91,
    risk: 24,
    emissions: 18,
  },
  {
    name: "MV Kaveri Star",
    operator: "Eastern Marine",
    vesselClass: "Handysize",
    dwt: 41_000,
    draft: 9.7,
    cargoes: ["Thermal coal", "Steel", "Grain"],
    baseCost: 1_340_000,
    transitDays: 31,
    reliability: 95,
    risk: 18,
    emissions: 14,
  },
  {
    name: "MV Horizon Cedar",
    operator: "Bluewater Chartering",
    vesselClass: "Panamax",
    dwt: 76_000,
    draft: 13.7,
    cargoes: ["Thermal coal", "Steel", "Ore", "Fertilizer"],
    baseCost: 1_110_000,
    transitDays: 24,
    reliability: 79,
    risk: 42,
    emissions: 25,
  },
  {
    name: "MV Bengal Crest",
    operator: "Harborline Logistics",
    vesselClass: "Supramax",
    dwt: 63_000,
    draft: 12.1,
    cargoes: ["Thermal coal", "Steel", "Ore", "Fertilizer"],
    baseCost: 1_220_000,
    transitDays: 29,
    reliability: 87,
    risk: 29,
    emissions: 20,
  },
  {
    name: "MV Pacific Tern",
    operator: "Seaboard Trade",
    vesselClass: "Handysize",
    dwt: 38_000,
    draft: 9.1,
    cargoes: ["Thermal coal", "Steel", "Grain"],
    baseCost: 1_460_000,
    transitDays: 34,
    reliability: 93,
    risk: 20,
    emissions: 13,
  },
];

const routeBase: Record<string, number> = {
  "Richards Bay, South Africa|Paradip, India": 27.4,
  "Newcastle, Australia|Visakhapatnam, India": 31.8,
  "Richards Bay, South Africa|Haldia, India": 28.6,
  "Mina Saqr, UAE|Kamarajar, India": 15.2,
};

function routeKey(request: ProcurementRequest) {
  return `${request.origin}|${request.destination}`;
}

export function generateForecast(request: ProcurementRequest, scenario: Scenario = defaultScenario): ForecastPoint[] {
  const base = routeBase[routeKey(request)] ?? 25.6;
  const routeBias = request.cargo === "Thermal coal" ? 1.8 : request.cargo === "Ore" ? 3.2 : 0.6;
  const freightShock = scenario.freight / 100;
  const demandShock = scenario.demand / 100;
  const congestionShock = scenario.congestion / 100;
  return Array.from({ length: 8 }, (_, index) => {
    const wave = Math.sin((index + 1) * 0.85) * 1.4;
    const trend = index * 0.42;
    const freight = Math.round((base + routeBias + wave + trend) * (1 + freightShock * 0.42 + demandShock * 0.18) * 10) / 10;
    const uncertainty = 1.6 + Math.abs(scenario.congestion) * 0.022 + index * 0.12;
    const congestion = Math.round((48 + index * 1.7 + congestionShock * 28 + demandShock * 8 + Math.cos(index) * 3) * 10) / 10;
    const delivery = Math.round((base + index * 0.35 + congestion * 0.035 + scenario.fuel * 0.018) * 10) / 10;
    const congestionUncertainty = Math.round((5.5 + Math.abs(scenario.demand) * 0.06 + index * 0.18) * 10) / 10;
    const deliveryUncertainty = Math.round((1.4 + Math.abs(scenario.fuel) * 0.02 + index * 0.08) * 10) / 10;
    const confidence = Math.max(62, Math.round(88 - index * 2.4 - Math.abs(scenario.congestion) * 0.12));
    return {
      week: `W${index + 1}`,
      freight,
      low: Math.round((freight - uncertainty) * 10) / 10,
      high: Math.round((freight + uncertainty) * 10) / 10,
      congestion,
      congestionLow: Math.round((congestion - congestionUncertainty) * 10) / 10,
      congestionHigh: Math.round((congestion + congestionUncertainty) * 10) / 10,
      delivery,
      deliveryLow: Math.round((delivery - deliveryUncertainty) * 10) / 10,
      deliveryHigh: Math.round((delivery + deliveryUncertainty) * 10) / 10,
      confidence,
    };
  });
}

function score(value: number, min: number, max: number) {
  if (max === min) return 75;
  return Math.max(0, Math.min(100, 100 - ((value - min) / (max - min)) * 100));
}

function weights(strategy: Strategy) {
  if (strategy === "cost") return { cost: 0.6, delivery: 0.2, risk: 0.2 };
  if (strategy === "delivery") return { cost: 0.15, delivery: 0.65, risk: 0.2 };
  if (strategy === "risk") return { cost: 0.15, delivery: 0.2, risk: 0.65 };
  return { cost: 0.34, delivery: 0.33, risk: 0.33 };
}

export function applyFeasibility(request: ProcurementRequest, candidates = vesselCandidates): FeasibilityResult[] {
  return candidates.map((candidate) => {
    const checks = [
      {
        label: "Vessel class",
        passed: request.vesselClass === "Any" || candidate.vesselClass === request.vesselClass,
        detail: request.vesselClass === "Any" ? `${candidate.vesselClass} accepted` : `${candidate.vesselClass} vs ${request.vesselClass}`,
      },
      {
        label: "Port draft",
        passed: candidate.draft <= request.maxDraft,
        detail: `${candidate.draft.toFixed(1)} m / ${request.maxDraft.toFixed(1)} m limit`,
      },
      {
        label: "Cargo fit",
        passed: candidate.cargoes.includes(request.cargo),
        detail: candidate.cargoes.includes(request.cargo) ? `${request.cargo} compatible` : `No ${request.cargo.toLowerCase()} handling profile`,
      },
      {
        label: "Capacity",
        passed: candidate.dwt >= request.minDwt,
        detail: `${candidate.dwt.toLocaleString()} DWT / ${request.minDwt.toLocaleString()} DWT min`,
      },
    ];
    const failed = checks.find((check) => !check.passed);
    return {
      candidate,
      feasible: !failed,
      checks,
      rejectionReason: failed ? `${failed.label}: ${failed.detail}` : undefined,
    };
  });
}

export function rankCandidates(request: ProcurementRequest, scenario: Scenario, strategy: Strategy): RankedVessel[] {
  const feasibility = applyFeasibility(request);
  const forecast = generateForecast(request, scenario);
  const congestion = forecast[3]?.congestion ?? 50;
  const freightMultiplier = 1 + scenario.freight / 100 * 0.42 + scenario.fuel / 100 * 0.22 + scenario.demand / 100 * 0.12;
  const feasible = feasibility.filter((item) => item.feasible);
  const modeled = feasible.map((item) => {
    const candidate = item.candidate;
    const landedCost = Math.round(candidate.baseCost * freightMultiplier * (1 + congestion / 1000));
    const deliveryDays = Math.round((candidate.transitDays + congestion / 16 + Math.max(0, scenario.congestion) / 8) * 10) / 10;
    const riskScore = Math.round(Math.min(99, candidate.risk + Math.max(0, scenario.congestion) * 0.28 + Math.max(0, scenario.demand) * 0.14 + Math.max(0, scenario.fuel) * 0.08));
    return { ...item, landedCost, deliveryDays, riskScore };
  });
  const costs = modeled.map((item) => item.landedCost);
  const deliveries = modeled.map((item) => item.deliveryDays);
  const risks = modeled.map((item) => item.riskScore);
  const w = weights(strategy);
  return modeled
    .map((item) => {
      const costScore = Math.round(score(item.landedCost, Math.min(...costs), Math.max(...costs)));
      const deliveryScore = Math.round(score(item.deliveryDays, Math.min(...deliveries), Math.max(...deliveries)));
      const resilienceScore = Math.round(score(item.riskScore, Math.min(...risks), Math.max(...risks)));
      const overallScore = Math.round(costScore * w.cost + deliveryScore * w.delivery + resilienceScore * w.risk);
      const flags = [
        item.riskScore >= 40 ? "Elevated operational risk" : "Within risk tolerance",
        item.deliveryDays >= 32 ? "Longer transit window" : "Schedule aligned",
        item.candidate.draft >= request.maxDraft - 0.7 ? "Tight draft headroom" : "Draft headroom available",
      ];
      const lead = strategy === "cost" ? `lowest modeled landed cost at $${(item.landedCost / 1_000_000).toFixed(2)}M` : strategy === "delivery" ? `${item.deliveryDays.toFixed(1)} day modeled delivery with ${item.candidate.reliability}% reliability` : strategy === "risk" ? `${item.riskScore}/100 risk score and ${item.candidate.reliability}% reliability` : `the most even trade-off across cost, delivery, and risk`;
      return {
        ...item,
        costScore,
        deliveryScore,
        resilienceScore,
        overallScore,
        flags,
        rationale: `Ranked for ${strategy === "cost" ? "Cost-first" : strategy === "delivery" ? "Delivery-first" : strategy === "risk" ? "Risk-first" : "Balanced"}: ${lead}. It passes all hard constraints before preference scoring.`,
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore);
}

function strategyLabelsForTrace(strategy: Strategy) {
  return strategy === "cost" ? "Cost-first" : strategy === "delivery" ? "Delivery-first" : strategy === "risk" ? "Risk-first" : "Balanced";
}

export function runDecisionEngine(request: ProcurementRequest, scenario: Scenario = defaultScenario, strategy: Strategy = "balanced") {
  const validation = validateRequest(request);
  const features = buildDecisionFeatures(request, scenario);
  const feasibility = applyFeasibility(request);
  const forecast = generateForecast(request, scenario);
  const ranked = rankCandidates(request, scenario, strategy);
  const recommended = ranked[0];
  const decisionTrace: DecisionTraceStep[] = [
    { id: 1, label: "Validate input", status: "complete", detail: validation.valid ? "Required fields and numeric bounds passed" : `${Object.keys(validation.errors).length} input issue(s) detected` },
    { id: 2, label: "Apply hard constraints", status: "complete", detail: `${feasibility.filter((item) => item.feasible).length} feasible / ${feasibility.length} screened` },
    { id: 3, label: "Build decision features", status: "complete", detail: `${features.volumeBand} volume · ${features.marketPressure >= 10 ? "stressed" : "baseline"} market pressure` },
    { id: 4, label: "Forecast market variables", status: "complete", detail: `${forecast[3]?.confidence ?? 0}% week-04 confidence` },
    { id: 5, label: "Score cost / delivery / risk", status: "complete", detail: "Normalized scores built for feasible candidates" },
    { id: 6, label: "Apply priority profile", status: "complete", detail: `${strategyLabelsForTrace(strategy)} weights applied` },
    { id: 7, label: "Optimize or rank", status: "complete", detail: `${ranked.length} candidates ranked` },
    { id: 8, label: "Produce suggestion", status: "complete", detail: recommended ? `${recommended.candidate.name} selected` : "No feasible suggestion" },
  ];
  return {
    request,
    scenario,
    strategy,
    validation,
    features,
    decisionTrace,
    feasibility,
    forecast,
    ranked,
    recommended,
    feasibleCount: feasibility.filter((item) => item.feasible).length,
    rejectedCount: feasibility.filter((item) => !item.feasible).length,
    generatedAt: new Date().toISOString(),
  };
}
