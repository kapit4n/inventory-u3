import { describe, expect, it } from 'vitest';
import { DomainError } from '@inventory-u3/domain';
import { toApiProblem } from '../src/http/problem.js';

/**
 * The error envelope is a contract: web and desktop both parse it, so its shape
 * and status mapping are tested directly rather than only through the server.
 */
describe('toApiProblem', () => {
  it('maps a not-found domain error to 404 with the domain code', () => {
    const result = toApiProblem(new DomainError('NOT_FOUND', 'Organization not found'), 'req-1');

    expect(result.status).toBe(404);
    expect(result.body.code).toBe('NOT_FOUND');
    expect(result.body.message).toBe('Organization not found');
    expect(result.body.requestId).toBe('req-1');
  });

  it('maps a duplicate record to 409', () => {
    const result = toApiProblem(new DomainError('DUPLICATED_RECORD', 'Already exists'));

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('DOMAIN_RULE_VIOLATION');
  });

  it('maps invalid input to 422', () => {
    expect(toApiProblem(new DomainError('INVALID_INPUT', 'Bad value')).status).toBe(422);
  });

  it('maps unauthenticated to 401 and forbidden to 403', () => {
    expect(toApiProblem(new DomainError('UNAUTHENTICATED', 'Sign in')).status).toBe(401);
    expect(toApiProblem(new DomainError('FORBIDDEN', 'Not allowed')).status).toBe(403);
  });

  it('never leaks an unknown failure to the client', () => {
    const result = toApiProblem(
      new Error('connection to postgres://user:pw@10.0.0.5 failed: relation "x" does not exist'),
      'req-9',
    );

    expect(result.status).toBe(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
    expect(result.body.message).not.toContain('postgres://');
    expect(result.body.message).not.toContain('does not exist');
    expect(result.body.requestId).toBe('req-9');
    expect(result.body).not.toHaveProperty('stack');
  });

  it('hides driver detail for a non-Error throw', () => {
    const result = toApiProblem('a raw string failure');

    expect(result.status).toBe(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
  });
});
