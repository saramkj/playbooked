import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useSession } from '../session/useSession';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useSession();

  const params = new URLSearchParams(location.search);
  const returnTo = params.get('return_to') || '/dashboard';

  function handleLogin() {
    signIn();
    navigate(returnTo);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Log in</p>
        <h1 className="text-4xl font-semibold text-stone-950">Welcome back</h1>
        <p className="text-base leading-7 text-stone-600">
          Scaffold-only demo sign-in for Stage 7.1. This button only flips the local placeholder
          session so we can exercise protected routes before real cookie-session auth arrives in Stage 7.3.
        </p>
      </div>

      <Card className="space-y-4">
        <Input id="login-email" label="Email" placeholder="you@example.com" type="email" />
        <Input id="login-password" label="Password" placeholder="Minimum 8 characters" type="password" />
        <Button fullWidth onClick={handleLogin}>
          Log in
        </Button>
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
