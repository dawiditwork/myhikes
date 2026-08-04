const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadImage = (file, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    stream.end(file.buffer);
  });

const deleteImage = publicId => {
  if (!publicId) {
    return Promise.resolve();
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true
  });
};

module.exports = {
  uploadImage,
  deleteImage
};