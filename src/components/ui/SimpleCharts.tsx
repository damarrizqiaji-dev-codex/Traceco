import { useState } from 'react';
import type { EcobrickSubmission } from '../../types/traceco';
import {
  computeContributionTimeSeries,
  type ActiveSegmentBreakdown,
  type ContributionChartRange,
  type PlatformMetrics,
} from '../../utils/tracecoLogic';

const RANGE_OPTIONS: { id: ContributionChartRange; label: string }[] = [
  { id: '7d', label: '7 Hari' },
  { id: '30d', label: '30 Hari' },
  { id: '3m', label: '3 Bulan' },
  { id: '1y', label: '1 Tahun' },
];

export function ContributionTrendChart({
  submissions,
  title = 'Tren Kontribusi Ecobrick',
  subtitle,
  defaultRange = '30d',
}: {
  submissions: EcobrickSubmission[];
  title?: string;
  subtitle?: string;
  defaultRange?: ContributionChartRange;
}) {
  const [range, setRange] = useState<ContributionChartRange>(defaultRange);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const [showSubmitted, setShowSubmitted] = useState(true);
  const [showVerified, setShowVerified] = useState(true);

  const series = computeContributionTimeSeries(submissions, range);
  const buckets = series.buckets;
  const maxVal = Math.max(
    ...buckets.map((b) =>
      Math.max(showSubmitted ? b.submitted : 0, showVerified ? b.verified : 0)
    ),
    4
  );
  const yCeiling = Math.ceil(maxVal / 5) * 5;
  const yTicks = [
    yCeiling,
    Math.round(yCeiling * 0.66),
    Math.round(yCeiling * 0.33),
    0,
  ];

  const chartW = 560;
  const chartH = 200;
  const padL = 32;
  const padR = 14;
  const padT = 18;
  const padB = 34;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const slotW = innerW / Math.max(buckets.length, 1);

  const pointsSubmitted = buckets.map((b, i) => {
    const x = padL + i * slotW + slotW / 2;
    const y = padT + innerH - (b.submitted / yCeiling) * innerH;
    return { x, y, ...b };
  });

  const pointsVerified = buckets.map((b, i) => {
    const x = padL + i * slotW + slotW / 2;
    const y = padT + innerH - (b.verified / yCeiling) * innerH;
    return { x, y, ...b };
  });

  const activeIdx = hoverIdx !== null ? hoverIdx : pinnedIdx;
  const activePoint =
    activeIdx !== null && buckets[activeIdx] ? buckets[activeIdx] : null;
  const activePassRate =
    activePoint && activePoint.submitted > 0
      ? Math.round((activePoint.verified / activePoint.submitted) * 100)
      : null;

  const rawTooltipPct =
    activeIdx !== null ? ((activeIdx + 0.5) / buckets.length) * 100 : 50;
  const tooltipStyle =
    rawTooltipPct > 72
      ? { right: '4px' }
      : rawTooltipPct < 24
        ? { left: '4px' }
        : { left: `${rawTooltipPct}%`, transform: 'translateX(-50%)' };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[15px] font-semibold text-[#111E19]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[#54625B]">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border border-[#D8DFDA] bg-[#F2F4F2] p-0.5 text-[11px]"
            role="tablist"
            aria-label="Rentang waktu grafik"
          >
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={range === opt.id}
                onClick={() => {
                  setRange(opt.id);
                  setHoverIdx(null);
                  setPinnedIdx(null);
                }}
                className={`rounded px-2 py-1 font-medium transition-[background-color,color] duration-150 whitespace-nowrap ${
                  range === opt.id
                    ? 'bg-[#111E19] text-white'
                    : 'text-[#54625B] hover:text-[#17201C]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-md border border-[#D8DFDA] bg-[#F2F4F2] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`rounded px-2 py-1 font-medium transition-[background-color,color] duration-150 ${
                chartType === 'bar'
                  ? 'bg-white text-[#111E19] shadow-2xs'
                  : 'text-[#54625B] hover:text-[#17201C]'
              }`}
            >
              Bar
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`rounded px-2 py-1 font-medium transition-[background-color,color] duration-150 ${
                chartType === 'line'
                  ? 'bg-white text-[#111E19] shadow-2xs'
                  : 'text-[#54625B] hover:text-[#17201C]'
              }`}
            >
              Line
            </button>
          </div>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#EAEFEA] py-2 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            <span className="text-[#54625B]">Diserahkan: </span>
            <strong className="font-mono text-[#1D6373] tabular-nums">
              {series.totalSubmittedInPeriod} unit
            </strong>
          </span>
          <span>
            <span className="text-[#54625B]">Terverifikasi: </span>
            <strong className="font-mono text-[#166549] tabular-nums">
              {series.totalVerifiedInPeriod} unit
            </strong>
          </span>
        </div>

        <span
          className={`font-mono text-[11px] font-medium tabular-nums ${
            series.percentChange === null
              ? 'text-[#54625B]'
              : series.percentChange >= 0
                ? 'text-[#166549]'
                : 'text-[#B45309]'
          }`}
        >
          {series.percentChange === null
            ? 'Pembanding sebelumnya: 0 unit'
            : `${series.percentChange >= 0 ? '+' : ''}${series.percentChange}% vs periode lalu`}
        </span>
      </div>

      {/* Interactive SVG Chart with Floating Obsidian Tooltip */}
      <div className="relative w-full overflow-x-auto">
        {activePoint && (
          <div
            role="status"
            style={tooltipStyle}
            className="pointer-events-none absolute top-0 z-10 rounded-md border border-[#243A31] bg-[#111E19] px-3 py-1.5 shadow-md text-[11px] text-white whitespace-nowrap animate-traceco-enter"
          >
            <div className="flex items-center gap-2 font-medium text-[#ECF2EE]">
              <span>{activePoint.label}</span>
              {activePassRate !== null && (
                <span className="font-mono text-[10px] text-[#6EE7B7]">
                  ({activePassRate}% lolos)
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 font-mono text-[11px] tabular-nums">
              <span className="text-[#7DD3FC]">
                Masuk: {activePoint.submitted}
              </span>
              <span className="text-[#6EE7B7] font-semibold">
                Lolos: {activePoint.verified}
              </span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full min-w-[380px] h-auto select-none"
          role="img"
          aria-label={title}
        >
          {yTicks.map((tick) => {
            const y = padT + innerH - (tick / yCeiling) * innerH;
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={chartW - padR}
                  y2={y}
                  stroke="#D8DFDA"
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                  strokeWidth={1}
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#54625B] text-[9px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {chartType === 'bar' ? (
            buckets.map((b, i) => {
              const barGroupW = Math.min(28, slotW * 0.65);
              const singleBarW = Math.max(6, barGroupW / 2 - 1);
              const centerX = padL + i * slotW + slotW / 2;
              const subH = (b.submitted / yCeiling) * innerH;
              const verH = (b.verified / yCeiling) * innerH;
              const isHighlighted = activeIdx === i;

              return (
                <g
                  key={b.label}
                  tabIndex={0}
                  role="button"
                  aria-label={`${b.label}: ${b.submitted} diserahkan, ${b.verified} terverifikasi`}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                  onClick={() => setPinnedIdx((prev) => (prev === i ? null : i))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPinnedIdx((prev) => (prev === i ? null : i));
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  <rect
                    x={padL + i * slotW + 2}
                    y={padT}
                    width={Math.max(4, slotW - 4)}
                    height={innerH}
                    fill={isHighlighted ? '#EBF4EF' : 'transparent'}
                    rx={2}
                  />
                  {showSubmitted && (
                    <rect
                      x={
                        showVerified
                          ? centerX - singleBarW - 1
                          : centerX - singleBarW / 2
                      }
                      y={padT + innerH - subH}
                      width={singleBarW}
                      height={Math.max(b.submitted > 0 ? 2 : 0, subH)}
                      fill={isHighlighted ? '#1D6373' : '#5E98A6'}
                      rx={1.5}
                      className="transition-[fill,opacity] duration-150"
                    />
                  )}
                  {showVerified && (
                    <rect
                      x={
                        showSubmitted
                          ? centerX + 1
                          : centerX - singleBarW / 2
                      }
                      y={padT + innerH - verH}
                      width={singleBarW}
                      height={Math.max(b.verified > 0 ? 2 : 0, verH)}
                      fill={isHighlighted ? '#0F4C36' : '#166549'}
                      rx={1.5}
                      className="transition-[fill,opacity] duration-150"
                    />
                  )}
                  {(buckets.length <= 8 || i % 2 === 0 || i === buckets.length - 1) && (
                    <text
                      x={centerX}
                      y={chartH - 12}
                      textAnchor="middle"
                      className={`text-[9px] ${
                        isHighlighted
                          ? 'fill-[#111E19] font-semibold'
                          : 'fill-[#54625B]'
                      }`}
                    >
                      {b.label}
                    </text>
                  )}
                </g>
              );
            })
          ) : (
            <g>
              {activeIdx !== null && pointsSubmitted[activeIdx] && (
                <line
                  x1={pointsSubmitted[activeIdx].x}
                  y1={padT}
                  x2={pointsSubmitted[activeIdx].x}
                  y2={padT + innerH}
                  stroke="#111E19"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                  strokeWidth={1.25}
                />
              )}
              {showSubmitted && (
                <polyline
                  fill="none"
                  stroke="#1D6373"
                  strokeWidth={2}
                  points={pointsSubmitted.map((p) => `${p.x},${p.y}`).join(' ')}
                />
              )}
              {showVerified && (
                <polyline
                  fill="none"
                  stroke="#166549"
                  strokeWidth={2.25}
                  points={pointsVerified.map((p) => `${p.x},${p.y}`).join(' ')}
                />
              )}
              {pointsSubmitted.map((p, i) => {
                const vp = pointsVerified[i];
                const isHighlighted = activeIdx === i;
                return (
                  <g
                    key={p.label}
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.label}: ${p.submitted} diserahkan, ${p.verified} terverifikasi`}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                    onClick={() =>
                      setPinnedIdx((prev) => (prev === i ? null : i))
                    }
                    className="cursor-pointer focus:outline-none"
                  >
                    <rect
                      x={padL + i * slotW}
                      y={padT}
                      width={slotW}
                      height={innerH}
                      fill="transparent"
                    />
                    {showSubmitted && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHighlighted ? 4.5 : 3}
                        fill="#1D6373"
                        stroke="#FFFFFF"
                        strokeWidth={1.2}
                      />
                    )}
                    {showVerified && (
                      <circle
                        cx={vp.x}
                        cy={vp.y}
                        r={isHighlighted ? 5 : 3.2}
                        fill="#166549"
                        stroke="#FFFFFF"
                        strokeWidth={1.2}
                      />
                    )}
                    {(buckets.length <= 8 ||
                      i % 2 === 0 ||
                      i === buckets.length - 1) && (
                      <text
                        x={p.x}
                        y={chartH - 12}
                        textAnchor="middle"
                        className={`text-[9px] ${
                          isHighlighted
                            ? 'fill-[#111E19] font-semibold'
                            : 'fill-[#54625B]'
                        }`}
                      >
                        {p.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Legend Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#54625B]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (showSubmitted && !showVerified) return;
              setShowSubmitted((v) => !v);
            }}
            aria-pressed={showSubmitted}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 transition-opacity duration-150 hover:bg-[#F2F4F2] ${
              showSubmitted ? 'opacity-100 text-[#17201C]' : 'opacity-45'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-xs bg-[#1D6373]" />
            <span>Diserahkan (Submitted)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (showVerified && !showSubmitted) return;
              setShowVerified((v) => !v);
            }}
            aria-pressed={showVerified}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 transition-opacity duration-150 hover:bg-[#F2F4F2] ${
              showVerified ? 'opacity-100 text-[#17201C]' : 'opacity-45'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-xs bg-[#166549]" />
            <span>Lolos Verifikasi (Verified)</span>
          </button>
        </div>
        <span className="text-[11px] text-[#54625B]">
          Klik atau arahkan kursor untuk mengunci rincian
        </span>
      </div>
    </div>
  );
}

export function VerificationOutcomeBar({
  metrics,
}: {
  metrics: PlatformMetrics;
}) {
  const [activeSeg, setActiveSeg] = useState<string | null>(null);
  const total =
    metrics.ecobricksVerifiedCount +
    metrics.ecobricksRejectedCount +
    metrics.ecobricksPendingCount;
  const safeTotal = total > 0 ? total : 1;

  const verPct = Math.round((metrics.ecobricksVerifiedCount / safeTotal) * 100);
  const rejPct = Math.round((metrics.ecobricksRejectedCount / safeTotal) * 100);
  const pendPct = Math.max(0, 100 - verPct - rejPct);

  const segments = [
    {
      label: 'Ecobrick Terverifikasi',
      unit: metrics.ecobricksVerifiedCount,
      pct: verPct,
      colorClass: 'bg-[#166549]',
    },
    {
      label: 'Menunggu Pemeriksaan',
      unit: metrics.ecobricksPendingCount,
      pct: pendPct,
      colorClass: 'bg-[#D97706]',
    },
    {
      label: 'Ditolak',
      unit: metrics.ecobricksRejectedCount,
      pct: rejPct,
      colorClass: 'bg-[#B91C1C]',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded bg-[#EAEFEA]">
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{ width: `${seg.pct}%` }}
            onMouseEnter={() => setActiveSeg(seg.label)}
            onMouseLeave={() => setActiveSeg(null)}
            className={`${seg.colorClass} transition-opacity duration-150 ${
              activeSeg && activeSeg !== seg.label ? 'opacity-35' : 'opacity-100'
            }`}
            title={`${seg.label}: ${seg.unit} unit (${seg.pct}%)`}
          />
        ))}
      </div>

      <div className="divide-y divide-[#EAEFEA]">
        {segments.map((seg) => (
          <div
            key={seg.label}
            onMouseEnter={() => setActiveSeg(seg.label)}
            onMouseLeave={() => setActiveSeg(null)}
            className={`flex items-center justify-between gap-3 py-2 text-xs transition-colors duration-150 ${
              activeSeg === seg.label ? 'bg-[#F2F4F2] px-2 rounded' : ''
            }`}
          >
            <span className="flex items-center gap-2 text-[#17201C]">
              <span className={`h-2 w-2 rounded-xs shrink-0 ${seg.colorClass}`} />
              <span>{seg.label}</span>
            </span>
            <span className="font-mono font-medium text-[#17201C] tabular-nums whitespace-nowrap">
              {seg.unit} unit · {seg.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VerificationStatusChart({
  metrics,
}: {
  metrics: PlatformMetrics;
}) {
  const totalSubs = Math.max(metrics.totalSubmissionsCount, 1);
  const rows = [
    {
      label: 'Lolos Penuh',
      count: metrics.verifiedSubmissionsCount,
      color: 'bg-[#166549]',
    },
    {
      label: 'Lolos Sebagian',
      count: metrics.partialSubmissionsCount,
      color: 'bg-[#1D6373]',
    },
    {
      label: 'Menunggu',
      count: metrics.pendingSubmissionsCount,
      color: 'bg-[#D97706]',
    },
    {
      label: 'Ditolak',
      count: metrics.rejectedSubmissionsCount,
      color: 'bg-[#B91C1C]',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-[15px] font-semibold text-[#111E19]">
            Status Verifikasi
          </p>
          <p className="text-[11px] text-[#54625B]">
            Rasio lolos pemeriksaan fisik: {metrics.verificationRatePercent}%
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-[#166549] tabular-nums">
          {metrics.totalSubmissionsCount} submission
        </span>
      </div>

      <VerificationOutcomeBar metrics={metrics} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-[#EAEFEA] pt-2.5 text-[11px]">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-2 py-0.5"
          >
            <span className="flex items-center gap-1.5 text-[#54625B] truncate">
              <span className={`h-2 w-2 rounded-xs shrink-0 ${r.color}`} />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="font-mono font-semibold text-[#17201C] tabular-nums">
              {r.count} ({Math.round((r.count / totalSubs) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActiveContributorsChart({
  breakdown,
}: {
  breakdown: ActiveSegmentBreakdown[];
}) {
  const maxUnits = Math.max(...breakdown.map((b) => b.submittedUnits), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-[15px] font-semibold text-[#111E19]">
            Kontributor Aktif per Segmen
          </p>
          <p className="text-[11px] text-[#54625B]">
            Santri, Warga, dan Keluarga Rentan penyerah ecobrick
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-[#166549] tabular-nums">
          {breakdown.reduce((s, b) => s + b.activeCount, 0)} aktif
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {breakdown.map((item) => {
          const pct = Math.max(
            6,
            Math.round((item.submittedUnits / maxUnits) * 100)
          );
          const verifiedPct =
            item.submittedUnits > 0
              ? Math.round((item.verifiedUnits / item.submittedUnits) * pct)
              : 0;

          return (
            <div key={item.segment} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-[#17201C]">
                  {item.segment}{' '}
                  <span className="text-[11px] font-normal text-[#54625B]">
                    ({item.activeCount}/{item.registeredCount} orang aktif)
                  </span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-[#17201C] tabular-nums">
                  {item.verifiedUnits}/{item.submittedUnits} unit
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded bg-[#EAEFEA]">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-[#5E98A6]"
                  style={{ width: `${pct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded bg-[#166549]"
                  style={{ width: `${verifiedPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 pt-1 text-[11px] text-[#54625B]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-xs bg-[#166549]" />
          <span>Terverifikasi</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-xs bg-[#5E98A6]" />
          <span>Total Diserahkan</span>
        </span>
      </div>
    </div>
  );
}

export function DistributionUtilizationChart({
  metrics,
}: {
  metrics: PlatformMetrics;
}) {
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const handedOverOnly = Math.max(
    0,
    metrics.ecobricksDistributedCount - metrics.ecobricksUtilizedCount
  );
  const rows = [
    {
      label: 'Tersedia di Hub',
      value: metrics.inventoryAvailableCount,
      color: '#166549',
    },
    {
      label: 'Direservasi Mitra',
      value: metrics.ecobricksReservedCount,
      color: '#D97706',
    },
    {
      label: 'Diserahterimakan (Dalam Proses)',
      value: handedOverOnly,
      color: '#1D6373',
    },
    {
      label: 'Dimanfaatkan Nyata',
      value: metrics.ecobricksUtilizedCount,
      color: '#111E19',
    },
  ];
  const totalVerified = Math.max(metrics.ecobricksVerifiedCount, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-[15px] font-semibold text-[#111E19]">
            Distribusi & Pemanfaatan Inventori
          </p>
          <p className="text-[11px] text-[#54625B]">
            Hanya menghitung unit ecobrick terverifikasi
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-[#17201C] tabular-nums">
          {metrics.ecobricksVerifiedCount} unit batch
        </span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded bg-[#EAEFEA]">
        {rows.map((r) => {
          const pct = Math.round((r.value / totalVerified) * 100);
          if (pct <= 0) return null;
          return (
            <div
              key={r.label}
              onMouseEnter={() => setHoverLabel(r.label)}
              onMouseLeave={() => setHoverLabel(null)}
              style={{ width: `${pct}%`, backgroundColor: r.color }}
              className={`transition-opacity duration-150 ${
                hoverLabel && hoverLabel !== r.label ? 'opacity-35' : 'opacity-100'
              }`}
              title={`${r.label}: ${r.value} unit`}
            />
          );
        })}
      </div>

      <div className="divide-y divide-[#EAEFEA]">
        {rows.map((r) => (
          <div
            key={r.label}
            onMouseEnter={() => setHoverLabel(r.label)}
            onMouseLeave={() => setHoverLabel(null)}
            className={`flex items-center justify-between gap-2 py-2 text-xs transition-colors duration-150 ${
              hoverLabel === r.label ? 'bg-[#F2F4F2] px-2 rounded' : ''
            }`}
          >
            <span className="flex items-center gap-2 text-[#17201C]">
              <span
                className="h-2 w-2 rounded-xs shrink-0"
                style={{ backgroundColor: r.color }}
              />
              <span>{r.label}</span>
            </span>
            <span className="font-mono font-semibold text-[#17201C] tabular-nums">
              {r.value} unit
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EcobrickPipelineComparisonChart({
  metrics,
}: {
  metrics: PlatformMetrics;
}) {
  const rows = [
    {
      label: 'Diserahkan (Submitted)',
      sublabel: 'Total ecobrick yang diserahkan kontributor ke pos TRACECO',
      value: metrics.ecobricksSubmittedCount,
      color: '#5E98A6',
    },
    {
      label: 'Terverifikasi (Verified)',
      sublabel: 'Lolos pemeriksaan fisik 8 kriteria dan masuk batch',
      value: metrics.ecobricksVerifiedCount,
      color: '#166549',
    },
    {
      label: 'Stok Tersedia (Available)',
      sublabel: 'Stok terverifikasi yang tersedia untuk permintaan pemanfaatan',
      value: metrics.inventoryAvailableCount,
      color: '#54625B',
    },
    {
      label: 'Disalurkan (Distributed)',
      sublabel: 'Sudah diserahterimakan ke pesantren, komunitas, atau mitra',
      value: metrics.ecobricksDistributedCount,
      color: '#1D6373',
    },
    {
      label: 'Dimanfaatkan (Utilized)',
      sublabel: 'Terkonfirmasi telah dimanfaatkan menjadi modul atau fasilitas',
      value: metrics.ecobricksUtilizedCount,
      color: '#111E19',
    },
  ];

  const maxVal = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-3.5">
      {rows.map((row) => {
        const pct = Math.max(4, Math.round((row.value / maxVal) * 100));
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#17201C]">{row.label}</p>
                <p className="text-[11px] text-[#54625B]">{row.sublabel}</p>
              </div>
              <span className="font-mono text-xs font-semibold text-[#17201C] tabular-nums shrink-0">
                {row.value} unit
              </span>
            </div>
            <div className="h-2 w-full rounded bg-[#EAEFEA]">
              <div
                className="h-full rounded transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
