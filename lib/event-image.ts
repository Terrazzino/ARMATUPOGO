import { validateImageFile, type SupportedImageMetadata } from "@/lib/image-validation";
import {
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_MAX_HEIGHT,
  EVENT_IMAGE_MAX_PIXELS,
  EVENT_IMAGE_MAX_WIDTH,
  EVENT_IMAGE_MIN_HEIGHT,
  EVENT_IMAGE_MIN_WIDTH,
} from "@/lib/event-image-constraints";

export const EVENT_IMAGE_BUCKET = "event-images";

export async function validateEventImage(file: File): Promise<SupportedImageMetadata> {
  return validateImageFile(file, {
    maxBytes: EVENT_IMAGE_MAX_BYTES,
    maxSizeLabel: "5 MiB",
    minWidth: EVENT_IMAGE_MIN_WIDTH,
    minHeight: EVENT_IMAGE_MIN_HEIGHT,
    maxWidth: EVENT_IMAGE_MAX_WIDTH,
    maxHeight: EVENT_IMAGE_MAX_HEIGHT,
    maxPixels: EVENT_IMAGE_MAX_PIXELS,
    dimensionsLabel: "entre 400×500 y 4000×5000 píxeles (máximo 20 MP)",
  });
}

export function buildEventImagePath(userId: string, eventId: string, extension: SupportedImageMetadata["extension"]) {
  return `${userId}/events/${eventId}/${crypto.randomUUID()}.${extension}`;
}

export function getOwnedEventImagePath(url: string | null | undefined, userId: string, eventId: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${EVENT_IMAGE_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    const segments = path.split("/");
    if (segments.length !== 4 || segments[0] !== userId || segments[1] !== "events" || segments[2] !== eventId || !/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(segments[3])) return null;
    return path;
  } catch {
    return null;
  }
}
