import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema, registerSchema } from '../../src/validations/auth.validation.js';

const validPassword = 'Valid-password1!';

test('registration permits the reserved local .test demo address', () => {
  const { error, value } = registerSchema.validate({
    name: 'Demo User',
    email: 'Demo@SecureInbox.Test',
    password: validPassword,
  });

  assert.equal(error, undefined);
  assert.equal(value.email, 'demo@secureinbox.test');
});

test('registration and login reject an unrecognized public suffix', () => {
  for (const email of ['person@example.invalid', 'person@example.zzzzzzzz']) {
    assert.ok(registerSchema.validate({ name: 'Person Name', email, password: validPassword }).error);
    assert.ok(loginSchema.validate({ email, password: validPassword }).error);
  }
});

test('registration rejects malformed reserved .test addresses', () => {
  for (const email of ['a@bad_.test', 'a@!.test', 'a..b@example.test']) {
    assert.ok(registerSchema.validate({ name: 'Person Name', email, password: validPassword }).error);
    assert.ok(loginSchema.validate({ email, password: validPassword }).error);
  }
});

test('registration accepts a normal public email domain', () => {
  assert.equal(registerSchema.validate({
    name: 'Person Name',
    email: 'person@example.com',
    password: validPassword,
  }).error, undefined);
});
