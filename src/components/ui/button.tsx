import Link from "next/link";

import type { ButtonSize, ButtonVariant } from "@/lib/design/tokens";

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-[var(--radius-card)] font-medium transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:pointer-events-none disabled:opacity-50";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--action-fill)] text-[var(--action-text)] hover:bg-[var(--action-fill-hover)] shadow-[var(--shadow-elevated)]",
  secondary:
    "bg-[var(--action-soft-fill)] text-[var(--ink-primary)] hover:bg-[var(--action-soft-fill-hover)]",
  tertiary:
    "text-[var(--ink-secondary)] underline-offset-4 hover:text-[var(--ink-primary)] hover:underline",
  ghost:
    "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-muted)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type NativeButtonProps = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type LinkButtonProps = ButtonBaseProps & {
  href: string;
} & Omit<React.ComponentProps<typeof Link>, "className" | "children">;

export type ButtonProps = NativeButtonProps | LinkButtonProps;

function getButtonClasses(variant: ButtonVariant, size: ButtonSize, className: string) {
  return [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const classes = getButtonClasses(variant, size, className);

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props as NativeButtonProps;

  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
