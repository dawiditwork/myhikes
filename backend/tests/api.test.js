const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

before(() => {
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myhikes-test';

  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-jwt-secret';

  process.env.CLOUDINARY_CLOUD_NAME =
    process.env.CLOUDINARY_CLOUD_NAME || 'test';

  process.env.CLOUDINARY_API_KEY =
    process.env.CLOUDINARY_API_KEY || 'test';

  process.env.CLOUDINARY_API_SECRET =
    process.env.CLOUDINARY_API_SECRET || 'test';

  process.env.GOOGLE_API_KEY =
    process.env.GOOGLE_API_KEY || 'test';

  process.env.CLIENT_URL =
    process.env.CLIENT_URL || 'http://localhost:3000';

  process.env.RESEND_API_KEY =
    process.env.RESEND_API_KEY || 'test';

  process.env.EMAIL_FROM =
    process.env.EMAIL_FROM || 'test@example.com';
});

test('GET /api/health returns API health status', async () => {
  const app = require('../app');

  const response = await request(app)
    .get('/api/health')
    .expect(200);

  assert.equal(response.body.status, 'ok');
});

test('GET /api/health returns security headers', async () => {
  const app = require('../app');

  const response = await request(app)
    .get('/api/health')
    .expect(200);

  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.equal(
    response.headers['referrer-policy'],
    'strict-origin-when-cross-origin'
  );
});