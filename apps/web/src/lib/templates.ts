import { apiFetch } from './api';

export type TemplateChecklistItem = {
  id: string;
  label: string;
  help_text?: string;
};

export type Template = {
  template_id: string;
  name: string;
  template_type: string;
  version: number;
  checklist_items: TemplateChecklistItem[];
  created_at: string;
  updated_at: string;
};

type TemplatesResponse = {
  data: Template[];
};

export async function listTemplates() {
  return apiFetch<TemplatesResponse>('/api/templates');
}
