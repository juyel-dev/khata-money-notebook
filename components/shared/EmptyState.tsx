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
    <div className="flex flex-col items-center text-center px-7 py-10 gap-3 border-y border-rule/70">
      {illustration ? (
        <Image
          src={illustration}
          alt=""
          width={150}
          height={112}
          className="mb-1"
        />
      ) : Icon ? (
        <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center text-accent mb-1">
          <Icon size={26} strokeWidth={1.75} />
        </div>
      ) : null}
      <h2 className="text-[17px] font-bold leading-6 text-ink">{title}</h2>
      <p className="text-[13px] leading-5 text-ink-dim max-w-xs">{body}</p>
      {action}
    </div>
  );
}
