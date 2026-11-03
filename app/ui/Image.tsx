import { color, radius } from "./theme";

const sizes = { thumbnail: 48, small: 120, medium: 240 };

/**
 * A picture: a stored file's URL, a `data:` URL, or a file in public/. `size` is a square box (`thumbnail` fits a list
 * row) and the picture is cropped to fill it; `full` takes the width it's given at its own shape. `alt` says what it
 * shows, or is empty when it's decoration.
 *
 * @import import { Image } from '../../ui/Image'
 */
export function Image({
  src,
  alt,
  size = "full",
}: {
  src: string;
  alt: string;
  size?: keyof typeof sizes | "full";
}) {
  const box = size === "full" ? undefined : sizes[size];

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        display: "block",
        width: box ?? "100%",
        height: box ?? "auto",
        objectFit: box ? "cover" : undefined,
        borderRadius: radius,
        background: color.subtle,
      }}
    />
  );
}
