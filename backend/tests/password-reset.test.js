const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { resetPassword } = require('../controllers/users-controllers');
const routes = require('../routes/users-routes');

const token = 'ab'.repeat(32);
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const invoke = body => new Promise(resolve => resetPassword(
  { body }, { json: payload => resolve({ status: 200, payload }) },
  error => resolve({ status: error.code, message: error.message })
));

test('reset password security and public endpoint', async t => {
  let record;
  let failure;
  const originalFind = User.findOne;
  const originalUpdate = User.updateOne;
  User.findOne = filter => ({ select: async fields => {
    assert.equal(fields, '+passwordResetTokenHash +passwordResetExpires');
    if (failure === 'read') throw new Error('private database details');
    return record && filter.passwordResetTokenHash === record.passwordResetTokenHash &&
      record.passwordResetExpires > filter.passwordResetExpires.$gt ? { ...record } : null;
  } });
  User.updateOne = async (filter, update, options) => {
    if (failure === 'write') throw new Error('private database details');
    assert.equal(options.runValidators, true);
    if (!record || record._id !== filter._id || record.passwordResetTokenHash !== filter.passwordResetTokenHash ||
        record.passwordResetExpires <= filter.passwordResetExpires.$gt) return { modifiedCount: 0 };
    record.password = update.$set.password;
    for (const key of Object.keys(update.$unset)) delete record[key];
    return { modifiedCount: 1 };
  };
  t.after(() => { User.findOne = originalFind; User.updateOne = originalUpdate; });
  const fresh = () => { failure = null; record = { _id: 'test-user', password: 'old-hash', passwordResetTokenHash: tokenHash, passwordResetExpires: new Date(Date.now() + 60000) }; };

  await t.test('rejects malformed tokens, non-string fields and password bounds', async () => {
    for (const body of [undefined, {}, { token: [], password: '12345678' }, { token: 'z'.repeat(64), password: '12345678' },
      { token: token.slice(1), password: '12345678' }, { token, password: 12345678 },
      { token, password: '1234567' }, { token, password: 'a'.repeat(129) }]) {
      assert.equal((await invoke(body)).status, 400);
    }
  });
  await t.test('rejects unknown and expired tokens', async () => {
    fresh();
    assert.equal((await invoke({ token: 'cd'.repeat(32), password: '12345678' })).status, 400);
    record.passwordResetExpires = new Date(Date.now() - 1000);
    assert.equal((await invoke({ token, password: '12345678' })).status, 400);
    assert.equal(record.password, 'old-hash');
  });
  await t.test('hashes boundary passwords at cost 12, clears token and prevents reuse', async () => {
    for (const password of ['12345678', 'a'.repeat(128)]) {
      fresh();
      assert.equal((await invoke({ token, password })).status, 200);
      assert.equal(bcrypt.getRounds(record.password), 12);
      assert.equal(await bcrypt.compare(password, record.password), true);
      assert.equal(record.passwordResetTokenHash, undefined);
      assert.equal(record.passwordResetExpires, undefined);
      assert.equal((await invoke({ token, password })).status, 400);
    }
  });
  await t.test('only one concurrent request consumes the token', async () => {
    fresh();
    const results = await Promise.all(['password-one', 'password-two'].map(password => invoke({ token, password })));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  });
  await t.test('database failures return a generic 500 and preserve the token', async () => {
    for (const mode of ['read', 'write']) {
      fresh(); failure = mode;
      const result = await invoke({ token, password: '12345678' });
      assert.equal(result.status, 500);
      assert.doesNotMatch(result.message, /private/);
      assert.equal(record.passwordResetTokenHash, tokenHash);
    }
  });
  await t.test('public HTTP route validates input and limits attempts', async () => {
    fresh();
    const app = express();
    app.use(express.json());
    app.use('/api/users', routes);
    app.use((err, req, res, next) => res.status(err.code || 500).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    try {
      await new Promise(resolve => server.once('listening', resolve));
      const url = `http://127.0.0.1:${server.address().port}/api/users/reset-password`;
      const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal((await post({ token, password: '12345678' })).status, 200);
      for (let i = 0; i < 9; i++) assert.equal((await post({ token: [token], password: '12345678' })).status, 400);
      const blocked = await post({ token, password: '12345678' });
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
});
