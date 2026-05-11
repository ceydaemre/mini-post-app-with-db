const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;

    cb(null, uniqueName);
  }
});

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
    fileSize: 10 * 1024 * 1024
  }
}).single("media");

function uploadSingleMedia(req, res) {
  upload(req, res, function (error) {
    if (error) {
      return res.status(400).json({
        message: error.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Yüklenecek medya dosyası bulunamadı."
      });
    }

    const mediaType = req.file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    const mediaUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    return res.status(201).json({
      message: "Medya yüklendi.",
      data: {
        media_url: mediaUrl,
        media_type: mediaType,
        original_name: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  });
}

module.exports = {
  uploadSingleMedia
};
