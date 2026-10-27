'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  Bug,
  Building2,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  House,
  LayoutDashboard,
  LineChart,
  ListChecks,
  ListTodo,
  LogOut,
  Moon,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  Sun,
  Wallet,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { NAV_ITEMS } from '@falconv/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { MeResponse, NotificationItem } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const ICONS = {
  LayoutDashboard,
  LineChart,
  Building2,
  Activity,
  ClipboardList,
  FolderKanban,
  ListTodo,
  Bug,
  FileText,
  Gauge,
  Wallet,
  CheckSquare,
  ShieldAlert,
  ListChecks,
  Bell,
  Settings2,
  Settings,
} as const;

export function AppShell({
  user,
  notifications,
  children,
}: {
  user: MeResponse;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => {
    setThemeReady(true);
  }, []);
  const unread = notifications.filter((item) => !item.readAt).length;
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link href="/overview" className="block rounded-md bg-white px-2 py-2" aria-label="Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/falconv-logo.png" alt="FalconV" className="h-10 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-6">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-sidebar-accent hover:text-white',
                  active && 'bg-sidebar-accent text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/overview')} aria-label="Home">
            <House className="h-4 w-4" />
            Home
          </Button>
          <div className="hidden text-sm text-muted-foreground md:block">
            {pathname
              .split('/')
              .filter(Boolean)
              .map((part) => part.replaceAll('-', ' '))
              .join(' / ') || 'overview'}
          </div>
          <div className="relative ml-auto hidden w-72 md:block">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search FalconV" disabled />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {themeReady && resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/notifications" aria-label="Notifications">
              <span className="relative">
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                  <Badge className="absolute -top-2 -right-3 h-4 min-w-4 px-1">{unread}</Badge>
                ) : null}
              </span>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left text-sm md:block">
                  <span className="block font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{user.email}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/overview')}>
                <House className="mr-2 h-4 w-4" />
                Home
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await authClient.signOut();
                  router.push('/login');
                  router.refresh();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
