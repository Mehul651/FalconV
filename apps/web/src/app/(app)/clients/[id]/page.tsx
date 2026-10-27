'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

type ClientDetail = {
  id: string;
  name: string;
  legalName: string | null;
  status: string;
  category: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
  contacts: Array<{ id: string; name: string; email: string | null; title: string | null; isPrimary: boolean }>;
  activities: Array<{ id: string; summary: string; createdAt: string }>;
  requests: Array<{ id: string; requestNumber: string; title: string; status: string }>;
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [contact, setContact] = useState({ name: '', email: '', title: '' });
  const query = useQuery({
    queryKey: ['client', params.id],
    queryFn: () => apiFetch<ClientDetail>(`/api/v1/clients/${params.id}`),
  });
  const addContact = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/clients/${params.id}/contacts`, {
        method: 'POST',
        body: JSON.stringify(contact),
      }),
    onSuccess: () => {
      toast.success('Contact added');
      setContact({ name: '', email: '', title: '' });
      void queryClient.invalidateQueries({ queryKey: ['client', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Client not found.</p>;
  }
  const client = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <div className="mt-2 flex gap-2">
          <Badge>{client.status}</Badge>
          <Badge variant="outline">{client.category}</Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{client.legalName ?? 'No legal name'}</p>
            <p className="text-muted-foreground">{client.industry ?? 'Industry not set'}</p>
            {client.website ? (
              <a className="text-primary underline" href={client.website}>
                {client.website}
              </a>
            ) : null}
            <p className="pt-2 text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.contacts.length === 0 ? <p className="text-muted-foreground">No contacts.</p> : null}
            {client.contacts.map((item) => (
              <div key={item.id}>
                <div className="font-medium">
                  {item.name} {item.isPrimary ? <Badge variant="outline">Primary</Badge> : null}
                </div>
                <div className="text-muted-foreground">{item.title}</div>
                <div>{item.email}</div>
              </div>
            ))}
            <div className="space-y-2 border-t border-border pt-3">
              <Input placeholder="Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <Input placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <Input placeholder="Title" value={contact.title} onChange={(e) => setContact({ ...contact, title: e.target.value })} />
              <Button size="sm" onClick={() => addContact.mutate()} disabled={!contact.name}>
                Add contact
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Service requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client.requests.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
            {client.requests.map((item) => (
              <Link key={item.id} className="block hover:underline" href={`/service-requests/${item.id}`}>
                {item.requestNumber} — {item.title}
              </Link>
            ))}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/service-requests/new?clientId=${client.id}`}>New request</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {client.activities.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 border-b border-border py-2">
              <span>{item.summary}</span>
              <span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
