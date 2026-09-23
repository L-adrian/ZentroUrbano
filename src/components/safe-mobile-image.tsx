/* eslint-disable @next/next/no-img-element */

type SafeMobileImageProps = {
  src?: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
};

export function SafeMobileImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}: SafeMobileImageProps) {
  if (!src) {
    return (
      <div
        aria-label={alt}
        className={`bg-[#ece8df] ${className ?? ""}`}
        style={{ aspectRatio: `${width} / ${height}` }}
      />
    );
  }

  return (
    <img
      src={toSafeMobileImageUrl(src, width)}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}

export function toSafeMobileImageUrl(src: string, width = 720) {
  try {
    const url = new URL(src);

    if (url.hostname.includes("images.unsplash.com")) {
      url.searchParams.delete("auto");
      url.searchParams.delete("ixlib");
      url.searchParams.set("fm", "jpg");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", "68");
      url.searchParams.set("dpr", "1");
    }

    return url.toString();
  } catch {
    return src;
  }
}
