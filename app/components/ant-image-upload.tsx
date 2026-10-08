"use client";

import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { useState, type Dispatch, type SetStateAction } from "react";

export type UploadedAntImage = {
  url: string;
  publicId: string;
};

type AntImageUploadProps = {
  images: UploadedAntImage[];
  onChange: Dispatch<SetStateAction<UploadedAntImage[]>>;
  onUploadingChange: (uploading: boolean) => void;
  disabled?: boolean;
  maxFiles?: number;
  userId: string;
};

export default function AntImageUpload({
  images,
  onChange,
  onUploadingChange,
  disabled = false,
  maxFiles = 5,
  userId,
}: AntImageUploadProps) {
  const [uploadError, setUploadError] = useState("");

  function removeImage(publicId: string) {
    onChange(images.filter((image) => image.publicId !== publicId));
  }

  return (
    <div className="ant-image-upload">
      <div className="image-upload-grid">
        {images.map((image) => (
          <div key={image.publicId} className="uploaded-image">
            <Image
              src={image.url}
              alt="รูปตัวอย่างมด"
              fill
              sizes="(max-width: 720px) 50vw, 140px"
              unoptimized
            />

            <button
              type="button"
              className="uploaded-image-remove"
              onClick={() => removeImage(image.publicId)}
              disabled={disabled}
              aria-label="ลบรูปภาพ"
            >
              ×
            </button>
          </div>
        ))}

        {images.length < maxFiles && (
          <CldUploadWidget
            signatureEndpoint="/api/sign-cloudinary-params"
            options={{
              sources: ["local", "camera"],
              multiple: true,
              maxFiles: maxFiles - images.length,
              clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
              maxFileSize: 4 * 1024 * 1024,
              resourceType: "image",
              folder: `ant-database/${userId}`,
            }}
            onSuccess={(result) => {
              const info = result.info;

              if (typeof info !== "object" || info === null) {
                return;
              }

              if (
                typeof info.secure_url !== "string" ||
                typeof info.public_id !== "string"
              ) {
                return;
              }

              const newImage: UploadedAntImage = {
                url: info.secure_url,
                publicId: info.public_id,
              };

              setUploadError("");
              onChange((current) =>
                current.some((image) => image.publicId === newImage.publicId)
                  ? current
                  : [...current, newImage].slice(0, maxFiles),
              );
            }}
            onError={() => setUploadError("อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่")}
            onQueuesStart={() => onUploadingChange(true)}
            onQueuesEnd={() => onUploadingChange(false)}
          >
            {({ open, isLoading }) => (
              <button
                type="button"
                className="dropzone"
                onClick={() => open()}
                disabled={disabled || isLoading}
              >
                <span aria-hidden="true">+</span>
                <span>
                  {isLoading ? "กำลังเตรียมการอัปโหลด…" : "เพิ่มรูปภาพ"}
                </span>

                <small>JPG, PNG, WebP · ไม่เกิน 4 MB</small>
              </button>
            )}
          </CldUploadWidget>
        )}
      </div>

      <p className="field-hint image-upload-hint">
        เลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 4 MB ต่อรูป · สูงสุด {maxFiles} รูป
      </p>
      {uploadError && <p className="field-error" role="alert">{uploadError}</p>}
    </div>
  );
}
