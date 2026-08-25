/**
 * The entry cascade of a list, with a ceiling (`theme.css` §6, orchestration).
 *
 * A per-position delay with no ceiling means the animation's length is decided by how many
 * trains happen to be on the board: five rows finish in 140ms, forty rows are still
 * arriving 1.4s later. Same code, two different products, and the second one feels broken.
 * Past `--stagger-cap` positions every row shares the last delay, so the cascade reads as a
 * cascade and still ends when the reader expects it to.
 *
 * The clamp lives here rather than in CSS because it is arithmetic on an index, which a
 * custom property cannot do. The two values it clamps against are still the tokens'.
 */

/** Mirrors `--stagger-cap` in theme.css §6. Both are the same number for a reason. */
const STAGGER_CAP = 7

/** The `animation-delay` for position `index` in a list. */
export function staggerDelay(index: number): string {
  return `calc(var(--stagger-delay) * ${Math.min(Math.max(index, 0), STAGGER_CAP)})`
}
