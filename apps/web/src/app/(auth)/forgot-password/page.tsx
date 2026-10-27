'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    const result = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: '/reset-password',
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error.message ?? 'Unable to send reset email');
      return;
    }
    setSent(true);
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-white/80 shadow-[0_24px_60px_rgba(28,25,23,0.12)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-zinc-900">
          Forgot password
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-zinc-600">
            If that email has an account, a reset link was sent from FalconV. Check the inbox,
            then{' '}
            <Link className="font-medium text-[#b08d57] hover:underline" href="/login">
              sign in
            </Link>
            .
          </p>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="h-11 rounded-lg bg-white" {...form.register('email')} />
            </div>
            <Button
              className="h-11 w-full rounded-lg bg-[#1c1917] text-white hover:bg-black"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <p className="mt-5 text-sm text-zinc-500">
          Remembered it?{' '}
          <Link className="font-medium text-[#b08d57] hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
