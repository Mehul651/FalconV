'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { canCreateClient } from '@falconv/shared';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch, type MeResponse } from '@/lib/api';

type ClientListItem = {
  id: string;
  name: string;
  legalName: string | null;
  status: string;
  category: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    title: string | null;
    isPrimary: boolean;
  }>;
  _count: { requests: number };
};

function formatLabel(value: string) {
  return value.replaceAll('_', ' ');
}

export default function ClientStatusPage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/api/v1/users/me'),
  });
  const query = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiFetch<ClientListItem[]>('/api/v1/clients'),
  });

  const active = (query.data ?? []).filter((client) => client.status === 'ACTIVE');
  const onboarding = (query.data ?? []).filter((client) => client.status === 'PROSPECT');
  const showCreate = me.data ? canCreateClient(me.data.roles, me.data.permissions) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Client Status</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Active clients from the existing CRM. Brand is shown only where a legal name or website is already stored.
          </p>
        </div>
        {showCreate ? (
          <Button asChild>
            <Link href="/client-status/new">
              <Plus className="h-4 w-4" />
              New Client
            </Link>
          </Button>
        ) : null}
      </div>

      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading active clients…</p> : null}
      {query.error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          {query.error instanceof Error ? query.error.message : 'Unable to load clients.'}
        </div>
      ) : null}
      {query.isSuccess && onboarding.length > 0 ? (
        <section className="rounded-xl border border-dashed border-border p-4">
          <h2 className="text-sm font-semibold">In onboarding</h2>
          <p className="mb-3 text-xs text-muted-foreground">Prospects from the same client table — not a second list.</p>
          <ul className="flex flex-wrap gap-2">
            {onboarding.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary"
                >
                  {client.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {query.isSuccess && active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">No active clients yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New clients start as Prospect and appear under onboarding until their status is Active.
          </p>
        </div>
      ) : null}

      {active.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((client) => {
            const primary = client.contacts.find((contact) => contact.isPrimary) ?? client.contacts[0];
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{client.name}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {client.legalName ?? 'Legal / brand name not stored'}
                    </p>
                  </div>
                  <Badge>{formatLabel(client.status)}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Category</dt>
                    <dd>{formatLabel(client.category)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Industry</dt>
                    <dd>{client.industry ?? '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Website</dt>
                    <dd className="truncate">{client.website ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Primary contact</dt>
                    <dd>{primary?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Requests</dt>
                    <dd>{client._count.requests}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
