const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error(
        "Formato de imagem não permitido. Use JPEG, PNG ou WebP"
      );
      error.code = "INVALID_FILE_TYPE";
      return callback(error);
    }

    callback(null, true);
  }
});

module.exports = upload;
