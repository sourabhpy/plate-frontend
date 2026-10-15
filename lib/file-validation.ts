export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const VIDEO_EXTENSIONS = [
  "mp4",
  "m4v",
  "mov",
  "avi",
  "mkv",
  "wmv",
  "flv",
  "3gp",
  "3g2",
  "ogv",
  "ts",
  "mts",
  "m2ts",
  "vob",
  "divx",
  "mpg",
  "mpeg",
  "asf",
  "rm",
  "rmvb",
];

export function isVideoFile(file: File | { name?: string; type?: string }): boolean {
  if (!file) return false;
  const mimeType = (file.type || "").toLowerCase();
  if (mimeType.startsWith("video/")) {
    return true;
  }
  const name = (file.name || "").toLowerCase();
  const ext = name.split(".").pop() || "";
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return true;
  }
  if (ext === "webm" && mimeType.includes("video")) {
    return true;
  }
  return false;
}

export function validateFileUpload(
  file: File,
  options?: {
    maxSize?: number;
    allowVideo?: boolean;
    label?: string;
  }
): { isValid: boolean; error?: string } {
  const maxSize = options?.maxSize ?? MAX_MEDIA_FILE_SIZE;
  const allowVideo = options?.allowVideo ?? false;
  const label = options?.label ?? "File";

  if (!allowVideo && isVideoFile(file)) {
    return {
      isValid: false,
      error: "Video files are not allowed for upload.",
    };
  }

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `${label} size exceeds the ${maxMb}MB limit. Please upload a smaller file.`,
    };
  }

  return { isValid: true };
}
