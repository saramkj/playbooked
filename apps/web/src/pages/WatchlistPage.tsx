import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/Input';

export function WatchlistPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Watchlist</p>
        <h1 className="text-4xl font-semibold text-stone-950">Track event candidates</h1>
        <p className="max-w-3xl text-base leading-7 text-stone-600">
          Placeholder watchlist screen with the documented add-ticker panel and room for create-event,
          edit-tags, and delete actions later.
        </p>
      </section>

      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input id="ticker" label="Ticker" hint="Normalized uppercase ticker placeholder." placeholder="AAPL" />
          <Input id="tags" label="Tags" hint="Up to 10 tags, each up to 20 characters." placeholder="Tech, Large Cap" />
        </div>
        <Button>Add ticker</Button>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-stone-500">Ticker</p>
            <h2 className="text-2xl font-semibold text-stone-900">AAPL</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/events/new?watchlist_item_id=demo-watchlist-item">
              <Button variant="secondary">Create event</Button>
            </Link>
            <Button variant="ghost">Edit tags</Button>
            <Button variant="ghost">Delete</Button>
          </div>
        </div>
        <p className="text-sm text-stone-600">Tags placeholder: Tech, Earnings</p>
      </Card>

      <EmptyState
        title="Your watchlist is ready for real data later."
        description="Ticker validation, duplicate handling, and CRUD states will be added in the watchlist stage without changing the locked ticker rules."
      />
    </div>
  );
}
