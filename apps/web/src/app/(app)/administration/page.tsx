'use client';

import { ASSIGNABLE_ROLE_CODES, ROLE_LABELS } from '@falconv/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiFetch, type PendingUser } from '@/lib/api';

type DirectoryUser = {
  id: string;
  status: string;
  jobTitle: string | null;
  user: { email: string; name: string };
  department: { name: string } | null;
  roles: Array<{ role: { code: string; name: string } }>;
};

export default function AdministrationPage() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ['pending-users'],
    queryFn: () => apiFetch<PendingUser[]>('/api/v1/users/pending'),
  });
  const departments = useQuery({
    queryKey: ['departments'],
    queryFn: () =>
      apiFetch<Array<{ id: string; name: string }>>('/api/v1/departments'),
  });
  const directory = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<DirectoryUser[]>('/api/v1/users'),
  });

  const [invite, setInvite] = useState({
    name: '',
    email: '',
    roleCode: 'engineer',
    departmentId: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          ...invite,
          departmentId: invite.departmentId || null,
        }),
      }),
    onSuccess: () => {
      toast.success('Invitation sent');
      void queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administration</h1>
        <p className="text-sm text-muted-foreground">
          New sign-ups notify the Super Admin. Approve them as CSM, Admin, Engineer, or another role.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invite user</CardTitle>
            <CardDescription>
              Sends an invitation through Gmail SMTP using the configured sender in .env.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={invite.roleCode}
                onChange={(e) => setInvite({ ...invite, roleCode: e.target.value })}
              >
                {ASSIGNABLE_ROLE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {ROLE_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={invite.departmentId}
                onChange={(e) => setInvite({ ...invite, departmentId: e.target.value })}
              >
                <option value="">None</option>
                {(departments.data ?? []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
              Send invite
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending registrations</CardTitle>
            <CardDescription>
              Assign CSM, Admin, Engineer, or another role. Super Admin is reserved for the owner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.isLoading ? <p className="text-sm">Loading…</p> : null}
            {pending.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : null}
            {(pending.data ?? []).map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium">{item.user.name}</div>
                <div className="text-muted-foreground">{item.user.email}</div>
                <div className="mt-3 flex flex-col gap-2">
                  <select
                    id={`role-${item.id}`}
                    className="h-9 rounded-md border border-input bg-card px-3"
                    defaultValue="engineer"
                  >
                    {ASSIGNABLE_ROLE_CODES.map((code) => (
                      <option key={code} value={code}>
                        {ROLE_LABELS[code]}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Rejection reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        const select = document.getElementById(`role-${item.id}`) as HTMLSelectElement;
                        try {
                          await apiFetch(`/api/v1/users/${item.id}/approve`, {
                            method: 'POST',
                            body: JSON.stringify({ roleCode: select.value }),
                          });
                          toast.success('User approved');
                          void queryClient.invalidateQueries({ queryKey: ['pending-users'] });
                          void queryClient.invalidateQueries({ queryKey: ['users'] });
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Approve failed');
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/v1/users/${item.id}/reject`, {
                            method: 'POST',
                            body: JSON.stringify({ reason: rejectReason || 'Not approved' }),
                          });
                          toast.success('User rejected');
                          void queryClient.invalidateQueries({ queryKey: ['pending-users'] });
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Reject failed');
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User directory</CardTitle>
          <CardDescription>
            Names, emails, roles, and status. Passwords are hashed and cannot be viewed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {directory.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {directory.error ? (
            <p className="mb-3 text-sm text-muted-foreground">
              {directory.error instanceof Error ? directory.error.message : 'Unable to load users.'}
            </p>
          ) : null}
          {directory.isSuccess && directory.data.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">No users in this organization.</p>
          ) : null}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(directory.data ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3">{item.user.name}</td>
                    <td className="px-4 py-3">{item.user.email}</td>
                    <td className="px-4 py-3">
                      {item.roles.length
                        ? item.roles
                            .map((assignment) => ROLE_LABELS[assignment.role.code as keyof typeof ROLE_LABELS] ?? assignment.role.name)
                            .join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
