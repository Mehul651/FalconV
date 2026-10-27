import { canTransitionRequest } from '@falconv/shared';

describe('service request workflow', () => {
  it('allows the documented intake path', () => {
    expect(canTransitionRequest('SUBMITTED', 'UNDER_REVIEW')).toBe(true);
    expect(canTransitionRequest('UNDER_REVIEW', 'TRIAGE')).toBe(true);
    expect(canTransitionRequest('TRIAGE', 'FEASIBILITY')).toBe(true);
    expect(canTransitionRequest('FEASIBILITY', 'PENDING_APPROVAL')).toBe(true);
    expect(canTransitionRequest('PENDING_APPROVAL', 'APPROVED')).toBe(true);
  });

  it('rejects skipped and reverse jumps', () => {
    expect(canTransitionRequest('SUBMITTED', 'APPROVED')).toBe(false);
    expect(canTransitionRequest('APPROVED', 'SUBMITTED')).toBe(false);
    expect(canTransitionRequest('REJECTED', 'APPROVED')).toBe(false);
  });

  it('allows return for revision and resubmit', () => {
    expect(canTransitionRequest('UNDER_REVIEW', 'RETURNED_FOR_REVISION')).toBe(true);
    expect(canTransitionRequest('RETURNED_FOR_REVISION', 'SUBMITTED')).toBe(true);
  });
});
