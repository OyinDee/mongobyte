const cloudinary = require('../configs/cloudinary');

// Controller function to handle image upload
exports.uploadImage = async (request, response) => {

  try {
    const { image } = request.body

    if (!image) {
      return response.status(400).json({ message: 'No image provided' });
    }

    // Upload the Base64 image to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' }
      ],
    });

    console.log('Cloudinary upload result:', result);
    response.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    response.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
