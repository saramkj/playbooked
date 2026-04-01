import { type Prisma } from "@prisma/client";

export type TemplateChecklistItem = {
  id: string;
  label: string;
  help_text?: string;
};

export type GateCode = "G1" | "G2" | "G3" | "G4" | "G5";

export type GateResult = {
  gate: GateCode;
  passed: boolean;
  message: string;
};

export type PlaybookPreviewInput = {
  thesis: string | null;
  keyMetricsJson: unknown;
  invalidationRule: string | null;
  maxLossPercent: Prisma.Decimal | number | null;
  checklistStateJson: unknown;
  checklistItemsJson: unknown;
};

export function parseTemplateChecklistItems(checklistItemsJson: unknown) {
  if (!Array.isArray(checklistItemsJson)) {
    return [];
  }

  return checklistItemsJson.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      "id" in item &&
      "label" in item &&
      typeof item.id === "string" &&
      typeof item.label === "string"
    ) {
      return [
        {
          id: item.id,
          label: item.label,
          ...(typeof item.help_text === "string" ? { help_text: item.help_text } : {}),
        } satisfies TemplateChecklistItem,
      ];
    }

    return [];
  });
}

export function parseKeyMetrics(keyMetricsJson: unknown) {
  if (!Array.isArray(keyMetricsJson)) {
    return [];
  }

  return keyMetricsJson.filter((value): value is string => typeof value === "string");
}

export function parseChecklistState(checklistStateJson: unknown) {
  if (!checklistStateJson || typeof checklistStateJson !== "object" || Array.isArray(checklistStateJson)) {
    return {} as Record<string, boolean>;
  }

  const parsedEntries = Object.entries(checklistStateJson).filter(
    (entry): entry is [string, boolean] => typeof entry[0] === "string" && typeof entry[1] === "boolean",
  );

  return Object.fromEntries(parsedEntries);
}

export function calculatePassedGateCount(input: PlaybookPreviewInput) {
  return evaluateProcessGate(input).passedGateCount;
}

export function evaluateProcessGate(input: PlaybookPreviewInput) {
  const thesis = input.thesis?.trim() ?? "";
  const keyMetrics = parseKeyMetrics(input.keyMetricsJson).map((metric) => metric.trim()).filter(Boolean);
  const invalidationRule = input.invalidationRule?.trim() ?? "";
  const maxLossPercent = input.maxLossPercent === null ? null : Number(input.maxLossPercent);
  const checklistState = parseChecklistState(input.checklistStateJson);
  const checklistItems = parseTemplateChecklistItems(input.checklistItemsJson);
  const checklistComplete = checklistItems.every((item) => checklistState[item.id] === true);

  const gateResults: GateResult[] = [
    {
      gate: "G1",
      passed: thesis.length >= 200,
      message: "Thesis must be at least 200 characters.",
    },
    {
      gate: "G2",
      passed: keyMetrics.length >= 1,
      message: "Add at least one key metric.",
    },
    {
      gate: "G3",
      passed: invalidationRule.length >= 50,
      message: "Invalidation rule must be at least 50 characters.",
    },
    {
      gate: "G4",
      passed: maxLossPercent !== null && Number.isFinite(maxLossPercent) && maxLossPercent > 0,
      message: "Max loss percent must be greater than 0.",
    },
    {
      gate: "G5",
      passed: checklistComplete,
      message: "Complete every checklist item.",
    },
  ];
  const passedGateCount = gateResults.filter((gate) => gate.passed).length;

  return {
    gateResults,
    gateErrors: gateResults.filter((gate) => !gate.passed),
    passedGateCount,
    totalGates: gateResults.length,
    allPassed: gateResults.every((gate) => gate.passed),
  };
}
