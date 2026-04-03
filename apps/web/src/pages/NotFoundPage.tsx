import { Link } from 'react-router-dom';
import { getButtonClassName } from '../components/buttonStyles';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Not found</p>
        <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Page not found</h1>
      </section>
      <EmptyState
        title="Page not found."
        description="This route is outside the current Stage 7.1 scaffold. Use the documented navigation to keep exploring the app shell."
        action={
          <Link className={getButtonClassName({})} to="/">
            Back to home
          </Link>
        }
      />
    </div>
  );
}
