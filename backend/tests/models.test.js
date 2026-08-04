const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../models/user');
const Place = require('../models/place');
const Report = require('../models/report');
const Notification = require('../models/notification');

const objectId = () => new mongoose.Types.ObjectId();

test('new accounts require the hardened password length', () => {
  const shortPassword = new User({ name: 'Tester', email: 'short@example.com', password: '1234567', image: 'avatar.jpg' });
  assert.equal(shortPassword.validateSync().errors.password.kind, 'minlength');
  const valid = new User({ name: 'Tester', email: 'valid@example.com', password: '12345678', image: 'avatar.jpg' });
  assert.equal(valid.validateSync(), undefined);
});

test('legacy users stay verified while signup can require email verification', () => {
  const legacyUser = new User({ name: 'Legacy', email: 'legacy@example.com', password: '12345678', image: 'avatar.jpg' });
  const pendingUser = new User({ name: 'Pending', email: 'pending@example.com', password: '12345678', image: 'avatar.jpg', isEmailVerified: false });
  assert.equal(legacyUser.isEmailVerified, true);
  assert.equal(pendingUser.isEmailVerified, false);
});

test('place validates core trail fields and keeps legacy equipment compatible', () => {
  const place = new Place({
    title: 'Test trail', description: 'A valid test trail.', images: ['trail.jpg'], address: 'Test address',
    parkingAddress: 'Parking', hikeDuration: 60, distanceKm: 5, elevationGain: 300,
    difficulty: 'moderate', trailStatus: 'open', requiredEquipment: ['helmet', 'water'],
    location: { lat: 47, lng: 8 }, creator: objectId()
  });
  assert.equal(place.validateSync(), undefined);
  place.requiredEquipment = ['unsupported_item'];
  assert.equal(place.validateSync().errors.requiredEquipment.kind, 'user defined');
});

test('condition reports retain confirmation users', () => {
  const confirmer = objectId();
  const place = new Place({
    title: 'Condition trail', description: 'A valid trail description.', images: ['trail.jpg'], address: 'Address',
    parkingAddress: 'Parking', location: { lat: 47, lng: 8 }, creator: objectId(),
    conditionReports: [{ condition: 'ice', author: objectId(), confirmedBy: [confirmer] }]
  });
  assert.equal(place.validateSync(), undefined);
  assert.equal(place.conditionReports[0].confirmedBy[0].toString(), confirmer.toString());
});

test('moderation reports reject unsupported reasons', () => {
  const report = new Report({ targetType: 'comment', place: objectId(), targetId: objectId().toString(), reason: 'invalid', reporter: objectId() });
  assert.equal(report.validateSync().errors.reason.kind, 'enum');
});

test('notifications accept moderation alerts and reject unknown types', () => {
  const notification = new Notification({ recipient: objectId(), type: 'moderation_report', message: 'reported a comment for moderation.' });
  assert.equal(notification.validateSync(), undefined);
  notification.type = 'unknown';
  assert.equal(notification.validateSync().errors.type.kind, 'enum');
});
