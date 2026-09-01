const cloudinary = require('../config/cloudinary');

/**
 * Extracts the public ID from a Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null if invalid
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match ? match[1] : null;
};

/**
 * Delete a file from Cloudinary by its URL
 * @param {string} url - Cloudinary URL
 * @returns {Promise<boolean>} - True if deleted
 */
const deleteFile = async (url) => {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) return false;
    
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

module.exports = {
  extractPublicId,
  deleteFile
};
