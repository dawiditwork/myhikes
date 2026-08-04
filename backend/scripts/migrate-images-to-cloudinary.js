require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const User = require('../models/user');
const Place = require('../models/place');

const applyChanges = process.argv.includes('--apply');
const backendRoot = path.join(__dirname, '..');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const isRemote = value => /^https?:\/\//i.test(value || '');
const isDefaultAvatar = value => value === 'uploads/images/default-avatar.png';

const resolveLocalFile = value => {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const absolutePath = path.resolve(backendRoot, normalized);
  const uploadsRoot = path.resolve(backendRoot, 'uploads', 'images');
  if (!absolutePath.startsWith(uploadsRoot + path.sep)) return null;
  return absolutePath;
};

const uploadLegacyImage = async (value, folder) => {
  const filePath = resolveLocalFile(value);
  if (!filePath || !fs.existsSync(filePath)) return null;
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: path.parse(filePath).name,
    overwrite: true,
    unique_filename: false,
    resource_type: 'image'
  });
  return { url: result.secure_url, publicId: result.public_id };
};

const migrate = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({ image: { $exists: true } });
  const places = await Place.find({});
  let candidates = 0;
  let migrated = 0;
  let missing = 0;

  for (const user of users) {
    if (!user.image || isRemote(user.image) || isDefaultAvatar(user.image)) continue;
    candidates += 1;
    const filePath = resolveLocalFile(user.image);
    if (!filePath || !fs.existsSync(filePath)) {
      missing += 1;
      console.warn(`Missing user image: ${user.image}`);
      continue;
    }
    if (!applyChanges) continue;
    const uploaded = await uploadLegacyImage(user.image, 'myhikes/legacy/avatars');
    user.image = uploaded.url;
    user.imagePublicId = uploaded.publicId;
    await user.save();
    migrated += 1;
  }

  for (const place of places) {
    const sourceImages = Array.isArray(place.images) && place.images.length
      ? place.images
      : (place.image ? [place.image] : []);
    if (!sourceImages.some(image => image && !isRemote(image))) continue;

    const nextImages = [];
    const nextPublicIds = [];
    let changed = false;

    for (let index = 0; index < sourceImages.length; index += 1) {
      const image = sourceImages[index];
      if (!image || isRemote(image)) {
        if (image) nextImages.push(image);
        if (place.imagePublicIds[index]) nextPublicIds.push(place.imagePublicIds[index]);
        continue;
      }

      candidates += 1;
      const filePath = resolveLocalFile(image);
      if (!filePath || !fs.existsSync(filePath)) {
        missing += 1;
        nextImages.push(image);
        console.warn(`Missing place image: ${image}`);
        continue;
      }
      if (!applyChanges) {
        nextImages.push(image);
        continue;
      }

      const uploaded = await uploadLegacyImage(image, 'myhikes/legacy/places');
      nextImages.push(uploaded.url);
      nextPublicIds.push(uploaded.publicId);
      changed = true;
      migrated += 1;
    }

    if (applyChanges && changed) {
      place.images = nextImages;
      place.imagePublicIds = nextPublicIds;
      if (place.image && !isRemote(place.image) && nextImages[0]) place.image = nextImages[0];
      await place.save();
    }
  }

  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', candidates, migrated, missing }));
  await mongoose.disconnect();
};

migrate().catch(async err => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
