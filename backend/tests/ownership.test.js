const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const Place = require('../models/place');
const placesControllers = require('../controllers/places-controllers');

const originalFindById = Place.findById;

afterEach(() => {
  Place.findById = originalFindById;
});

test('deletePlace returns 403 when authenticated user is not the owner', async () => {
  const ownerId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439012';

  const fakePlace = {
    creator: {
      id: ownerId
    },
    images: [],
    imagePublicIds: []
  };

  Place.findById = () => ({
    populate: async () => fakePlace
  });

  const req = {
    params: {
      pid: '507f1f77bcf86cd799439013'
    },
    userData: {
      userId: otherUserId
    }
  };

  const res = {};

  let capturedError;

  const next = error => {
    capturedError = error;
  };

  await placesControllers.deletePlace(req, res, next);

  assert.ok(capturedError);
  assert.equal(capturedError.code, 403);
  assert.equal(
    capturedError.message,
    'You are not allowed to delete this place.'
  );
});

test('updatePlace returns 403 when authenticated user is not the owner', async () => {
  const ownerId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439012';

  const fakePlace = {
    creator: ownerId
  };

  Place.findById = async () => fakePlace;

  const req = {
    params: {
      pid: '507f1f77bcf86cd799439013'
    },
    userData: {
      userId: otherUserId
    },
    body: {}
  };

  const res = {};

  let capturedError;

  const next = error => {
    capturedError = error;
  };

  await placesControllers.updatePlace(req, res, next);

  assert.ok(capturedError);
  assert.equal(capturedError.code, 403);
  assert.equal(
    capturedError.message,
    'You are not allowed to edit this place.'
  );
});
test('deleteComment returns 403 when authenticated user is not the comment author', async () => {
  const commentAuthorId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439012';

  const fakeComment = {
    author: commentAuthorId
  };

  const fakePlace = {
    comments: {
      id: () => fakeComment
    }
  };

  Place.findById = async () => fakePlace;

  const req = {
    params: {
      pid: '507f1f77bcf86cd799439013',
      cid: '507f1f77bcf86cd799439014'
    },
    userData: {
      userId: otherUserId
    }
  };

  const res = {};

  let capturedError;

  const next = error => {
    capturedError = error;
  };

  await placesControllers.deleteComment(req, res, next);

  assert.ok(capturedError);
  assert.equal(capturedError.code, 403);
  assert.equal(
    capturedError.message,
    'You can only delete your own comments.'
  );
});