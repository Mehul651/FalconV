'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Lightbulb, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export type SnapshotPayload = {
  demo: boolean;
  generatedAt: string;
  fiscalYear: number;
  calculated: Array<{ code: string; name: string; unit: string; value: number; formula: string }>;
  pendingKpiExcluded: number;
  finance: {
    approvedBudget: number;
    approvedSpend: number;
    pendingSpendExcluded: number;
    fytdSpend: number;
    priorFySpend: number;
    remainingBudget: number;
  };
  operations: {
    clientCount: number;
    openTasks: number;
    openIssues: number;
    openRisks: number;
    openCapa: number;
    overdueTasks: number;
  };
  momentum: Array<{ week: string; approvedSpend: number; requestsOpened: number }>;
  clientPulse: Array<{
    id: string;
    name: string;
    status: string;
    note: string;
    at: string | null;
    attention: boolean;
  }>;
  depletion: Array<{ name: string; amount: number }>;
  pipeline: Array<{ key: string; label: string; count: number }>;
  actionBoard: Array<{ key: string; label: string; value: number; href: string }>;
  spendCategories: Array<{ category: string; amount: number }>;
  clientHealth: {
    onPath: number;
    offPath: number;
    atClosure: number;
    projectTotal: number;
    taskCompletionPct: number;
    clientsWithAttention: number;
  };
  recommendations: string[];
};

