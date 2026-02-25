import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "./firebase";

export type UploadFolder = "categories" | "items" | "branding";

function safeExtFromFile(file: File) {
  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
  return ext.replace(/[^a-z0-9]/g, "") || "jpg";
}

/**
 * Upload an image to Firebase Storage and return a public download URL.
 * Stored under: restaurants/{restaurantId}/{folder}/{generatedFileName}
 */
export async function uploadRestaurantImage(params: {
  restaurantId: string;
  folder: UploadFolder;
  file: File;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  if (!params.file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const MAX = 3 * 1024 * 1024; // 3MB
  if (params.file.size > MAX) {
    throw new Error("Image is too large (max 3MB)");
  }

  const ext = safeExtFromFile(params.file);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `restaurants/${params.restaurantId}/${params.folder}/${fileName}`;

  const storageRef = ref(storage, path);
  const bytes = await params.file.arrayBuffer();
  await uploadBytes(storageRef, new Uint8Array(bytes), {
    contentType: params.file.type,
  });

  return await getDownloadURL(storageRef);
}
