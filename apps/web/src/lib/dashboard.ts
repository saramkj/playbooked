import { apiFetch } from './api';

export type DashboardWeeklyStats = {
  week_start_at: string;
  week_end_at: string;
  process_score_week: number | null;
  attempt_count_scored: number;
  planned_conflicts_this_week: number;
  closed_trade_count: number;
  win_rate: number | null;
  avg_pnl_percent: number | null;
};

export type DashboardWeeklyResponse = {
  data: DashboardWeeklyStats;
};

export function getDashboardWeeklyStats() {
  return apiFetch<DashboardWeeklyResponse>('/api/dashboard/weekly');
}
