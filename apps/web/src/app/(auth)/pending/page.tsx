import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/server-api';

export default async function PendingPage() {
  const user = await requireUser();
  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-white/80 shadow-[0_24px_60px_rgba(28,25,23,0.12)]">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-[1.65rem] font-semibold tracking-tight text-zinc-900">
          Access pending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-600">
        <p>Hello {user.name}. Your registration is waiting for administrator approval.</p>
        <p>
          You can sign in, but operational modules stay locked until a Super Admin assigns a role
          and activates your account.
        </p>
        <Link className="font-medium text-[#b08d57] hover:underline" href="/login">
          Return to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
