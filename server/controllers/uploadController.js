const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const isImage = file.mimetype.startsWith("image/");
  const isVideo = file.mimetype.startsWith("video/");

  if (!isImage && !isVideo) {
    return cb(new Error("Sadece görsel veya video dosyası yüklenebilir."));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("media");

function getMediaType(mimetype) {
  if (mimetype.startsWith("video/")) {
    return "video";
  }

  if (mimetype === "image/gif") {
    return "gif";
  }

  return "image";
}

function uploadBufferToCloudinary(fileBuffer, mediaType) {
  return new Promise((resolve, reject) => {
    const resourceType = mediaType === "video" ? "video" : "image";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "postit/uploads",
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function uploadSingleMedia(req, res) {
  upload(req, res, async function (error) {
    try {
      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Yüklenecek medya dosyası bulunamadı.",
        });
      }

      if (!isCloudinaryConfigured()) {
        return res.status(500).json({
          message: "Cloudinary ayarları eksik.",
        });
      }

      const mediaType = getMediaType(req.file.mimetype);

      const cloudinaryResult = await uploadBufferToCloudinary(
        req.file.buffer,
        mediaType
      );

      return res.status(201).json({
        message: "Medya yüklendi.",
        data: {
          media_url: cloudinaryResult.secure_url,
          media_type: mediaType,
          original_name: req.file.originalname,
          filename: cloudinaryResult.public_id,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error("uploadSingleMedia controller hatası:", error.message);

      return res.status(500).json({
        message: "Medya yüklenirken hata oluştu.",
      });
    }
  });
}

module.exports = {
  uploadSingleMedia,
};
