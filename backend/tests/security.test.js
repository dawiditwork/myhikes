const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const checkAuth = require('../middleware/check-auth');
const optionalAuth = require('../middleware/optional-auth');
const validateObjectId = require('../middleware/validate-object-id');
const rateLimit = require('../middleware/rate-limit');

const runMiddleware = (middleware, req, res = { setHeader() {} }) => new Promise(resolve => {
  middleware(req, res, error => resolve(error || null));
});

test('checkAuth accepts a valid bearer token and exposes the user id', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret-that-is-not-used-outside-tests';
  const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
  const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
  const error = await runMiddleware(checkAuth, req);
  assert.equal(error, null);
  assert.equal(req.userData.userId, '507f1f77bcf86cd799439011');
  process.env.JWT_SECRET = previousSecret;
});

test('checkAuth rejects missing and invalid tokens', async () => {
  const missingError = await runMiddleware(checkAuth, { method: 'GET', headers: {} });
  assert.equal(missingError.code, 403);
  const invalidError = await runMiddleware(checkAuth, { method: 'GET', headers: { authorization: 'Bearer invalid' } });
  assert.equal(invalidError.code, 403);
});

test('optionalAuth ignores an invalid token without granting an identity', async () => {
  const req = { headers: { authorization: 'Bearer invalid' } };
  const error = await runMiddleware(optionalAuth, req);
  assert.equal(error, null);
  assert.equal(req.userData, undefined);
});

test('object id validation rejects malformed ids and accepts MongoDB ids', async () => {
  const middleware = validateObjectId('place id');
  const invalid = await new Promise(resolve => middleware({}, {}, error => resolve(error || null), 'not-an-id'));
  assert.equal(invalid.code, 400);
  const valid = await new Promise(resolve => middleware({}, {}, error => resolve(error || null), '507f1f77bcf86cd799439011'));
  assert.equal(valid, null);
});

test('rate limiter blocks requests above its configured threshold', async () => {
  const limiter = rateLimit({ windowMs: 60000, max: 2 });
  const req = { ip: 'test-ip-security-suite', baseUrl: '/api/test', route: { path: '/action' }, path: '/action' };
  const headers = {};
  const res = { setHeader(name, value) { headers[name] = value; } };
  assert.equal(await runMiddleware(limiter, req, res), null);
  assert.equal(await runMiddleware(limiter, req, res), null);
  const blocked = await runMiddleware(limiter, req, res);
  assert.equal(blocked.code, 429);
  assert.ok(Number(headers['Retry-After']) > 0);
});
