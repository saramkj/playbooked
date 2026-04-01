import { apiFetch } from './api';
import type { TemplateChecklistItem } from './templates';

export type Playbook = {
  playbook_id: string;
  event_id: string;
  template_id: string;
  template_name: string;
  thesis: string;
  key_metrics: string[];
  invalidation_rule: string;
  max_loss_percent: number | null;
  checklist_state: Record<string, boolean>;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreatePlaybookResponse = {
  data: {
    playbook_id: string;
  };
  message: string;
};

type GetPlaybookResponse = {
  data: Playbook;
};

type SavePlaybookResponse = {
  data: {
    playbook_id: string;
    updated_at: string;
  };
  message: string;
};

export type GatePreview = {
  gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
  label: string;
  passed: boolean;
  message: string;
};

export async function createPlaybook(eventId: string, templateId: string) {
  return apiFetch<CreatePlaybookResponse>(`/api/events/${eventId}/playbook`, {
    method: 'POST',
    body: {
      template_id: templateId,
    },
  });
}

export async function getPlaybook(playbookId: string) {
  return apiFetch<GetPlaybookResponse>(`/api/playbooks/${playbookId}`);
}

export async function savePlaybook(
  playbookId: string,
  input: {
    thesis: string;
    key_metrics: string[];
    invalidation_rule: string;
    max_loss_percent: number | null;
    checklist_state: Record<string, boolean>;
  },
) {
  return apiFetch<SavePlaybookResponse>(`/api/playbooks/${playbookId}`, {
    method: 'PUT',
    body: input,
  });
}

export function parseKeyMetricsInput(rawValue: string) {
  if (!rawValue.trim()) {
    return [];
  }

  return rawValue.split(',').map((value) => value.trim());
}

export function buildGatePreview(playbook: Playbook, checklistItems: TemplateChecklistItem[]) {
  const thesis = playbook.thesis.trim();
  const keyMetrics = playbook.key_metrics.map((metric) => metric.trim()).filter(Boolean);
  const invalidationRule = playbook.invalidation_rule.trim();
  const checklistComplete = checklistItems.every((item) => playbook.checklist_state[item.id] === true);

  const gates: GatePreview[] = [
    {
      gate: 'G1',
      label: 'Thesis present',
      passed: thesis.length >= 200,
      message: 'Needs at least 200 characters.',
    },
    {
      gate: 'G2',
      label: 'Key metrics',
      passed: keyMetrics.length >= 1,
      message: 'Add at least one key metric.',
    },
    {
      gate: 'G3',
      label: 'Invalidation rule',
      passed: invalidationRule.length >= 50,
      message: 'Needs at least 50 characters.',
    },
    {
      gate: 'G4',
      label: 'Max loss percent',
      passed: playbook.max_loss_percent !== null && playbook.max_loss_percent > 0,
      message: 'Max loss must be greater than zero.',
    },
    {
      gate: 'G5',
      label: 'Checklist complete',
      passed: checklistComplete,
      message: 'All checklist items must be checked.',
    },
  ];

  return {
    gates,
    passedGateCount: gates.filter((gate) => gate.passed).length,
  };
}
