type SuccessBannerProps = {
  title?: string;
  message: string;
};

export function SuccessBanner({ message, title = 'Saved successfully' }: SuccessBannerProps) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-emerald-800">{message}</p>
    </div>
  );
}
