import { describe, expect, it } from "vitest";
import { procurementRowToRecord, serializeProcurementRun } from "./db";
import {
  applyFeasibility,
  defaultRequest,
  defaultScenario,
  generateForecast,
  rankCandidates,
  runDecisionEngine,
} from "../shared/dockflow";

describe("DockFlow decision engine", () => {
  it("rejects infeasible vessels before ranking", () => {
    const result = applyFeasibility(defaultRequest);
    const rejected = result.find((item) => item.candidate.name === "MV Horizon Cedar");
    expect(rejected?.feasible).toBe(false);
    expect(rejected?.rejectionReason).toContain("Port draft");
    expect(result.filter((item) => item.feasible).length).toBe(3);
  });

  it("produces uncertainty-aware forecast ranges", () => {
    const forecast = generateForecast(defaultRequest, defaultScenario);
    expect(forecast).toHaveLength(8);
    expect(forecast.every((point) => point.low < point.freight && point.freight < point.high)).toBe(true);
  });

  it("changes ranking when the strategy profile changes", () => {
    const costFirst = rankCandidates(defaultRequest, defaultScenario, "cost");
    const riskFirst = rankCandidates(defaultRequest, defaultScenario, "risk");
    expect(costFirst[0]?.candidate.name).not.toBe(riskFirst[0]?.candidate.name);
  });

  it("makes scenario shocks visible in model outputs", () => {
    const calm = runDecisionEngine(defaultRequest, defaultScenario, "balanced");
    const shock = runDecisionEngine(defaultRequest, { freight: 20, congestion: 35, fuel: 20, demand: 15 }, "balanced");
    expect(shock.forecast[3].freight).toBeGreaterThan(calm.forecast[3].freight);
    expect(shock.recommended?.landedCost).toBeGreaterThan(calm.recommended?.landedCost ?? 0);
    expect(shock.recommended?.deliveryDays).toBeGreaterThan(calm.recommended?.deliveryDays ?? 0);
    expect(shock.forecast[3].congestionLow).toBeLessThan(shock.forecast[3].congestion);
    expect(shock.forecast[3].deliveryHigh).toBeGreaterThan(shock.forecast[3].delivery);
  });

  it("validates inputs before a run is persisted", () => {
    const invalid = { ...defaultRequest, quantity: 200 };
    const result = runDecisionEngine(invalid, defaultScenario, "balanced");
    expect(result.validation.valid).toBe(false);
    expect(result.validation.errors.quantity).toBeTruthy();
  });

  it("round-trips persisted request and result payloads", () => {
    const result = runDecisionEngine(defaultRequest, defaultScenario, "balanced");
    const payload = serializeProcurementRun(defaultRequest, result);
    const restored = procurementRowToRecord({ id: 42, status: "complete", createdAt: new Date("2026-09-04T00:00:00.000Z"), ...payload });
    expect(restored.id).toBe(42);
    expect(restored.request.origin).toBe(defaultRequest.origin);
    expect(restored.result.recommended?.candidate.name).toBe(result.recommended?.candidate.name);
  });
});
