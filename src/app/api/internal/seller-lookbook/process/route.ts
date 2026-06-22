import {
  claimNextSellerJob,
  completeSellerJob,
  failSellerJob,
} from "@/lib/seller-jobs";
import {
  awardStarModelRoyalty,
  resolveSellerStarImage,
} from "@/lib/seller-stars";
import { recordSellerLookbookGeneration } from "@/lib/seller-workspace";
import {
  generateStarLookbook,
  type StarLookbookAspectRatio,
} from "@/lib/star-lookbook-service";
import { generateStarLookbookVideo } from "@/lib/star-lookbook-video";

export const runtime = "nodejs";
export const maxDuration = 300;

const ASPECT_RATIOS: StarLookbookAspectRatio[] = [
  "auto",
  "1:1",
  "3:4",
  "4:5",
  "2:3",
  "9:16",
];

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseAspect(value: string | null | undefined) {
  const normalized = value?.trim();
  return ASPECT_RATIOS.includes(normalized as StarLookbookAspectRatio)
    ? (normalized as StarLookbookAspectRatio)
    : undefined;
}

// Hit by the Railway lookbook worker. Claims one queued job and runs the heavy
// generation here (off the user-facing Vercel request).
export async function POST(request: Request) {
  const token = process.env.SELLER_JOB_WORKER_TOKEN?.trim();

  if (!token) {
    return jsonError("SELLER_JOB_WORKER_TOKEN is not configured.", 500);
  }

  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return jsonError("Unauthorized.", 401);
  }

  const job = await claimNextSellerJob();

  if (!job) {
    return Response.json({ processed: 0 });
  }

  try {
    if (job.type === "video") {
      const imageUrl = job.input.imageUrl?.trim() ?? "";
      if (!imageUrl) {
        throw new Error("imageUrl missing for video job.");
      }
      const video = await generateStarLookbookVideo({
        imageUrl,
        referralCode: job.workspaceId,
        sceneBrief: job.input.sceneBrief ?? null,
      });
      await completeSellerJob(job.jobId, { videoUrl: video.url });
    } else {
      const starId = job.input.starId?.trim() ?? "";
      const modelImageUrl = await resolveSellerStarImage(
        starId,
        typeof job.input.starImageIndex === "number"
          ? job.input.starImageIndex
          : 0,
      );

      if (!modelImageUrl) {
        throw new Error("AI star is not available.");
      }

      const images = await generateStarLookbook({
        aspectRatio: parseAspect(job.input.aspectRatio),
        garmentImageUrls: job.input.garmentImageUrls ?? [],
        memberEmail: job.workspaceId,
        numImages:
          typeof job.input.numImages === "number" ? job.input.numImages : 1,
        referralCode: job.workspaceId,
        sceneBrief: job.input.sceneBrief ?? null,
        starAvatarUrl: modelImageUrl,
      });

      const imageUrls = images.map((image) => image.url);
      await completeSellerJob(job.jobId, { imageUrls });

      await recordSellerLookbookGeneration({
        imageUrls,
        starId,
        workspaceId: job.workspaceId,
      });
      await awardStarModelRoyalty({
        shots: imageUrls.length,
        sourceId: job.jobId,
        starId,
      });
    }

    return Response.json({ jobId: job.jobId, processed: 1, status: "done" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Job processing failed.";
    await failSellerJob(job, message);
    return Response.json({
      error: message,
      jobId: job.jobId,
      processed: 1,
      status: "failed",
    });
  }
}
