import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <div className="space-y-6">
      <EmptyState
        title="Page not found."
        description="This route is outside the current Stage 7.1 scaffold. Use the documented navigation to keep exploring the app shell."
        action={
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        }
      />
    </div>
  );
}
