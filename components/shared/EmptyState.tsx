import type { LucideIcon } from "lucide-react";
import Image from "next/image";

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  illustration?: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12 gap-3 bg-paper-card border border-rule rounded-2xl shadow-sm">
      {illustration ? (
        <Image
          src={illustration}
          alt=""
          width={150}
          height={112}
          className="mb-1"
        />
      ) : Icon ? (
        <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center text-accent mb-1">
          <Icon size={28} strokeWidth={1.75} />
        </div>
      ) : null}
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="text-sm text-ink-dim max-w-xs">{body}</p>
      {action}
    </div>
  );
}
