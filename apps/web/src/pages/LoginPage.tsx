import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { SuccessBanner } from '../components/SuccessBanner';
import { useSession } from '../session/useSession';

type LoginLocationState = {
  email?: string;
  successMessage?: string;
};

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn } = useSession();
  const locationState = (location.state as LoginLocationState | null) ?? null;
  const [email, setEmail] = useState(locationState?.email ?? '');
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
        <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">Welcome back</h1>
        <p className="text-base leading-7 text-stone-600">
          Use your Playbooked account to resume the protected workflow. This now talks to the real
          cookie-session auth API.
        </p>
      </div>

      <Card className="space-y-4">
        {locationState?.successMessage ? (
          <SuccessBanner message={locationState.successMessage} title="Account created" />
        ) : null}
        {formError ? <ErrorBanner message={formError} title="Unable to log in" /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="login-email"
            autoComplete="email"
            error={fieldErrors.email}
            label="Email"
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email || formError) {
                setFieldErrors((current) => ({ ...current, email: '' }));
                setFormError(null);
              }
            }}
            placeholder="you@example.com"
            type="email"
            value={email}
            disabled={isSubmitting}
          />
          <Input
            id="login-password"
            autoComplete="current-password"
            error={fieldErrors.password}
            label="Password"
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password || formError) {
                setFieldErrors((current) => ({ ...current, password: '' }));
                setFormError(null);
              }
            }}
            placeholder="Minimum 8 characters"
            type="password"
            value={password}
            disabled={isSubmitting}
          />
          <Button fullWidth disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="text-xs leading-5 text-stone-500">
          If your session expired or the security check fails, refresh the page and try again.
        </p>
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
