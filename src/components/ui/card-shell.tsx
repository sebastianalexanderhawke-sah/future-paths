import type { CardShellVariant } from "@/lib/design/tokens";

const BASE_CLASSES = "rounded-[var(--radius-card)] transition-[box-shadow,transform,background-color] duration-300";

const VARIANT_CLASSES: Record<CardShellVariant, string> = {
  flat: "bg-[var(--surface)]",
  elevated:
    "bg-[var(--surface)] shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-hero)]",
  hero: "rounded-[var(--radius-hero)] bg-[var(--surface-raised)] shadow-[var(--shadow-hero)]",
};

type CardShellProps = {
  variant?: CardShellVariant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function CardShell({
  variant = "elevated",
  className = "",
  children,
  ...props
}: CardShellProps) {
  return (
    <article className={[BASE_CLASSES, VARIANT_CLASSES[variant], className].join(" ")} {...props}>
      {children}
    </article>
  );
}
