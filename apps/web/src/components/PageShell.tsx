import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { getButtonClassName } from './buttonStyles';
import { useSession } from '../session/useSession';

const authedNavItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/events', label: 'Events' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/trades', label: 'Trades' },
  { to: '/templates', label: 'Templates' },
];

type PageShellProps = {
  children?: ReactNode;
};

function NavItem({ label, to }: { label: string; to: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-stone-950 text-stone-50' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function PageShell({ children }: PageShellProps) {
  const { isAuthenticated, isLoading, signOut } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const heading = mainRef.current?.querySelector('h1');

      if (heading instanceof HTMLElement) {
        heading.tabIndex = -1;
        heading.focus();
        return;
      }

      mainRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, location.search]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await signOut();
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] text-stone-950">
      <a
        className="skip-link absolute left-4 top-4 z-50 rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-stone-50"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Playbooked</p>
              <p className="text-sm text-stone-600">Paper-trading discipline, not impulse.</p>
            </Link>

            {!isAuthenticated && !isLoading ? (
              <div className="flex items-center gap-3">
                <Link className="text-sm font-medium text-stone-700 hover:text-stone-950" to="/login">
                  Log in
                </Link>
                <Link className={getButtonClassName({ variant: 'primary' })} to="/signup">
                  Sign up
                </Link>
              </div>
            ) : null}
          </div>

          {isAuthenticated ? (
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
              {authedNavItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
              <Button className="ml-auto" disabled={isLoggingOut} variant="ghost" onClick={() => void handleLogout()}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </nav>
          ) : null}
        </div>
      </header>

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-10 focus:outline-none sm:px-6 lg:px-8"
      >
        {children}
      </main>

      <footer className="border-t border-stone-200/80 bg-white/70">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-stone-600 sm:px-6 lg:px-8">
          Educational only. Not financial advice. Paper trading only.
        </div>
      </footer>
    </div>
  );
}
