import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "jeevan_suraksha_uploads",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

const upload = multer({ storage: storage });

const uploadMemberImages = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "panImage", maxCount: 1 },
]);

// --- NEW MIDDLEWARE FOR CLAIMS ---
const uploadClaimDocuments = upload.fields([
  { name: "deceasedMemberPhoto", maxCount: 1 },
  { name: "deathCertificate", maxCount: 1 },
]);

const uploadBuffer = (buffer, folder, public_id) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id, resource_type: "auto" },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    stream.end(buffer);
  });
};

export { upload, uploadBuffer, uploadMemberImages, uploadClaimDocuments };
export default uploadMemberImages;
