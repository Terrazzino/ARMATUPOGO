import { createClient } from "@/lib/supabase/server";
import { ConfigurationError, ServiceUnavailableError } from "@/lib/errors";
import { EVENT_IMAGE_BUCKET, buildEventImagePath, validateEventImage } from "@/lib/event-image";

export async function uploadEventImage(userId: string, eventId: string, file: File) {
  const metadata = await validateEventImage(file);
  try {
    const supabase = await createClient();
    if (!supabase) throw new ConfigurationError("La carga de flyers no está configurada");
    const path = buildEventImagePath(userId, eventId, metadata.extension);
    const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).upload(path, file, {
      contentType: metadata.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.warn("[event-image-storage] upload failed", { statusCode: error.statusCode });
      throw new ServiceUnavailableError("No se pudo guardar el flyer. Intentá nuevamente.");
    }
    const { data } = supabase.storage.from(EVENT_IMAGE_BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  } catch (error) {
    if (error instanceof ConfigurationError || error instanceof ServiceUnavailableError) throw error;
    console.warn("[event-image-storage] upload unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    throw new ServiceUnavailableError("No se pudo guardar el flyer. Intentá nuevamente.");
  }
}

export async function removeEventImage(path: string) {
  try {
    const supabase = await createClient();
    if (!supabase) return false;
    const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).remove([path]);
    if (error) {
      console.warn("[event-image-storage] cleanup failed", { statusCode: error.statusCode });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[event-image-storage] cleanup unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    return false;
  }
}
