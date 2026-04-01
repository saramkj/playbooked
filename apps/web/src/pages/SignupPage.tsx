import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { useSession } from '../session/useSession';

export function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signUp } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      await signUp({ email, password });
      navigate('/dashboard');
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
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Sign up</p>
        <h1 className="text-4xl font-semibold text-stone-950">Start building your process</h1>
        <p className="text-base leading-7 text-stone-600">
          Create an investor account to enter the protected Playbooked workspace. Admin access remains
          seed/manual only.
        </p>
      </div>

      <Card className="space-y-4">
        {formError ? <ErrorBanner message={formError} title="Unable to create account" /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="signup-email"
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
            id="signup-password"
            autoComplete="new-password"
            error={fieldErrors.password}
            hint="Password must be at least 8 characters."
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-xs leading-5 text-stone-500">
          Investor accounts only are available here. If the email already exists, use the login flow instead.
        </p>
      </Card>

      <p className="text-center text-sm text-stone-600">
        Already have an account?{' '}
        <Link className="font-semibold text-amber-700 hover:text-amber-800" to="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
