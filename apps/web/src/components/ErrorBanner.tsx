type ErrorBannerProps = {
  title?: string;
  message: string;
};

export function ErrorBanner({ message, title = 'Something needs attention' }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-rose-800">{message}</p>
    </div>
  );
}
