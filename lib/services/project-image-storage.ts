import { createClient } from "@/lib/supabase/server";
import { ConfigurationError, ServiceUnavailableError } from "@/lib/errors";
import {
  PROJECT_IMAGE_BUCKET,
  buildProjectImagePath,
  validateProjectImage,
} from "@/lib/project-image";

export async function uploadProjectImage(userId: string, projectId: string, file: File) {
  const metadata = await validateProjectImage(file);
  try {
    const supabase = await createClient();
    if (!supabase) {
      throw new ConfigurationError("La carga de imágenes no está configurada");
    }

    const path = buildProjectImagePath(userId, projectId, metadata.extension);
    const { error } = await supabase.storage.from(PROJECT_IMAGE_BUCKET).upload(path, file, {
      contentType: metadata.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      console.warn("[project-image-storage] upload failed", { statusCode: error.statusCode });
      throw new ServiceUnavailableError("No se pudo guardar la imagen. Intentá nuevamente.");
    }

    const { data } = supabase.storage.from(PROJECT_IMAGE_BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  } catch (error) {
    if (error instanceof ConfigurationError || error instanceof ServiceUnavailableError) throw error;
    console.warn("[project-image-storage] upload unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    throw new ServiceUnavailableError("No se pudo guardar la imagen. Intentá nuevamente.");
  }
}

export async function removeProjectImage(path: string) {
  try {
    const supabase = await createClient();
    if (!supabase) return false;
    const { error } = await supabase.storage.from(PROJECT_IMAGE_BUCKET).remove([path]);
    if (error) {
      console.warn("[project-image-storage] cleanup failed", { statusCode: error.statusCode });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[project-image-storage] cleanup unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}
