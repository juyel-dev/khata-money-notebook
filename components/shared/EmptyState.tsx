import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12 gap-3">
      <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center text-accent mb-1">
        <Icon size={28} strokeWidth={1.75} />
      </div>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="text-sm text-ink-dim max-w-xs">{body}</p>
      {action}
    </div>
  );
}
