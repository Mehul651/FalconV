'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

function InviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<{ name: string; password: string }>();

  async function onSubmit(values: { name: string; password: string }) {
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ ...values, token }),
      });
      toast.success('Invitation accepted. You can now sign in.');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-white/80 shadow-[0_24px_60px_rgba(28,25,23,0.12)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-zinc-900">
          Accept invitation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Input type="hidden" value={token} readOnly />
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" className="h-11 rounded-lg bg-white" {...form.register('name', { required: true, minLength: 2 })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              className="h-11 rounded-lg bg-white"
              {...form.register('password', { required: true, minLength: 10 })}
            />
          </div>
          <Button
            className="h-11 w-full rounded-lg bg-[#1c1917] text-white hover:bg-black"
            disabled={submitting || !token}
            type="submit"
          >
            Activate account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteForm />
    </Suspense>
  );
}
