export const CONTENT_POSTS_BLOB_PATH_SEGMENT = "content-posts";
export const CONTENT_UPLOADED_VIDEO_PATH_SEGMENT = "videos";
export const CONTENT_GENERATED_VIDEO_PATH_SEGMENT = "generated-content-videos";
export const CONTENT_PREVIEW_VIDEO_PATH_SEGMENT = "preview-videos";
export const CONTENT_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

export type ContentPostVideoPreviewResponse = {
  contentType: string;
  durationSec: number | null;
  pathname: string;
  sourceVideoUrl: string;
  url: string;
};
