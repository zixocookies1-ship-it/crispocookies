import { v2 as cloudinary } from "cloudinary";

// cloudinary.config is safe to call multiple times; keep a flag to configure once
let configured = false;

function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

const FOLDER = "crispo-cookies/products";

export async function uploadImage(file: Buffer, filename: string) {
  ensureConfigured();
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        public_id: filename,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result!.secure_url, publicId: result!.public_id });
      }
    );
    stream.end(file);
  });
}

export async function deleteImage(publicId: string) {
  ensureConfigured();
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
