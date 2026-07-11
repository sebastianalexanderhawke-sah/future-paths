type ChapterSurfaceProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Inner section surface for the expanded chapter: same card language as the
 * rest of Reflection (white, subtle border, rounded), statically elevated —
 * a soft two-layer shadow so each section visibly lifts off the chapter
 * card, but no hover motion, since nested layers shouldn't compete with
 * their container.
 */
export function ChapterSurface({ className = "", children }: ChapterSurfaceProps) {
  return (
    <div
      data-surface="chapter-section"
      className={[
        "rounded-xl border border-[#f0f0f2] bg-white",
        "shadow-[0_1px_2px_rgba(17,17,17,0.03),0_6px_18px_rgba(17,17,17,0.05)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
