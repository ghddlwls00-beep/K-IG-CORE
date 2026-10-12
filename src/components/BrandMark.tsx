import { BRAND_LAB, BRAND_PERSON } from "@/lib/brand";

/**
 * The company mark: '홍세일 | 음절연구소' (2026-10-12 — it was 'K‑IG · 교육').
 *
 * One face, one size, two weights. The founder's name is set quieter (medium, soft ink) and the
 * institute's name carries the weight (bold, ink), the same quiet-then-strong pairing the old
 * mark had the other way round. The bar between them is drawn, not typed: a typed '|' sits at a
 * different height in every Korean font, and the gold hairline keeps the one accent colour the
 * old mark's dot had. No letter-spacing — docs/디자인-규칙.md §2 forbids tracking on Hangul.
 *
 * The size comes from the caller (`text-[15px]` in the header), so the bar is sized in `em` and
 * the mark scales as a whole. Screen readers get the two names; the bar is decoration.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span data-brand-mark className={`inline-flex items-center gap-[0.55em] whitespace-nowrap leading-none ${className}`}>
      <span className="font-medium text-ink-soft">{BRAND_PERSON}</span>
      <span aria-hidden className="h-[0.9em] w-[1.5px] shrink-0 rounded-full bg-primary" />
      <span className="font-bold text-ink">{BRAND_LAB}</span>
    </span>
  );
}
