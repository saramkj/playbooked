export const templateSeedData = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Earnings Event Review",
    templateType: "earnings",
    version: 1,
    checklistItemsJson: [
      {
        id: "guidance-path",
        label: "Document the likely guidance path.",
        help_text: "Capture the expected management tone and the scenario that would invalidate it.",
      },
      {
        id: "risk-line",
        label: "Write the invalidation line before the event.",
        help_text: "State what would make the setup wrong instead of reacting after the print.",
      },
      {
        id: "position-plan",
        label: "Size risk before planning the trade.",
        help_text: "Use max loss to constrain the plan instead of letting sizing drift.",
      },
    ],
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Macro Catalyst Checklist",
    templateType: "macro",
    version: 1,
    checklistItemsJson: [
      {
        id: "consensus-range",
        label: "Record the consensus range.",
        help_text: "Write the market expectation and the surprise threshold that matters.",
      },
      {
        id: "linked-ticker",
        label: "Tie the catalyst to the watched ticker.",
        help_text: "Explain why this macro release matters to the instrument you want to study.",
      },
      {
        id: "fallback-plan",
        label: "Write the no-trade fallback.",
        help_text: "State the conditions under which you will not plan a paper trade at all.",
      },
    ],
  },
] as const;
