import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadingState } from '../components/LoadingState';
import { ApiError } from '../lib/api';
import { getDashboardWeeklyStats, type DashboardWeeklyStats } from '../lib/dashboard';
import { useSession } from '../session/useSession';

export function DashboardPage() {
  const { refreshSession } = useSession();
  const [stats, setStats] = useState<DashboardWeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await getDashboardWeeklyStats();
      setStats(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refreshSession();
        return;
      }

      setPageError(error instanceof ApiError ? error.message : 'Unable to load your weekly dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return <LoadingState label="Loading weekly dashboard..." />;
  }

  const metrics = stats
    ? [
        {
          label: 'Process score',
          value: formatWholePercent(stats.process_score_week, { fallback: 'Not available', maximumFractionDigits: 1 }),
          description: stats.attempt_count_scored > 0 ? 'Average scored process quality this week.' : 'No scored attempts this week.',
        },
        {
          label: 'Scored attempts',
          value: formatCount(stats.attempt_count_scored),
          description: stats.attempt_count_scored > 0 ? 'Attempts included in this week\'s process score.' : 'No scored attempts this week.',
        },
        {
          label: 'Planned conflicts',
          value: formatCount(stats.planned_conflicts_this_week),
          description: 'Blocked because a planned trade already existed.',
        },
        {
          label: 'Closed trades',
          value: formatCount(stats.closed_trade_count),
          description: stats.closed_trade_count > 0 ? 'Trades closed inside this UTC week.' : 'No closed trades this week.',
        },
        {
          label: 'Win rate',
          value: formatRatioPercent(stats.win_rate, { fallback: 'Not available' }),
          description: stats.closed_trade_count > 0 ? 'Wins are closed trades with P/L above 0%.' : 'No closed trades this week.',
        },
        {
          label: 'Avg P/L',
          value: formatSignedPercent(stats.avg_pnl_percent, { fallback: 'Not available' }),
          description: stats.closed_trade_count > 0 ? 'Average P/L across closed trades this week.' : 'No closed trades this week.',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Dashboard</p>
        <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Weekly process dashboard</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Track this week&apos;s process score, scored attempts, planned conflicts, closed trades, win
          rate, and avg P/L.
        </p>
      </section>

      {pageError ? <ErrorBanner message={pageError} /> : null}

      {stats ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label}>
                <p className="text-sm text-stone-500">{metric.label}</p>
                <p className="mt-4 text-2xl font-semibold text-stone-900 sm:text-3xl">{metric.value}</p>
                <p className="mt-2 text-sm text-stone-500">{metric.description}</p>
              </Card>
            ))}
          </section>

          {stats.attempt_count_scored === 0 ? (
            <EmptyState
              title="No scored attempts this week."
              description="Complete scored attempts to populate the weekly process score."
            />
          ) : null}

          {stats.closed_trade_count === 0 ? (
            <EmptyState
              title="No closed trades this week."
              description="Close trades this week to populate win rate and avg P/L."
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatWholePercent(
  value: number | null,
  options: {
    fallback: string;
    maximumFractionDigits?: number;
  },
) {
  if (value === null) {
    return options.fallback;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value / 100);
}

function formatRatioPercent(
  value: number | null,
  options: {
    fallback: string;
    maximumFractionDigits?: number;
  },
) {
  if (value === null) {
    return options.fallback;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value);
}

function formatSignedPercent(value: number | null, options: { fallback: string }) {
  if (value === null) {
    return options.fallback;
  }

  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(absValue);
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${formatted}%`;
}
