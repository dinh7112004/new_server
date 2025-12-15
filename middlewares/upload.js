const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;

const isProduction = process.env.NODE_ENV === "production";
const useCloudinary = process.env.USE_CLOUDINARY === "true"; // ép dùng Cloudinary cả khi local

// Custom Cloudinary storage for multer
class CloudinaryStorage {
  constructor(options) {
    this.cloudinary = options.cloudinary;
    this.params = options.params || {};
  }

  _handleFile(req, file, cb) {
    // Collect the stream data into a buffer
    const chunks = [];
    file.stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    
    file.stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      
      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // Upload to Cloudinary
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: this.params.folder || "firestore",
          allowed_formats: this.params.allowed_formats || ["jpg", "jpeg", "png", "gif", "webp"],
          transformation: this.params.transformation || [{ width: 800, height: 800, crop: "limit" }],
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            return cb(error);
          }
          cb(null, {
            path: result.secure_url,
            filename: result.public_id,
            size: result.bytes,
          });
        }
      );

      stream.pipe(uploadStream);
    });
    
    file.stream.on("error", (error) => {
      cb(error);
    });
  }

  _removeFile(req, file, cb) {
    // Cloudinary handles file removal separately if needed
    cb(null);
  }
}

let storage;

if (isProduction || useCloudinary) {
  // Cloudinary config
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "firestore",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [{ width: 800, height: 800, crop: "limit" }],
    },
  });
} else {
  // Local upload (to /tmp/uploads)
  const uploadDir = path.join(__dirname, "..", "tmp", "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
      cb(null, uniqueName);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(ext);
  if (mimeType && extname) return cb(null, true);
  cb(new Error("Chỉ chấp nhận ảnh jpeg, jpg, png, gif, webp"));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
