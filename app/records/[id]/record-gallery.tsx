"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryImage = {
  id: number;
  url: string;
  caption: string | null;
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

export default function RecordGallery({
  images,
  alt,
}: {
  images: GalleryImage[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const total = images.length;
  const current = images[index];
  const multiple = total > 1;
  const altOf = (i: number) =>
    images[i].caption || `${alt} รูปที่ ${i + 1} จาก ${total}`;

  const go = useCallback(
    (step: number) => setIndex((i) => (i + step + total) % total),
    [total],
  );

  // lightbox: ล็อกการเลื่อนหน้า + คีย์ลัด
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (multiple && e.key === "ArrowLeft") go(-1);
      if (multiple && e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, multiple, go]);

  const onTouchEnd = (x: number) => {
    if (touchX.current === null || !multiple) return;
    const dx = x - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="rd-gallery">
      <div
        className="rd-stage"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
        onKeyDown={(e) => {
          if (!multiple) return;
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        <button
          type="button"
          className="rd-stage-btn"
          onClick={() => setOpen(true)}
          aria-label="ขยายรูปภาพ"
        >
          <Image
            key={current.id}
            src={current.url}
            alt={altOf(index)}
            fill
            sizes="(max-width: 1024px) 100vw, 780px"
            priority={index === 0}
            unoptimized
            className="rd-img"
          />
        </button>

        {multiple && (
          <>
            <button
              type="button"
              className="rd-arrow rd-prev"
              onClick={() => go(-1)}
              aria-label="รูปก่อนหน้า"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="rd-arrow rd-next"
              onClick={() => go(1)}
              aria-label="รูปถัดไป"
            >
              <Chevron dir="right" />
            </button>
          </>
        )}

        <span className="rd-counter" aria-live="polite">
          รูปที่ {index + 1} / {total} · คลิกเพื่อขยาย
        </span>
      </div>

      {current.caption && (
        <p className="rd-caption">
          รูปที่ {index + 1}: {current.caption}
        </p>
      )}

      {multiple && (
        <ul className="rd-thumbs" aria-label="รูปภาพทั้งหมด">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                className={`rd-thumb ${i === index ? "is-active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`ดูรูปที่ ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="96px"
                  unoptimized
                  className="rd-img"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          className="rd-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="ดูรูปขยาย"
          onClick={() => setOpen(false)}
        >
          <button
            ref={closeRef}
            type="button"
            className="rd-lb-close"
            onClick={() => setOpen(false)}
            aria-label="ปิด"
          >
            ×
          </button>

          <div className="rd-lb-frame" onClick={(e) => e.stopPropagation()}>
            <Image
              key={current.id}
              src={current.url}
              alt={altOf(index)}
              fill
              sizes="100vw"
              unoptimized
              className="rd-img-contain"
            />
          </div>

          {multiple && (
            <>
              <button
                type="button"
                className="rd-arrow rd-prev rd-lb-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="รูปก่อนหน้า"
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                className="rd-arrow rd-next rd-lb-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="รูปถัดไป"
              >
                <Chevron dir="right" />
              </button>
            </>
          )}

          <p className="rd-lb-caption" onClick={(e) => e.stopPropagation()}>
            {index + 1} / {total}
            {current.caption ? ` · ${current.caption}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
