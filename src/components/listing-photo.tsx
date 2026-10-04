"use client";

import { ImageOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

// A photo that could not load (deleted file, bad link) shows a plain note instead of a broken image.
export function ListingPhoto({ alt, onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="listing-photo-missing">
        <ImageOff size={20} aria-hidden="true" />
        Foto no disponible
      </span>
    );
  }
  return (
    <Image
      {...props}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
