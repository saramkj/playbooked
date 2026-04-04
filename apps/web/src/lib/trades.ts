import { apiFetch } from './api';
import { buildPaginationQuery, type PaginatedResponse } from './pagination';

export type TradeStatus = 'planned' | 'open' | 'closed' | 'cancelled';

export type PaperTradeListItem = {
  paper_trade_id: string;
  playbook_id: string;
  ticker: string;
  status: TradeStatus;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
};

export type PaperTradeDetail = {
  paper_trade_id: string;
  playbook_id: string;
  ticker: string;
  status: TradeStatus;
  entry_plan: string;
  stop_rule: string;
  take_profit_rule: string;
  position_size: number | null;
  pnl_percent: number | null;
  cancel_reason: string | null;
  outcome_notes: string;
  post_mortem_notes: string;
  created_at: string;
  updated_at: string;
  opened_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
};

export type TradeOutcome = 'win' | 'loss' | 'flat';

type AttemptPaperTradeResponse = {
  trade_id: string;
  redirect_url: string;
  message: string;
};

type PaperTradesListResponse = PaginatedResponse<PaperTradeListItem>;

type PaperTradeDetailResponse = {
  data: PaperTradeDetail;
};

type SavePlanResponse = {
  data: {
    paper_trade_id: string;
  };
  message: string;
};

type MarkOpenResponse = {
  data: {
    paper_trade_id: string;
    status: 'open';
    opened_at: string;
  };
  message: string;
};

type CloseTradeResponse = {
  data: {
    paper_trade_id: string;
    status: 'closed';
    closed_at: string;
    pnl_percent: number;
    outcome: TradeOutcome;
  };
  message: string;
};

type CancelTradeResponse = {
  data: {
    paper_trade_id: string;
    status: 'cancelled';
    cancelled_at: string;
  };
  message: string;
};

export async function attemptPaperTrade(playbookId: string) {
  return apiFetch<AttemptPaperTradeResponse>('/api/paper_trades/attempt', {
    method: 'POST',
    body: {
      playbook_id: playbookId,
    },
  });
}

export async function listPaperTrades(status?: TradeStatus, page = 1) {
  const query = buildPaginationQuery(page);
  if (status) {
    query.set('status', status);
  }
  return apiFetch<PaperTradesListResponse>(`/api/paper_trades?${query.toString()}`);
}

export async function getPaperTrade(paperTradeId: string) {
  return apiFetch<PaperTradeDetailResponse>(`/api/paper_trades/${paperTradeId}`);
}

export async function savePaperTradePlan(
  paperTradeId: string,
  input: {
    entry_plan: string;
    stop_rule: string;
    take_profit_rule: string;
    position_size: number;
  },
) {
  return apiFetch<SavePlanResponse>(`/api/paper_trades/${paperTradeId}/plan`, {
    method: 'PUT',
    body: input,
  });
}

export async function markPaperTradeOpen(paperTradeId: string) {
  return apiFetch<MarkOpenResponse>(`/api/paper_trades/${paperTradeId}/mark_open`, {
    method: 'POST',
    body: {
      confirm: true,
    },
  });
}

export async function closePaperTrade(
  paperTradeId: string,
  input: {
    pnl_percent: number;
    outcome_notes?: string;
    post_mortem_notes?: string;
  },
) {
  return apiFetch<CloseTradeResponse>(`/api/paper_trades/${paperTradeId}/close`, {
    method: 'POST',
    body: input,
  });
}

export async function cancelPaperTrade(paperTradeId: string, cancelReason: string) {
  return apiFetch<CancelTradeResponse>(`/api/paper_trades/${paperTradeId}/cancel`, {
    method: 'POST',
    body: {
      cancel_reason: cancelReason,
    },
  });
}
