'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

type Briefing = {
  currency: string;
  activeClients: Array<{ id: string; name: string; category: string }>;
  weekSpend: Array<{ week: string; approvedSpend: number }>;
  topClients: Array<{ id: string; name: string; amount: number }>;
  unassignedFySpend: number;
  onboarding: Array<{
    id: string;
    name: string;
    since: string;
    requestId: string | null;
    requestNumber: string | null;
    requestTitle: string | null;
    stage: string;
  }>;
  majorActions: Array<{
    id: string;
    side: 'csm' | 'engineering';
    kind: string;
    title: string;
    detail: string;
    href: string;
  }>;
};

type SnapshotPayload = {
  demo: boolean;
  generatedAt: string;
  fiscalYear: number;
  briefing: Briefing;
  finance: { fytdSpend: number; pendingSpendExcluded: number };
};

function money(value: number, currency: string) {
  return value.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function weekRange(week: string) {
  const start = new Date(`${week}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function OverviewBriefing() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<SnapshotPayload>('/api/v1/dashboard'),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading business overview…</p>;
  }
  if (query.error) {
    return (
      <p className="text-sm text-muted-foreground">
        {query.error instanceof Error ? query.error.message : 'Unable to load overview.'}
      </p>
    );
  }
  const data = query.data;
  if (!data?.briefing) {
    return <p className="text-sm text-muted-foreground">Overview data is not available yet. Refresh after the API restarts.</p>;
  }

  const { briefing } = data;
  const fourWeekSpend = briefing.weekSpend.reduce((sum, row) => sum + row.approvedSpend, 0);
  const maxWeek = Math.max(...briefing.weekSpend.map((row) => row.approvedSpend), 1);
  const generated = new Date(data.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const csmActions = briefing.majorActions.filter((item) => item.side === 'csm');
  const engActions = briefing.majorActions.filter((item) => item.side === 'engineering');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Business Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live desk briefing · {generated} UTC · approved spend only · FY{data.fiscalYear}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          Open executive dashboard
        </Link>
      </div>
      {data.demo ? (
        <Badge variant="warning">Demo environment — figures are live from this database, including seeded rows</Badge>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Active clients</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">{briefing.activeClients.length} with status Active</p>
          {briefing.activeClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {briefing.activeClients.map((client) => (
                <li key={client.id}>
                  <Link href={`/clients/${client.id}`} className="block truncate text-sm hover:text-primary">
                    {client.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/client-status" className="mt-4 inline-block text-xs font-medium text-primary hover:underline">
            Client Status
          </Link>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Four-week spend</h2>
                <p className="text-[11px] text-muted-foreground">UTC weeks · pending imports excluded</p>
              </div>
              <p className="text-lg font-semibold">{money(fourWeekSpend, briefing.currency)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {briefing.weekSpend.map((row, index) => {
                const share = row.approvedSpend === 0 ? 0 : Math.max(8, (row.approvedSpend / maxWeek) * 100);
                return (
                  <div key={row.week} className="rounded-md bg-muted/60 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      W{index + 1} · {weekRange(row.week)}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{money(row.approvedSpend, briefing.currency)}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {data.finance.pendingSpendExcluded > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {money(data.finance.pendingSpendExcluded, briefing.currency)} pending spend is not in these weeks.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Top 5 clients</h2>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Ranked by FY{data.fiscalYear} approved spend — not a composite score.
            </p>
            {briefing.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {briefing.unassignedFySpend > 0
                  ? `${money(briefing.unassignedFySpend, briefing.currency)} approved this year is not linked to a client.`
                  : 'No approved client spend this year yet.'}
              </p>
            ) : (
              <ol className="space-y-2">
                {briefing.topClients.map((client, index) => (
                  <li key={client.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/clients/${client.id}`} className="min-w-0 truncate hover:text-primary">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{index + 1}</span>
                      {client.name}
                    </Link>
                    <span className="shrink-0 font-medium">{money(client.amount, briefing.currency)}</span>
                  </li>
                ))}
              </ol>
            )}
            {briefing.topClients.length > 0 && briefing.unassignedFySpend > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Plus {money(briefing.unassignedFySpend, briefing.currency)} with no client on the spend row.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Major actions</h2>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Combined CSM and engineering queue. Only blocked, overdue, high/critical, at-risk, and open risks. Routine
          backlog is omitted.
        </p>
        {briefing.majorActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No major open actions right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <ActionColumn title="CSM" items={csmActions} />
            <ActionColumn title="Engineering" items={engActions} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Onboarding</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Clients still in Prospect — the only in-progress onboarding state stored today.
        </p>
        {briefing.onboarding.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients are in onboarding.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {briefing.onboarding.map((client) => (
              <li key={client.id} className="rounded-md border border-border px-3 py-3">
                <Link href={`/clients/${client.id}`} className="font-medium hover:text-primary">
                  {client.name}
                </Link>
                <p className="text-xs text-muted-foreground">{client.stage}</p>
                {client.requestId ? (
                  <Link
                    href={`/service-requests/${client.requestId}`}
                    className="mt-1 block text-xs text-primary hover:underline"
                  >
                    {client.requestNumber}
                    {client.requestTitle ? ` · ${client.requestTitle}` : ''}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ActionColumn({
  title,
  items,
}: {
  title: string;
  items: Briefing['majorActions'];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing major on this side.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block hover:text-primary">
                <p className="text-[11px] text-muted-foreground">{item.kind}</p>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
