type OverviewSectionProps = {
  id?: string;
  label?: string;
  title?: React.ReactNode;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children?: React.ReactNode;
  className?: string;
};

export function OverviewSection({ id, children }: OverviewSectionProps) {
  return (
    <section id={id} style={{ scrollMarginTop: "72px" }}>
      {children}
    </section>
  );
}
