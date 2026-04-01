import { apiFetch } from './api';

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

type AttemptPaperTradeResponse = {
  trade_id: string;
  redirect_url: string;
  message: string;
};

type PaperTradesListResponse = {
  data: PaperTradeListItem[];
};

type PaperTradeDetailResponse = {
  data: PaperTradeDetail;
};

export async function attemptPaperTrade(playbookId: string) {
  return apiFetch<AttemptPaperTradeResponse>('/api/paper_trades/attempt', {
    method: 'POST',
    body: {
      playbook_id: playbookId,
    },
  });
}

export async function listPaperTrades(status?: TradeStatus) {
  const query = new URLSearchParams();

  if (status) {
    query.set('status', status);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiFetch<PaperTradesListResponse>(`/api/paper_trades${suffix}`);
}

export async function getPaperTrade(paperTradeId: string) {
  return apiFetch<PaperTradeDetailResponse>(`/api/paper_trades/${paperTradeId}`);
}
