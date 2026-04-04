import { apiFetch } from './api';
import { buildPaginationQuery, type PaginatedResponse } from './pagination';

export type EventStatus = 'upcoming' | 'completed';
export type EventType = 'earnings' | 'macro' | 'company_event' | 'other';

export type EventListItem = {
  event_id: string;
  watchlist_item_id: string;
  ticker: string;
  event_type: EventType;
  status: EventStatus;
  event_datetime_at: string;
  created_at: string;
};

export type EventDetail = {
  event_id: string;
  status: EventStatus;
  event_type: EventType;
  event_datetime_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type EventDetailResponse = {
  data: {
    event: EventDetail;
    watchlist_item: {
      watchlist_item_id: string;
      ticker: string;
      tags: string[];
    };
    playbook_summary: {
      playbook_id: string;
      template_name: string;
      passed_gate_count: number;
    } | null;
    planned_trade_id: string | null;
  };
};

type EventsListResponse = PaginatedResponse<EventListItem>;

type CreateEventResponse = {
  data: {
    event_id: string;
  };
  message: string;
};

type MarkCompletedResponse = {
  data: {
    event_id: string;
    status: EventStatus;
    completed_at: string;
  };
};

export const eventTypeOptions: Array<{ value: EventType; label: string }> = [
  { value: 'earnings', label: 'Earnings' },
  { value: 'macro', label: 'Macro' },
  { value: 'company_event', label: 'Company event' },
  { value: 'other', label: 'Other' },
];

export async function listEvents(status: EventStatus = 'upcoming', page = 1) {
  const query = buildPaginationQuery(page);
  query.set('status', status);

  return apiFetch<EventsListResponse>(`/api/events?${query.toString()}`);
}

export async function createEvent(input: {
  watchlist_item_id: string;
  event_type: EventType;
  event_datetime_at: string;
  notes?: string;
}) {
  return apiFetch<CreateEventResponse>('/api/events', {
    method: 'POST',
    body: input,
  });
}

export async function getEventDetail(eventId: string) {
  return apiFetch<EventDetailResponse>(`/api/events/${eventId}`);
}

export async function markEventCompleted(eventId: string) {
  return apiFetch<MarkCompletedResponse>(`/api/events/${eventId}/mark_completed`, {
    method: 'POST',
  });
}

export function formatLocalDateTimeWithOffset(isoDateTime: string) {
  const value = new Date(isoDateTime);
  const dateLabel = value.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const offsetMinutes = -value.getTimezoneOffset();
  const offsetHours = Math.trunc(offsetMinutes / 60);
  const remainderMinutes = Math.abs(offsetMinutes % 60);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const paddedMinutes = String(remainderMinutes).padStart(2, '0');

  if (remainderMinutes === 0) {
    return `${dateLabel} (UTC${sign}${Math.abs(offsetHours)})`;
  }

  return `${dateLabel} (UTC${sign}${Math.abs(offsetHours)}:${paddedMinutes})`;
}

export function toDateTimeLocalValue(isoDateTime: string) {
  const value = new Date(isoDateTime);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toUtcIsoStringFromLocalInput(localDateTime: string) {
  if (!localDateTime.trim()) {
    return null;
  }

  const parsed = new Date(localDateTime);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}
