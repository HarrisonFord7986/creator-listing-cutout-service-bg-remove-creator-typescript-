import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const listingRequest = z.object({
  listingId: z.string().min(1),
  imageBase64: z.string().min(1),
  subscriberId: z.string().min(1)
});
export type ListingRequest = z.infer<typeof listingRequest>;
const capabilityUsed = "image.background_remove";

export async function prepareListing(input: unknown, client = new InfraiClient(process.env.INFRAI_API_KEY ?? "")) {
  const request = listingRequest.parse(input);
  await client.createBucket("creator-listings");
  const cutout = await client.removeBackground(request.imageBase64, "png");
  const download = await client.presignDownload("creator-listings", `${request.listingId}.png`);
  return { listingId: request.listingId, subscriberId: request.subscriberId, cutout: cutout.image, downloadUrl: download.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const image = process.env.LISTING_IMAGE_BASE64;
  if (!image || !process.env.INFRAI_API_KEY) throw new Error("Set INFRAI_API_KEY and LISTING_IMAGE_BASE64");
  const result = await prepareListing({ listingId: "demo-shirt", imageBase64: image, subscriberId: "subscriber-1" });
  console.log(JSON.stringify(result, null, 2));
}
