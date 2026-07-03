type OverviewCardProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Shared surface for every Overview card: white, subtle border, 16px radius,
 * soft floating shadow with a slight lift on hover. Padding is left to each
 * card so full-bleed sections (like the spider chart) stay possible.
 */
export function OverviewCard({ className = "", children }: OverviewCardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-[#f0f0f2] bg-white",
        "shadow-[0_1px_2px_rgba(17,17,17,0.02),0_12px_32px_rgba(17,17,17,0.04)]",
        "transition-[box-shadow,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(17,17,17,0.03),0_18px_48px_rgba(17,17,17,0.07)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
