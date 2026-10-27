'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

type FinanceSnapshot = {
  totals: { approvedBudget: number; approvedSpend: number; pendingSpendExcluded: number };
  budgets: Array<{
    id: string;
    name: string;
    fiscalYear: number;
    amount: string;
    currency: string;
    status: string;
    spentApproved: number;
  }>;
  approvedEntries: Array<{
    id: string;
    amount: string;
    currency: string;
    category: string;
    description: string;
    occurredOn: string;
  }>;
  pendingEntries: Array<{
    id: string;
    amount: string;
    status: string;
    category: string;
    description: string;
  }>;
};

export default function ExpenditurePage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['finance'],
    queryFn: () => apiFetch<FinanceSnapshot>('/api/v1/finance'),
  });
  const [budgetName, setBudgetName] = useState('');
  const [year, setYear] = useState(String(new Date().getUTCFullYear()));
  const [budgetAmount, setBudgetAmount] = useState('');
  const [spend, setSpend] = useState({ amount: '', category: '', description: '', occurredOn: '' });

  const createBudget = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/finance/budgets', {
        method: 'POST',
        body: JSON.stringify({
          name: budgetName,
          fiscalYear: Number(year),
          amount: Number(budgetAmount),
          currency: 'USD',
        }),
      }),
    onSuccess: () => {
      toast.success('Budget drafted — not in approved totals until approved');
      setBudgetName('');
      setBudgetAmount('');
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approveBudget = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/finance/budgets/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Budget approved');
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createSpend = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/finance/expenditures', {
        method: 'POST',
        body: JSON.stringify({
          ...spend,
          amount: Number(spend.amount),
          currency: 'USD',
        }),
      }),
    onSuccess: () => {
      toast.success('Expenditure drafted — excluded from approved spend');
      setSpend({ amount: '', category: '', description: '', occurredOn: '' });
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitSpend = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/finance/expenditures/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Submitted for approval');
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = query.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenditure</h1>
          <p className="text-sm text-muted-foreground">Approved budget and spend only. Pending imports never change these totals.</p>
        </div>
        <Button asChild>
          <Link href="/kpi/import">Import Excel</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Approved budget</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data ? data.totals.approvedBudget.toFixed(2) : '—'} USD</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved spend</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data ? data.totals.approvedSpend.toFixed(2) : '—'} USD</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending (excluded)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data ? data.totals.pendingSpendExcluded.toFixed(2) : '—'} USD</p>
            <Badge variant="warning" className="mt-2">
              Not in approved totals
            </Badge>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New budget draft</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="Name" value={budgetName} onChange={(event) => setBudgetName(event.target.value)} />
          <Input placeholder="Year" value={year} onChange={(event) => setYear(event.target.value)} className="w-24" />
          <Input placeholder="Amount" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} className="w-32" />
          <Button onClick={() => createBudget.mutate()}>Save draft</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.budgets ?? []).map((budget) => (
            <div key={budget.id} className="flex items-center justify-between gap-2 border-b border-border py-2">
              <div>
                {budget.name} ({budget.fiscalYear}) · {budget.amount} {budget.currency} · spent {budget.spentApproved.toFixed(2)}
                <Badge variant="outline" className="ml-2">
                  {budget.status}
                </Badge>
              </div>
              {budget.status === 'DRAFT' ? (
                <Button size="sm" variant="outline" onClick={() => approveBudget.mutate(budget.id)}>
                  Approve
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>New expenditure draft</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Amount"
            value={spend.amount}
            onChange={(event) => setSpend({ ...spend, amount: event.target.value })}
          />
          <Input
            type="date"
            value={spend.occurredOn}
            onChange={(event) => setSpend({ ...spend, occurredOn: event.target.value })}
          />
          <Input
            placeholder="Category"
            value={spend.category}
            onChange={(event) => setSpend({ ...spend, category: event.target.value })}
          />
          <Input
            placeholder="Description"
            value={spend.description}
            onChange={(event) => setSpend({ ...spend, description: event.target.value })}
          />
          <Button onClick={() => createSpend.mutate()}>Save draft</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Approved spend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.approvedEntries.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">No approved expenditure yet.</p>
          ) : (
            data?.approvedEntries.map((entry) => (
              <div key={entry.id}>
                {entry.occurredOn.slice(0, 10)} · {entry.amount} {entry.currency} · {entry.category} — {entry.description}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {(data?.pendingEntries.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Unpublished expenditure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.pendingEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between">
                <span>
                  {entry.amount} · {entry.category} · {entry.status}
                </span>
                {entry.status === 'DRAFT' ? (
                  <Button size="sm" variant="outline" onClick={() => submitSpend.mutate(entry.id)}>
                    Submit
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
