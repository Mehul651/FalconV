'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error.message ?? 'Unable to sign in');
      return;
    }
    router.push('/overview');
    router.refresh();
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-white/80 shadow-[0_24px_60px_rgba(28,25,23,0.12)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-zinc-900">
          Sign in to FalconV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="h-11 rounded-lg bg-white" {...form.register('email')} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link className="text-xs font-medium text-[#b08d57] hover:underline" href="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              className="h-11 rounded-lg bg-white"
              {...form.register('password')}
            />
          </div>
          <Button
            className="mt-2 h-11 w-full rounded-lg bg-[#1c1917] text-white hover:bg-black"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-5 text-sm text-zinc-500">
          Need an account?{' '}
          <Link className="font-medium text-[#b08d57] hover:underline" href="/register">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
