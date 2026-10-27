import { canTransitionIssue, canTransitionTask } from '@falconv/shared';

describe('task workflow', () => {
  it('allows the documented delivery path', () => {
    expect(canTransitionTask('BACKLOG', 'TODO')).toBe(true);
    expect(canTransitionTask('TODO', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionTask('IN_PROGRESS', 'IN_REVIEW')).toBe(true);
    expect(canTransitionTask('IN_REVIEW', 'DONE')).toBe(true);
  });

  it('allows blocked and reopen paths', () => {
    expect(canTransitionTask('IN_PROGRESS', 'BLOCKED')).toBe(true);
    expect(canTransitionTask('BLOCKED', 'TODO')).toBe(true);
    expect(canTransitionTask('DONE', 'TODO')).toBe(true);
    expect(canTransitionTask('TODO', 'TODO')).toBe(true);
  });

  it('rejects skipped jumps', () => {
    expect(canTransitionTask('BACKLOG', 'DONE')).toBe(false);
    expect(canTransitionTask('TODO', 'DONE')).toBe(false);
    expect(canTransitionTask('BACKLOG', 'IN_REVIEW')).toBe(false);
  });
});

describe('issue workflow', () => {
  it('allows the documented path', () => {
    expect(canTransitionIssue('OPEN', 'TRIAGED')).toBe(true);
    expect(canTransitionIssue('TRIAGED', 'ASSIGNED')).toBe(true);
    expect(canTransitionIssue('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionIssue('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(canTransitionIssue('RESOLVED', 'VERIFICATION')).toBe(true);
    expect(canTransitionIssue('VERIFICATION', 'CLOSED')).toBe(true);
  });

  it('allows verification fail and reopen', () => {
    expect(canTransitionIssue('VERIFICATION', 'OPEN')).toBe(true);
    expect(canTransitionIssue('CLOSED', 'OPEN')).toBe(true);
  });

  it('rejects skipped jumps', () => {
    expect(canTransitionIssue('OPEN', 'CLOSED')).toBe(false);
    expect(canTransitionIssue('OPEN', 'ASSIGNED')).toBe(false);
    expect(canTransitionIssue('TRIAGED', 'IN_PROGRESS')).toBe(false);
  });
});
