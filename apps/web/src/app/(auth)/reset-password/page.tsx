'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const invalidToken = search.get('error') === 'INVALID_TOKEN';
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) {
      toast.error('Reset link is missing or expired');
      return;
    }
    setSubmitting(true);
    const result = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error.message ?? 'Unable to reset password');
      return;
    }
    toast.success('Password updated. Sign in with your new password.');
    router.push('/login');
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-white/80 shadow-[0_24px_60px_rgba(28,25,23,0.12)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-zinc-900">
          Set a new password
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!token || invalidToken ? (
          <p className="text-sm text-zinc-600">
            This reset link is invalid or expired.{' '}
            <Link className="font-medium text-[#b08d57] hover:underline" href="/forgot-password">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                className="h-11 rounded-lg bg-white"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              ) : (
                <p className="text-xs text-zinc-500">At least 10 characters.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="h-11 rounded-lg bg-white"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
            <Button
              className="h-11 w-full rounded-lg bg-[#1c1917] text-white hover:bg-black"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
