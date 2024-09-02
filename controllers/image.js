const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const multerStorage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: multerStorage });

// Controller function to handle image upload
const uploadImage = (req, res) => {
  try {
    const result = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          return res.status(500).json({ message: 'Upload failed', error });
        }
        res.status(200).json({ url: result.secure_url });
      }
    );
    req.file.stream.pipe(result);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// Export the uploadImage controller
module.exports = {
  uploadImage,
  upload, // Exporting multer instance if needed elsewhere
};
