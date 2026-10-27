import { ASSIGNABLE_ROLE_CODES, approveUserSchema, inviteUserSchema } from '@falconv/shared';

describe('assignable roles', () => {
  it('does not allow Super Admin through invite or approve payloads', () => {
    expect(ASSIGNABLE_ROLE_CODES).not.toContain('super_admin');
    expect(() =>
      inviteUserSchema.parse({ name: 'Pat', email: 'pat@example.com', roleCode: 'super_admin' }),
    ).toThrow();
    expect(() => approveUserSchema.parse({ roleCode: 'super_admin' })).toThrow();
    expect(approveUserSchema.parse({ roleCode: 'engineer' }).roleCode).toBe('engineer');
  });
});
