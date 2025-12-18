import cloudinary from '../config/cloudinary.js';

export const deleteCloudinaryImage = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    const parts = imageUrl.split('/');
    const file = parts.pop();              // abc123.jpg
    const folder = parts.pop();            // menus
    const publicId = `${folder}/${file.split('.')[0]}`;

    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
};
