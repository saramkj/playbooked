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
        `inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-[999px] px-5 py-3 text-sm transition-colors ${
          isActive
            ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-medium shadow-[0_1px_2px_rgba(28,25,23,0.08),inset_0_0_0_1px_hsl(var(--border))]'
            : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.9)] hover:text-[hsl(var(--foreground))]'
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
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <a
        className="skip-link absolute left-4 top-4 z-[60] rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))]"
        href="#main-content"
      >
        Skip to content
      </a>

      <header className="relative z-50">
        <div className="border-b border-[hsl(var(--border))]" style={{ background: 'var(--hero-gradient)' }}>
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
            <div className="flex items-center justify-between gap-6 py-6">
              <div className="min-w-0 pr-4">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/'}
                  className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition-opacity hover:opacity-70"
                  aria-label="Playbooked home"
                >
                  Playbooked
                </Link>
                <p className="mt-0.5 hidden text-sm text-[hsl(var(--muted-foreground))] sm:block">
                  Paper-trading discipline, not impulse.
                </p>
              </div>

              {!isAuthenticated && !isLoading ? (
                <div className="hidden items-center gap-5 sm:flex">
                  <Link
                    className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                    to="/login"
                  >
                    Log in
                  </Link>
                  <Link className={getButtonClassName({ variant: 'primary' })} to="/signup">
                    Sign up
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <nav className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]" aria-label="Primary">
            <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
              <div className="flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:gap-8">
                <div className="flex flex-1 flex-wrap items-center gap-3 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-[0_10px_30px_-24px_rgba(28,25,23,0.35)]">
                  {authedNavItems.map((item) => (
                    <NavItem key={item.to} {...item} />
                  ))}
                </div>

                <div className="flex shrink-0 items-center self-end rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1.5 lg:ml-auto lg:self-auto">
                  <Button
                    className="h-11 rounded-full px-5 text-sm"
                    disabled={isLoggingOut}
                    variant="ghost"
                    onClick={() => void handleLogout()}
                  >
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                  </Button>
                </div>
              </div>
            </div>
          </nav>
        ) : null}
      </header>

      <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {location.pathname === '/' && !isAuthenticated ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-5xl px-6 py-12 md:px-10 md:py-16 lg:px-12">{children}</div>
        )}
      </main>

      <footer className="mt-auto border-t border-[hsl(var(--border))]">
        <div className="mx-auto w-full max-w-5xl px-6 md:px-10 lg:px-12">
          <div className="flex flex-col gap-2 py-6 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
            <p>Educational only. Not financial advice. Paper trading only.</p>
            <p className="font-mono tracking-wide">Playbooked</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
