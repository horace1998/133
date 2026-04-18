import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../firebase";

function safeExt(file: File) {
  const raw = file.name.split(".").pop()?.toLowerCase() || "";
  if (!raw) return file.type.startsWith("video/") ? "mp4" : "jpg";
  return raw.replace(/[^a-z0-9]/g, "") || "bin";
}

export function uploadUserMedia(params: {
  file: File;
  uid: string;
  domain: "oracle" | "goal-cover";
  linkedDirectiveId?: string;
  onProgress?: (progress: number) => void;
}) {
  const { file, uid, domain, linkedDirectiveId, onProgress } = params;
  const ext = safeExt(file);
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const directiveSegment = linkedDirectiveId ? `${linkedDirectiveId}/` : "";
  const objectPath = `users/${uid}/${domain}/${directiveSegment}${fileName}`;
  const objectRef = ref(storage, objectPath);

  const uploadTask = uploadBytesResumable(objectRef, file, {
    contentType: file.type || undefined,
    customMetadata: linkedDirectiveId ? { linkedDirectiveId } : undefined,
  });

  return new Promise<{ downloadURL: string; objectPath: string }>((resolve, reject) => {
    let watchDog: NodeJS.Timeout | null = null;
    let lastBytes = -1;

    const resetWatchDog = () => {
      if (watchDog) clearTimeout(watchDog);
      watchDog = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error("Upload timed out. Storage bucket may not be enabled or connection dropped."));
      }, 8000); // 8 seconds of no progress = timeout
    };

    resetWatchDog();

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.bytesTransferred > lastBytes) {
          lastBytes = snapshot.bytesTransferred;
          resetWatchDog();
        }
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        if (watchDog) clearTimeout(watchDog);
        reject(error);
      },
      async () => {
        if (watchDog) clearTimeout(watchDog);
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadURL, objectPath });
        } catch (downloadErr) {
          reject(downloadErr);
        }
      }
    );
  });
}
