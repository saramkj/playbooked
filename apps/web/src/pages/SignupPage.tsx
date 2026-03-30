import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useSession } from '../session/useSession';

export function SignupPage() {
  const navigate = useNavigate();
  const { signIn } = useSession();

  function handleSignup() {
    signIn();
    navigate('/dashboard');
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Sign up</p>
        <h1 className="text-4xl font-semibold text-stone-950">Start building your process</h1>
        <p className="text-base leading-7 text-stone-600">
          Scaffold-only demo signup for Stage 7.1. It only enables the local placeholder session and
          redirects into the protected app shell while the real auth flow is still pending.
        </p>
      </div>

      <Card className="space-y-4">
        <Input id="signup-email" label="Email" placeholder="you@example.com" type="email" />
        <Input
          id="signup-password"
          label="Password"
          hint="Real validation and duplicate-account handling will follow the locked auth contract."
          placeholder="Minimum 8 characters"
          type="password"
        />
        <Button fullWidth onClick={handleSignup}>
          Create account
        </Button>
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
