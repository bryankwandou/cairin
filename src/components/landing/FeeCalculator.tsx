"use client";

import { useMemo, useState } from "react";
import { formatIdr } from "@/lib/utils";

/**
 * Fee comparison, live.
 *
 * Fixed fee against the one percent plus 0.24 percent tax that Indonesian
 * off-ramps typically charge. The crossover is shown rather than hidden,
 * because a comparison that only ever flatters us is a comparison nobody
 * believes.
 */

const FIXED_FEE_IDR = 5_000;
const FIXED_FEE_RTGS_IDR = 35_000;
const REALTIME_CEILING_IDR = 250_000_000;
const PERCENT_RATE = 0.01;
const TAX_RATE = 0.0024;

/** Where a fixed Rp5.000 stops being more expensive than 1.24 percent. */
const CROSSOVER_IDR = Math.round(FIXED_FEE_IDR / (PERCENT_RATE + TAX_RATE));

const PRESETS = [50_000, 250_000, 1_000_000, 5_000_000, 25_000_000];

export function FeeCalculator() {
  const [amount, setAmount] = useState(1_000_000);

  const figures = useMemo(() => {
    const fixed = amount <= REALTIME_CEILING_IDR ? FIXED_FEE_IDR : FIXED_FEE_RTGS_IDR;
    const percent = Math.round(amount * (PERCENT_RATE + TAX_RATE));
    return {
      fixed,
      percent,
      difference: percent - fixed,
      cheaper: percent > fixed ? "fixed" : percent < fixed ? "percent" : "equal",
    } as const;
  }, [amount]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line p-5">
        <label htmlFor="fee-amount" className="block text-xs font-medium text-ink-muted">
          Nominal yang dicairkan
        </label>
        <p className="tabular mt-2 text-3xl font-semibold">{formatIdr(amount)}</p>

        <input
          id="fee-amount"
          type="range"
          min={20_000}
          max={50_000_000}
          step={10_000}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="mt-4 w-full accent-[var(--brand)]"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className="tabular rounded-lg border border-line px-2.5 py-1 text-xs transition-colors hover:bg-surface-sunken"
            >
              {formatIdr(preset, { withPrefix: false })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2">
        <Panel
          title="Cairin"
          subtitle="Biaya tetap penerbit"
          value={figures.fixed}
          highlight={figures.cheaper === "fixed"}
        />
        <Panel
          title="Model persentase"
          subtitle="1 persen ditambah pajak 0,24 persen"
          value={figures.percent}
          highlight={figures.cheaper === "percent"}
        />
      </div>

      <p className="border-t border-line bg-surface-sunken px-5 py-4 text-xs leading-relaxed text-ink-muted">
        {figures.cheaper === "fixed" ? (
          <>
            Pada nominal ini biaya tetap menghemat{" "}
            <span className="tabular font-medium text-brand-ink">
              {formatIdr(figures.difference)}
            </span>
            . Selisihnya terus melebar seiring nominal naik, karena satu sisi
            tumbuh dan sisi lainnya tidak.
          </>
        ) : figures.cheaper === "percent" ? (
          <>
            Di bawah sekitar{" "}
            <span className="tabular font-medium">{formatIdr(CROSSOVER_IDR)}</span>{" "}
            model persentase memang lebih murah, dan pada nominal ini selisihnya{" "}
            <span className="tabular font-medium">
              {formatIdr(Math.abs(figures.difference))}
            </span>
            . Untuk pencairan sekecil itu, biaya tetap bukan pilihan terbaik.
          </>
        ) : (
          <>Pada nominal ini keduanya sama persis.</>
        )}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  value,
  highlight,
}: {
  title: string;
  subtitle: string;
  value: number;
  highlight: boolean;
}) {
  return (
    <div className={highlight ? "bg-brand-wash p-5" : "bg-surface p-5"}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
      <p
        className={
          highlight
            ? "tabular mt-3 text-2xl font-semibold text-brand-ink"
            : "tabular mt-3 text-2xl font-semibold"
        }
      >
        {formatIdr(value)}
      </p>
    </div>
  );
}
