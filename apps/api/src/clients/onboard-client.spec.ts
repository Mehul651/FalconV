import { canCreateClient, onboardClientSchema } from '@falconv/shared';

describe('client onboarding payload', () => {
  it('accepts existing client fields plus an optional primary contact', () => {
    const parsed = onboardClientSchema.parse({
      name: 'Northwind',
      legalName: 'Northwind Trading Ltd',
      website: 'https://northwind.example',
      category: 'SMB',
      industry: 'Retail',
      notes: 'Introduced by CSM',
      primaryContact: {
        name: 'Pat Lee',
        email: 'pat@northwind.example',
        title: 'Operations',
        phone: '+1 555 0100',
        isPrimary: true,
      },
    });
    expect(parsed.name).toBe('Northwind');
    expect(parsed.primaryContact?.name).toBe('Pat Lee');
  });

  it('still accepts the original create-client body without a contact', () => {
    const parsed = onboardClientSchema.parse({
      name: 'Contoso',
      status: 'ACTIVE',
      category: 'ENTERPRISE',
    });
    expect(parsed.primaryContact).toBeUndefined();
    expect(parsed.status).toBe('ACTIVE');
  });

  it('rejects a contact without a name', () => {
    expect(() =>
      onboardClientSchema.parse({
        name: 'Contoso',
        primaryContact: { email: 'pat@contoso.example' },
      }),
    ).toThrow();
  });

  it('drops an empty contact object and prefixes a website host', () => {
    const parsed = onboardClientSchema.parse({
      name: 'Contoso',
      website: 'contoso.example',
      primaryContact: { name: '', email: '' },
    });
    expect(parsed.website).toBe('https://contoso.example');
    expect(parsed.primaryContact).toBeUndefined();
  });
});

describe('client create authorization', () => {
  it('allows CSM and admins with clients.write and does not invent Sales', () => {
    expect(canCreateClient(['csm'], ['clients.write'])).toBe(true);
    expect(canCreateClient(['admin'], ['clients.write'])).toBe(true);
    expect(canCreateClient(['sales'], ['clients.write'])).toBe(false);
    expect(canCreateClient(['engineer'], ['clients.write'])).toBe(false);
  });
});
