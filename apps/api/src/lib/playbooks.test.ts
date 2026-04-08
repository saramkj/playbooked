import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculatePassedGateCount, evaluateProcessGate } from "./playbooks.js";

function buildValidGateInput() {
  return {
    thesis: "A".repeat(200),
    keyMetricsJson: ["Revenue growth"],
    invalidationRule: "B".repeat(50),
    maxLossPercent: new Prisma.Decimal(2.5),
    checklistStateJson: {
      prep: true,
      risk: true,
    },
    checklistItemsJson: [
      {
        id: "prep",
        label: "Prep complete",
      },
      {
        id: "risk",
        label: "Risk reviewed",
      },
    ],
  };
}

describe("evaluateProcessGate", () => {
  it("passes all five gates when the playbook is complete", () => {
    const result = evaluateProcessGate(buildValidGateInput());

    expect(result.allPassed).toBe(true);
    expect(result.passedGateCount).toBe(5);
    expect(result.gateErrors).toEqual([]);
  });

  it("fails G1 when the thesis is shorter than 200 characters", () => {
    const result = evaluateProcessGate({
      ...buildValidGateInput(),
      thesis: "Too short",
    });

    expect(result.allPassed).toBe(false);
    expect(result.passedGateCount).toBe(4);
    expect(result.gateErrors).toEqual([
      {
        gate: "G1",
        passed: false,
        message: "Thesis must be at least 200 characters.",
      },
    ]);
  });

  it("fails G2 when no key metrics are present", () => {
    const result = evaluateProcessGate({
      ...buildValidGateInput(),
      keyMetricsJson: [],
    });

    expect(result.allPassed).toBe(false);
    expect(result.passedGateCount).toBe(4);
    expect(result.gateErrors).toEqual([
      {
        gate: "G2",
        passed: false,
        message: "Add at least one key metric.",
      },
    ]);
  });

  it("fails G3 when the invalidation rule is shorter than 50 characters", () => {
    const result = evaluateProcessGate({
      ...buildValidGateInput(),
      invalidationRule: "Needs more detail",
    });

    expect(result.allPassed).toBe(false);
    expect(result.passedGateCount).toBe(4);
    expect(result.gateErrors).toEqual([
      {
        gate: "G3",
        passed: false,
        message: "Invalidation rule must be at least 50 characters.",
      },
    ]);
  });

  it("fails G4 when max loss percent is not greater than zero", () => {
    const result = evaluateProcessGate({
      ...buildValidGateInput(),
      maxLossPercent: new Prisma.Decimal(0),
    });

    expect(result.allPassed).toBe(false);
    expect(result.passedGateCount).toBe(4);
    expect(result.gateErrors).toEqual([
      {
        gate: "G4",
        passed: false,
        message: "Max loss percent must be greater than 0.",
      },
    ]);
  });

  it("fails G5 when any checklist item is incomplete", () => {
    const result = evaluateProcessGate({
      ...buildValidGateInput(),
      checklistStateJson: {
        prep: true,
        risk: false,
      },
    });

    expect(result.allPassed).toBe(false);
    expect(result.passedGateCount).toBe(4);
    expect(result.gateErrors).toEqual([
      {
        gate: "G5",
        passed: false,
        message: "Complete every checklist item.",
      },
    ]);
  });

  it("calculates the passed gate count for mixed gate results", () => {
    const passedGateCount = calculatePassedGateCount({
      ...buildValidGateInput(),
      thesis: "Short thesis",
      keyMetricsJson: [],
      checklistStateJson: {
        prep: true,
        risk: false,
      },
    });

    expect(passedGateCount).toBe(2);
  });
});
