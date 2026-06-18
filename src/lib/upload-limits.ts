/**
 * Upload validation limits — imported by both the API route (enforcement)
 * and VideoComposer (pre-flight UX so users get instant feedback).
 * Changing a value here updates both layers simultaneously.
 */
export const UPLOAD_LIMITS = {
  /** 10 GiB — matches the copy in the drop-zone UI */
  VIDEO_MAX_BYTES: 10 * 1024 * 1024 * 1024,

  TITLE_MAX: 100,
  DESCRIPTION_MAX: 5_000,

  /** 5 MiB for custom thumbnails */
  THUMB_MAX_BYTES: 5 * 1024 * 1024,

  ALLOWED_VIDEO_TYPES: [
    "video/mp4",
    "video/quicktime",   // .mov
    "video/x-msvideo",   // .avi
    "video/x-matroska",  // .mkv
    "video/webm",
    "video/mpeg",
    "video/ogg",
    "video/3gpp",
    "video/3gpp2",
    "video/x-ms-wmv",
    "video/x-flv",
  ] as const,

  ALLOWED_THUMB_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,

  /** Max upload initiations per rolling 60-minute window per user */
  RATE_LIMIT_PER_HOUR: 5,

  /** Max upload initiations per UTC calendar day per user */
  DAILY_QUOTA: 20,
} as const;

export type AllowedVideoType = (typeof UPLOAD_LIMITS.ALLOWED_VIDEO_TYPES)[number];
export type AllowedThumbType = (typeof UPLOAD_LIMITS.ALLOWED_THUMB_TYPES)[number];
