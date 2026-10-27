import { canCreateClient } from '@falconv/shared';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-4')).toContain('px-4');
  });
});

describe('canCreateClient', () => {
  it('allows CSM and administrative roles that already have clients.write', () => {
    expect(canCreateClient(['csm'], ['clients.write'])).toBe(true);
    expect(canCreateClient(['admin'], ['clients.write'])).toBe(true);
    expect(canCreateClient(['super_admin'], ['clients.write'])).toBe(true);
  });

  it('does not invent a Sales role and rejects others', () => {
    expect(canCreateClient(['sales'], ['clients.write'])).toBe(false);
    expect(canCreateClient(['executive'], ['clients.read', 'dashboard.executive'])).toBe(false);
    expect(canCreateClient(['csm'], ['clients.read'])).toBe(false);
  });
});
