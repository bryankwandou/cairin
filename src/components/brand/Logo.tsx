import { cn } from "@/lib/utils";

/**
 * The Cairin mark.
 *
 * An open ring with its mouth turned to the lower right, holding a single drop.
 * The ring is a C; it is also a vessel. The drop is the money — still inside,
 * still yours, on its way out. Nothing in the mark is decorative: the opening
 * points the direction value leaves in, and the drop is the only filled shape
 * so the eye lands on it first.
 *
 * Ids are namespaced per instance because a page may hold several marks and
 * duplicate gradient ids would make the later ones inherit the first.
 */
export function CairinMark({
  className,
  animated = false,
  idSuffix = "",
}: {
  className?: string;
  /** Lets the drop fall into place on mount. Respects reduced-motion. */
  animated?: boolean;
  idSuffix?: string;
}) {
  const ringId = `cairin-ring${idSuffix}`;
  const dropId = `cairin-drop${idSuffix}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="Cairin"
    >
      <defs>
        <linearGradient id={ringId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-glow)" />
          <stop offset="0.5" stopColor="var(--brand-bright)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
        <linearGradient id={dropId} x1="19" y1="17" x2="29" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-glow)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
      </defs>

      <path
        d="M27.88 38.49 A15 15 0 1 1 38.77 21.40"
        fill="none"
        stroke={`url(#${ringId})`}
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      <path
        d="M24 16.6 C26.9 21.6 28.6 23.6 28.6 27.4 a4.6 4.6 0 0 1 -9.2 0 c0 -3.8 1.7 -5.8 4.6 -10.8 Z"
        fill={`url(#${dropId})`}
        className={animated ? "animate-drip" : undefined}
      />
    </svg>
  );
}

/**
 * Mark plus name. The wordmark is set in the interface typeface at a tight
 * track rather than drawn as outlines, so it stays crisp at any size and
 * matches the rest of the page instead of floating on top of it.
 */
export function CairinLogo({
  className,
  markClassName,
  animated = false,
  idSuffix = "",
}: {
  className?: string;
  markClassName?: string;
  animated?: boolean;
  idSuffix?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CairinMark className={markClassName} animated={animated} idSuffix={idSuffix} />
      <span className="text-[1.35rem] font-semibold tracking-[-0.045em] text-ink">
        cairin
      </span>
    </span>
  );
}
