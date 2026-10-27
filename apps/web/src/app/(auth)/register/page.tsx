'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [done, setDone] = useState(false);
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    try {
      await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    }
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-white/80 shadow-[0_24px_60px_rgba(28,25,23,0.12)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-zinc-900">
          Request FalconV access
        </CardTitle>
      </CardHeader>
      <CardContent>
        {done ? (
          <p className="text-sm text-zinc-600">
            Request received. After approval you can{' '}
            <Link className="font-medium text-[#b08d57] hover:underline" href="/login">
              sign in
            </Link>
            .
          </p>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" className="h-11 rounded-lg bg-white" {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="h-11 rounded-lg bg-white" {...form.register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" className="h-11 rounded-lg bg-white" {...form.register('jobTitle')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                className="h-11 rounded-lg bg-white"
                {...form.register('password')}
              />
            </div>
            <Button className="h-11 w-full rounded-lg bg-[#1c1917] text-white hover:bg-black" type="submit">
              Submit request
            </Button>
          </form>
        )}
        <p className="mt-5 text-sm text-zinc-500">
          Already have access?{' '}
          <Link className="font-medium text-[#b08d57] hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
