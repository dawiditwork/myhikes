const test = require('node:test');
const assert = require('node:assert/strict');

const { buildVerificationEmail } = require('../util/email');

test('verification email is branded, accessible and safely escaped', () => {
  const verificationUrl = 'https://myhikes.example/verify-email?token=abc&email=test%40example.com';
  const message = buildVerificationEmail({
    name: '<img src=x onerror=alert(1)>',
    verificationUrl
  });

  assert.equal(message.subject, 'Confirm your MyHikes account');
  assert.match(message.html, /Your next adventure/);
  assert.match(message.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(message.html, /<img src=x/);
  assert.match(message.html, /token=abc&amp;email=test%40example\.com/);
  assert.match(message.text, /https:\/\/myhikes\.example\/verify-email\?token=abc&email=test%40example\.com/);
});
