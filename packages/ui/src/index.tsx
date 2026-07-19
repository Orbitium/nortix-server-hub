import { Check, Sparkles } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return <button className={clsx("button", `button--${variant}`, className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "purple" | "gold" | "danger" | "info";
  className?: string;
}) {
  return <span className={clsx("badge", `badge--${tone}`, className)}>{children}</span>;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card", className)} {...props} />;
}

export function VerifiedBadge() {
  return (
    <span className="verified-badge" title="Verified by Nortix">
      <Check size={12} strokeWidth={3} aria-hidden /> Verified
    </span>
  );
}

export function Sparks({ value }: { value: string | number }) {
  return (
    <span className="sparks-label">
      <Sparkles size={14} aria-hidden /> {value}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const tone = ["ACTIVE", "APPROVED", "COMPLETED", "VERIFIED"].includes(status)
    ? "success"
    : ["SUBMITTED", "PENDING", "UNDER_REVIEW", "SCHEDULED"].includes(status)
      ? "warning"
      : ["REJECTED", "SUSPENDED", "FAILED"].includes(status)
        ? "danger"
        : "neutral";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-wrap" aria-label={label ?? `${value}% complete`}>
      <div className="progress-track">
        <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      {label && <small>{label}</small>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="empty-state">
      <div className="empty-state__icon" aria-hidden>
        ◆
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={clsx("skeleton", className)} aria-hidden />;
}
