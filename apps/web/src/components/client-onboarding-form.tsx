'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CLIENT_CATEGORIES, canCreateClient, onboardClientSchema } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, type MeResponse } from '@/lib/api';

const STEPS = [
  { id: 'identity', title: 'Identity', hint: 'Name and brand already stored on the client record.' },
  { id: 'profile', title: 'Profile', hint: 'Classification used by the CRM today.' },
  { id: 'contact', title: 'Primary contact', hint: 'Optional. Saved on the existing contacts table.' },
  { id: 'review', title: 'Review', hint: 'Starts as Prospect — the current onboarding status.' },
] as const;

type FormValues = {
  name: string;
  legalName: string;
  website: string;
  industry: string;
  notes: string;
  category: (typeof CLIENT_CATEGORIES)[number];
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactTitle: string;
};

function currentStep(index: number) {
  return STEPS[index] ?? STEPS[0];
}

export function ClientOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/api/v1/users/me'),
  });
  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      legalName: '',
      website: '',
      industry: '',
      notes: '',
      category: 'OTHER',
      primaryContactName: '',
      primaryContactEmail: '',
      primaryContactPhone: '',
      primaryContactTitle: '',
    },
  });

  const values = form.watch();
  const allowed = me.data ? canCreateClient(me.data.roles, me.data.permissions) : false;
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  function payloadFromForm(raw: FormValues) {
    return onboardClientSchema.parse({
      name: raw.name,
      legalName: raw.legalName || null,
      website: raw.website || '',
      industry: raw.industry || null,
      notes: raw.notes || null,
      category: raw.category,
      status: 'PROSPECT',
      primaryContact: {
        name: raw.primaryContactName,
        email: raw.primaryContactEmail,
        phone: raw.primaryContactPhone,
        title: raw.primaryContactTitle,
        isPrimary: true,
      },
    });
  }

  async function next() {
    if (step === 0) {
      const result = onboardClientSchema
        .pick({ name: true, legalName: true, website: true })
        .safeParse({ name: values.name, legalName: values.legalName, website: values.website });
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? 'Check identity fields');
        return;
      }
    }
    if (step === 2) {
      const result = onboardClientSchema.pick({ primaryContact: true }).safeParse({
        primaryContact: {
          name: values.primaryContactName,
          email: values.primaryContactEmail,
          phone: values.primaryContactPhone,
          title: values.primaryContactTitle,
        },
      });
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? 'Check contact fields');
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function onSubmit(raw: FormValues) {
    setSubmitting(true);
    try {
      const payload = payloadFromForm(raw);
      const created = await apiFetch<{ id: string }>('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Client started as Prospect');
      router.push(`/clients/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (me.isLoading) {
    return <p className="text-sm text-muted-foreground">Checking permissions…</p>;
  }
  if (!allowed) {
    return (
      <div className="rounded-lg border border-border px-6 py-10 text-center">
        <p className="font-medium">You cannot onboard clients</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Creation is limited to CSM and administrative roles. There is no Sales role in FalconV.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/client-status">Back to Client Status</Link>
        </Button>
      </div>
    );
  }

  const meta = currentStep(step);
  const contactLabel = values.primaryContactName.trim() || 'None yet';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Client Status</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">New client</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guided onboarding using fields FalconV already stores. No extra brand columns are invented here.
        </p>
      </div>

      <div>
        <div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length} · {meta.title}
          </span>
          <span className="text-right">{meta.hint}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-1.5 bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {STEPS.map((item, index) => (
            <li key={item.id} className={index === step ? 'font-semibold text-foreground' : ''}>
              {item.title}
            </li>
          ))}
        </ol>
      </div>

      <form className="space-y-5 rounded-xl border border-border bg-card p-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className={step === 0 ? 'space-y-5' : 'hidden'}>
          <div className="space-y-2">
            <Label htmlFor="name">Client name</Label>
            <Input id="name" {...form.register('name', { required: true, minLength: 2 })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal / brand name</Label>
            <Input id="legalName" {...form.register('legalName')} />
            <p className="text-xs text-muted-foreground">Stored as legal name. There is no separate brand field yet.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="https://" {...form.register('website')} />
          </div>
        </div>

        <div className={step === 1 ? 'space-y-5' : 'hidden'}>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              {...form.register('category')}
            >
              {CLIENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" {...form.register('industry')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register('notes')} />
          </div>
        </div>

        <div className={step === 2 ? 'space-y-5' : 'hidden'}>
          <p className="text-sm text-muted-foreground">Skip this step if no contact is available yet.</p>
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" {...form.register('primaryContactName')} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactTitle">Title</Label>
              <Input id="contactTitle" {...form.register('primaryContactTitle')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone</Label>
              <Input id="contactPhone" {...form.register('primaryContactPhone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" {...form.register('primaryContactEmail')} />
          </div>
        </div>

        <div className={step === 3 ? 'space-y-3' : 'hidden'}>
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={values.name} />
            <Row label="Legal / brand" value={values.legalName || 'Not provided'} />
            <Row label="Website" value={values.website || 'Not provided'} />
            <Row label="Category" value={values.category} />
            <Row label="Industry" value={values.industry || 'Not provided'} />
            <Row label="Primary contact" value={contactLabel} />
            <Row label="Status on save" value="PROSPECT (onboarding)" />
          </dl>
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          {step === 0 ? (
            <Button asChild type="button" variant="outline">
              <Link href="/client-status">Cancel</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => void next()}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Start onboarding'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
