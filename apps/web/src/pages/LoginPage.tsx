import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { useSession } from '../session/useSession';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const params = new URLSearchParams(location.search);
  const returnTo = params.get('return_to') || '/dashboard';

  if (!isLoading && isAuthenticated) {
    return <Navigate replace to={returnTo} />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      await signIn({ email, password });
      navigate(returnTo);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors ?? {});
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Log in</p>
        <h1 className="text-4xl font-semibold text-stone-950">Welcome back</h1>
        <p className="text-base leading-7 text-stone-600">
          Use your Playbooked account to resume the protected workflow. This now talks to the real
          cookie-session auth API.
        </p>
      </div>

      <Card className="space-y-4">
        {formError ? <ErrorBanner message={formError} title="Unable to log in" /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="login-email"
            autoComplete="email"
            error={fieldErrors.email}
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
          <Input
            id="login-password"
            autoComplete="current-password"
            error={fieldErrors.password}
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            type="password"
            value={password}
          />
          <Button fullWidth disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-stone-600">
        Need an account?{' '}
        <Link className="font-semibold text-amber-700 hover:text-amber-800" to="/signup">
          Sign up
        </Link>
      </p>
    </div>
  );
}
