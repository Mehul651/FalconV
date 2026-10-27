import { AuthScreen } from '@/components/brand/auth-screen';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthScreen>{children}</AuthScreen>;
}