type Series = 'approvedSpend' | 'requestsOpened' | 'compare';

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function moneyExact(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function weekLabel(week: string) {
  return new Date(`${week}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function pctDelta(current: number, previous: number) {
  if (previous === 0) {
    return null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function PulseTime({ at }: { at: string | null }) {
  if (!at) {
    return <span className="text-[10px] text-neutral-400">No date</span>;
  }
  const date = new Date(at);
  return (
    <span className="shrink-0 text-[10px] text-neutral-400">
      {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
    </span>
  );
}

function MomentumChart({
  points,
  series,
}: {
  points: SnapshotPayload['momentum'];
  series: Series;
}) {
  const width = 720;
  const height = 236;
  const pad = { l: 52, r: 48, t: 18, b: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const spendMax = Math.max(...points.map((p) => p.approvedSpend), 1);
  const intakeMax = Math.max(...points.map((p) => p.requestsOpened), 1);
  const primaryMax = series === 'requestsOpened' ? intakeMax : spendMax;
  const coords = points.map((point, index) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const spendY = pad.t + innerH - (point.approvedSpend / spendMax) * innerH;
    const intakeY = pad.t + innerH - (point.requestsOpened / intakeMax) * innerH;
    const primaryY = series === 'requestsOpened' ? intakeY : spendY;
    return { x, spendY, intakeY, primaryY, ...point };
  });
  const spendLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.spendY}`).join(' ');
  const intakeLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.intakeY}`).join(' ');
  const primaryLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.primaryY}`).join(' ');
  const last = coords[coords.length - 1];
  const area =
    series === 'compare'
      ? `${spendLine} L ${last?.x ?? pad.l} ${pad.t + innerH} L ${coords[0]?.x ?? pad.l} ${pad.t + innerH} Z`
      : `${primaryLine} L ${last?.x ?? pad.l} ${pad.t + innerH} L ${coords[0]?.x ?? pad.l} ${pad.t + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[236px] w-full">
      {[0, 0.5, 1].map((tick) => {
        const y = pad.t + innerH * (1 - tick);
        return (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke="#e6e1d6" strokeWidth="1" />
            <text x={8} y={y + 4} fill="#8a8376" fontSize="10">
              {series === 'requestsOpened' ? Math.round(primaryMax * tick) : money(primaryMax * tick)}
            </text>
            {series === 'compare' ? (
              <text x={width - 6} y={y + 4} textAnchor="end" fill="#8a8376" fontSize="10">
                {Math.round(intakeMax * tick)}
              </text>
            ) : null}
          </g>
        );
      })}
      <path d={area} fill={series === 'requestsOpened' ? '#123a7314' : '#c5262c14'} />
      {series === 'compare' ? (
        <>
          <path d={spendLine} fill="none" stroke="#c5262c" strokeWidth="2.6" />
          <path d={intakeLine} fill="none" stroke="#123a73" strokeWidth="2" strokeDasharray="5 4" />
        </>
      ) : (
        <path d={primaryLine} fill="none" stroke={series === 'requestsOpened' ? '#123a73' : '#c5262c'} strokeWidth="2.6" />
      )}
      {coords.map((c, index) => {
        const y = series === 'compare' ? c.spendY : c.primaryY;
        const isLast = index === coords.length - 1;
        return (
          <g key={c.week}>
            <circle cx={c.x} cy={y} r={isLast ? 5.5 : 3.2} fill="#c5262c" />
            {isLast ? <circle cx={c.x} cy={y} r="9" fill="none" stroke="#c5262c" strokeWidth="1.2" /> : null}
            {series === 'compare' ? <circle cx={c.x} cy={c.intakeY} r="2.6" fill="#123a73" /> : null}
          </g>
        );
      })}
      {coords
        .filter((_, i) => i % 2 === 0 || i === coords.length - 1)
        .map((c) => (
          <text key={`l-${c.week}`} x={c.x} y={height - 10} textAnchor="middle" fill="#8a8376" fontSize="10">
            {weekLabel(c.week)}
          </text>
        ))}
    </svg>
  );
}

const ACTION_TONE: Record<string, string> = {
  inProgress: 'bg-emerald-600',
  inReview: 'bg-emerald-500',
  blocked: 'bg-orange-500',
  overdue: 'bg-orange-600',
  onHold: 'bg-slate-400',
  atRisk: 'bg-red-500',
  openIssues: 'bg-amber-500',
  openRisks: 'bg-red-600',
};

export function SnapshotCommandCenter() {
  const [series, setSeries] = useState<Series>('approvedSpend');
  const [showTips, setShowTips] = useState(false);
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<SnapshotPayload>('/api/v1/dashboard'),
  });

  const maxDepletion = useMemo(
    () => Math.max(...(query.data?.depletion.map((row) => row.amount) ?? [0]), 1),
    [query.data],
  );
  const maxPipeline = useMemo(
    () => Math.max(...(query.data?.pipeline.map((row) => row.count) ?? [0]), 1),
    [query.data],
  );
  const maxAction = useMemo(
    () => Math.max(...(query.data?.actionBoard.map((row) => row.value) ?? [0]), 1),
    [query.data],
  );

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading live snapshot…</p>;
  }
  if (query.error) {
    return (
      <p className="text-sm text-muted-foreground">
        {query.error instanceof Error ? query.error.message : 'Unable to load snapshot.'}
      </p>
    );
  }
  const data = query.data;
  if (!data) {
    return <p className="text-sm text-muted-foreground">No snapshot data.</p>;
  }

  const period = new Date(data.generatedAt).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const lastWeek = data.momentum.at(-1);
  const prevWeek = data.momentum.at(-2);
  const wow = lastWeek && prevWeek ? pctDelta(lastWeek.approvedSpend, prevWeek.approvedSpend) : null;
  const yoy = pctDelta(data.finance.fytdSpend, data.finance.priorFySpend);
  const pipelineTotal = data.pipeline.reduce((sum, stage) => sum + stage.count, 0);
  const won = data.pipeline.find((s) => s.key === 'won')?.count ?? 0;
  const wonShare = pipelineTotal === 0 ? 0 : Number(((won / pipelineTotal) * 100).toFixed(1));
  const utilization =
    data.finance.approvedBudget === 0
      ? 0
      : Number(((data.finance.approvedSpend / data.finance.approvedBudget) * 100).toFixed(1));

  return (
    <div className="snapshot-print -mx-1 space-y-4 bg-[#f6f3eb] p-1 text-[#161410] md:-mx-4 md:p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.32em] text-neutral-500">INTELLIGENCE</p>
          <h1 className="mt-1 font-black tracking-tight text-4xl md:text-5xl">Executive dashboard</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            Detailed operations review · {period} UTC
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="bg-white" onClick={() => setShowTips((open) => !open)}>
            <Lightbulb className="h-4 w-4" />
            Recommendations
            {data.recommendations.length > 0 ? (
              <span className="ml-1 rounded-full bg-neutral-900 px-1.5 text-[10px] text-white">
                {data.recommendations.length}
              </span>
            ) : null}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Snapshot PDF
          </Button>
        </div>
      </div>
      {data.demo ? (
        <Badge variant="warning">Demo environment — figures are live from this database, including seeded rows</Badge>
      ) : null}
      {showTips ? (
        <div className="rounded-none border border-neutral-800 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Recommendations from live exceptions</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            {data.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-none border border-neutral-800 bg-white p-4 xl:col-span-2">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-wide">12-WEEK MOMENTUM</h2>
              <p className="text-xs text-neutral-500">
                {series === 'approvedSpend'
                  ? 'Approved expenditure only. Pending imports are excluded.'
                  : series === 'requestsOpened'
                    ? 'Service requests submitted each UTC week.'
                    : 'Approved spend (solid) vs intake volume (dashed), independently scaled.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {wow === null ? (
                <span className="text-xs font-semibold text-neutral-500">WoW n/a</span>
              ) : (
                <span className={`text-xs font-semibold ${wow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  WoW {wow >= 0 ? '+' : ''}
                  {wow}% spend
                </span>
              )}
              <div className="flex rounded-full border border-neutral-300 p-0.5 text-xs">
                {(
                  [
                    ['approvedSpend', 'Spend'],
                    ['requestsOpened', 'Intake'],
                    ['compare', 'Compare'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    className={`rounded-full px-3 py-1 ${series === key ? 'bg-neutral-900 text-white' : ''}`}
                    onClick={() => setSeries(key)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <MomentumChart points={data.momentum} series={series} />
        </section>

        <section className="rounded-none border border-neutral-800 bg-white p-4">
          <h2 className="mb-3 text-lg font-black tracking-wide">CLIENT PULSE</h2>
          <div className="divide-y divide-neutral-100">
            {data.clientPulse.length === 0 ? (
              <p className="text-sm text-neutral-500">No clients yet.</p>
            ) : (
              data.clientPulse.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`} className="block py-2.5 hover:bg-neutral-50">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${client.attention ? 'bg-red-600' : 'bg-emerald-500'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold uppercase tracking-wide">{client.name}</p>
                        <PulseTime at={client.at} />
                      </div>
                      <p className="line-clamp-2 text-xs text-neutral-500">{client.note}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-none border border-neutral-800 bg-white p-4">
          <h2 className="mb-1 text-lg font-black tracking-wide">DEPLETION PULSE</h2>
          <p className="mb-3 text-xs text-neutral-500">Approved spend by client</p>
          <div className="space-y-2.5">
            {data.depletion.length === 0 ? (
              <p className="text-sm text-neutral-500">No approved spend yet.</p>
            ) : (
              data.depletion.map((row, index) => (
                <div key={row.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate pr-2">{row.name}</span>
                    <span className="font-medium">{moneyExact(row.amount)}</span>
                  </div>
                  <div className="h-2.5 bg-neutral-100">
                    <div
                      className="h-2.5"
                      style={{
                        width: `${Math.max(4, (row.amount / maxDepletion) * 100)}%`,
                        background: index === 0 ? '#123a73' : index === 1 ? '#2f6fbf' : '#7aa2d4',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-none border border-neutral-800 bg-white p-4">
          <div className="mb-1 flex items-end justify-between">
            <h2 className="text-lg font-black tracking-wide">DISCOVERY → WON</h2>
            <span className="text-[11px] text-neutral-500">Project created {wonShare}% of live pipeline</span>
          </div>
          <p className="mb-3 text-xs text-neutral-500">Live service-request pipeline</p>
          <div className="space-y-2.5">
            {data.pipeline.map((stage) => (
              <Link key={stage.key} href="/service-requests" className="block">
                <div className="mb-1 flex justify-between text-xs">
                  <span>{stage.label}</span>
                  <span className="font-medium">{stage.count}</span>
                </div>
                <div className="h-2.5 bg-neutral-100">
                  <div
                    className="h-2.5 bg-slate-400"
                    style={{ width: `${Math.max(stage.count === 0 ? 0 : 6, (stage.count / maxPipeline) * 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-none border border-neutral-800 bg-white p-4">
          <h2 className="mb-1 text-lg font-black tracking-wide">ACTION BOARD</h2>
          <p className="mb-3 text-xs text-neutral-500">Open delivery load</p>
          <div className="space-y-2">
            {data.actionBoard.map((row) => (
              <Link key={row.key} href={row.href} className="block">
                <div className="mb-1 flex justify-between text-xs">
                  <span>{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
                <div className="h-2 bg-neutral-100">
                  <div
                    className={`h-2 ${ACTION_TONE[row.key] ?? 'bg-emerald-600'}`}
                    style={{ width: `${Math.max(row.value === 0 ? 0 : 6, (row.value / maxAction) * 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-none border border-neutral-800 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Download className="h-4 w-4" />
          Spend insights · FY{data.fiscalYear} · approved only
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-neutral-200 p-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Approved spend YTD</p>
            <p className="mt-1 text-3xl font-black text-red-600">{money(data.finance.fytdSpend)}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Prior year: {moneyExact(data.finance.priorFySpend)}
              {yoy === null ? ' · YoY n/a' : ` · YoY ${yoy >= 0 ? '+' : ''}${yoy}%`}
            </p>
          </div>
          <div className="border border-neutral-200 p-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Approved budget remaining</p>
            <p className="mt-1 text-3xl font-black">{money(data.finance.remainingBudget)}</p>
            <p className="mt-2 text-xs text-neutral-500">
              {utilization}% of {moneyExact(data.finance.approvedBudget)} drawn
            </p>
            <div className="mt-2 h-1.5 bg-neutral-100">
              <div className="h-1.5 bg-red-500" style={{ width: `${Math.min(100, utilization)}%` }} />
            </div>
          </div>
          <div className="border border-neutral-200 p-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">Excluded pending spend</p>
            <p className="mt-1 text-3xl font-black text-amber-700">{money(data.finance.pendingSpendExcluded)}</p>
            <p className="mt-2 text-xs text-neutral-500">
              {data.pendingKpiExcluded} pending KPI row{data.pendingKpiExcluded === 1 ? '' : 's'} also excluded
            </p>
          </div>
        </div>
        {data.spendCategories.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.spendCategories.map((row) => (
              <div key={row.category} className="flex justify-between border-b border-neutral-100 py-1 text-xs">
                <span className="uppercase tracking-wide text-neutral-500">{row.category}</span>
                <span className="font-medium text-red-600">{moneyExact(row.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-none border border-neutral-800 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-black tracking-wide">CLIENT HEALTH BOARD</h2>
            <p className="text-xs text-neutral-500">
              Project health from live statuses — not a scored model. On path = planned/active, off path = at risk/on
              hold, at closure = completed.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="bg-white">
            <Link href="/projects">Open projects</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-6xl font-black text-emerald-600">{data.clientHealth.onPath}</p>
            <p className="text-sm font-semibold">On path</p>
            <p className="text-xs text-neutral-500">
              {data.clientHealth.projectTotal} projects · planned or active
            </p>
          </div>
          <div>
            <p className="text-6xl font-black text-red-600">{data.clientHealth.offPath}</p>
            <p className="text-sm font-semibold">Off path</p>
            <p className="text-xs text-neutral-500">At risk or on hold</p>
          </div>
          <div>
            <p className="text-6xl font-black">{data.clientHealth.atClosure}</p>
            <p className="text-sm font-semibold">At closure</p>
            <p className="text-xs text-neutral-500">Completed projects</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Task completion</span>
              <span>{data.clientHealth.taskCompletionPct}%</span>
            </div>
            <div className="flex h-2 overflow-hidden bg-neutral-100">
              <div
                className="h-2 bg-emerald-600"
                style={{ width: `${Math.min(100, data.clientHealth.taskCompletionPct)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Clients with at-risk or on-hold work</span>
              <span>
                {data.clientHealth.clientsWithAttention} / {data.operations.clientCount}
              </span>
            </div>
            <div className="h-2 bg-neutral-100">
              <div
                className="h-2 bg-amber-500"
                style={{
                  width: `${
                    data.operations.clientCount === 0
                      ? 0
                      : Math.min(100, (data.clientHealth.clientsWithAttention / data.operations.clientCount) * 100)
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
