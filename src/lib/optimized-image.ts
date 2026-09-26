import { getImageProps } from "next/image";

/** Hosts the image optimizer is configured for (next.config.ts `images.remotePatterns`). */
const OPTIMIZABLE = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//;

export type ImageSource = { src: string; srcSet?: string; sizes?: string };

/**
 * A photograph through the image optimizer, sized to the screen: a phone gets a
 * few hundred KB of WebP instead of the multi-MB original. Other hosts get the
 * original. Without the photo's dimensions the widths come from the device
 * sizes, as for an image that fills its box.
 */
export function optimizedSource(url: string, sizes: string, dims?: { width: number; height: number }): ImageSource {
  if (!OPTIMIZABLE.test(url)) return { src: url };
  const sized = dims && dims.width > 0 && dims.height > 0;
  const { props } = sized
    ? getImageProps({ src: url, alt: "", width: dims.width, height: dims.height, sizes })
    : getImageProps({ src: url, alt: "", fill: true, sizes });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}
