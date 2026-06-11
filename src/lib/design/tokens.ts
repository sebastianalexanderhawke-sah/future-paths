export const DESIGN_TOKENS = {
  radius: {
    whisper: "0.5rem",
    card: "1.25rem",
    hero: "1.75rem",
    full: "9999px",
  },
  spacing: {
    section: "4.5rem",
    zone: "2.5rem",
    card: "1.5rem",
  },
  shadow: {
    elevatedLight:
      "0 4px 24px rgba(26, 22, 20, 0.06), 0 1px 2px rgba(26, 22, 20, 0.04)",
    heroLight: "0 12px 40px rgba(26, 22, 20, 0.1), 0 2px 8px rgba(26, 22, 20, 0.06)",
    elevatedDark: "0 12px 40px rgba(0, 0, 0, 0.45)",
    heroDark: "0 16px 48px rgba(0, 0, 0, 0.55), 0 0 64px rgba(92, 77, 60, 0.18)",
  },
  typography: {
    voice: "var(--font-voice)",
    ui: "var(--font-ui)",
    mono: "var(--font-geist-mono)",
  },
} as const;

export type CardShellVariant = "flat" | "elevated" | "hero";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost";

export type ButtonSize = "sm" | "md" | "lg";
