import { validateImageFile, type SupportedImageMetadata } from "@/lib/image-validation";
import {
  PROJECT_IMAGE_MAX_BYTES,
  PROJECT_IMAGE_MIN_DIMENSION,
  PROJECT_IMAGE_MAX_DIMENSION,
  PROJECT_IMAGE_MAX_PIXELS,
} from "@/lib/project-image-constraints";

export {
  PROJECT_IMAGE_MAX_BYTES,
  PROJECT_IMAGE_MIN_DIMENSION,
  PROJECT_IMAGE_MAX_DIMENSION,
  PROJECT_IMAGE_MAX_PIXELS,
  PROJECT_IMAGE_ACCEPT,
} from "@/lib/project-image-constraints";

export const PROJECT_IMAGE_BUCKET = "project-images";

export type ProjectImageMetadata = SupportedImageMetadata;

export async function validateProjectImage(file: File): Promise<ProjectImageMetadata> {
  return validateImageFile(file, {
    maxBytes: PROJECT_IMAGE_MAX_BYTES,
    maxSizeLabel: "5 MiB",
    minWidth: PROJECT_IMAGE_MIN_DIMENSION,
    minHeight: PROJECT_IMAGE_MIN_DIMENSION,
    maxWidth: PROJECT_IMAGE_MAX_DIMENSION,
    maxHeight: PROJECT_IMAGE_MAX_DIMENSION,
    maxPixels: PROJECT_IMAGE_MAX_PIXELS,
    dimensionsLabel: "entre 64×64 y 4096×4096 píxeles",
  });
}

export function buildProjectImagePath(userId: string, projectId: string, extension: ProjectImageMetadata["extension"]) {
  return `${userId}/projects/${projectId}/${crypto.randomUUID()}.${extension}`;
}

export function getOwnedProjectImagePath(url: string | null | undefined, userId: string, projectId: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${PROJECT_IMAGE_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const relativePath = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    const segments = relativePath.split("/");
    if (
      segments.length !== 4 ||
      segments[0] !== userId ||
      segments[1] !== "projects" ||
      segments[2] !== projectId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(segments[3])
    ) return null;
    return relativePath;
  } catch {
    return null;
  }
}
