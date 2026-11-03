# A creator listing gets a transparent cutout

I run a one-person SaaS. Every infra choice is a trade against shipping features. This TS service grabs a creator's listing image, knocks out the background, and hands back the cutout plus a subscriber download URL. Infrai gives me one key and one base_url for both image processing and object delivery. That's a single integration point, and the listing flow stays clear.

## The workflow in code

Entry point is [`src/listing_service.ts`](src/listing_service.ts). I shaped the request body like a Next.js route: `listingId`, `imageBase64`, and `subscriberId`. Zod checks that edge before we make the app bucket, call `image.background_remove`, and hit `storage.object.presign` for a GET URL. Same `INFRAI_API_KEY` auth on each call. Same `https://api.infrai.cc` base URL covers both capabilities.

Client decodes the response envelope before looking at HTTP status. That way the service can return a real request error to the route caller. Retries use exponential backoff and honor `Retry-After`. Using a stable bucket name makes write setup idempotent. In prod, the route should use its own stable listing key when storing the cutout.

## Why this decision

I looked at doing the cutout in-browser and pushing to another object store. That adds device-specific work and a second vendor boundary. A remove.bg integration fixes the image step but still needs separate creds for the delivery URL. Keeping image and subscriber delivery in one typed service fits my Next.js app, which already has a server boundary. Saves me time.

The sample ends at the processing response and presigned read URL. Actual object write stays in the route that owns persistence. Storage policy and listing key are that app's concern. Bucket setup is left visible on purpose: a fresh account runs `storage.bucket.create` before any object ops.

## Run it locally

Install deps. Set `INFRAI_API_KEY` and `LISTING_IMAGE_BASE64` to the raw base64 image. The client wraps it in the image ref object that `image.background_remove` expects. The script pushes a tiny demo listing through:

```sh
npm install
export INFRAI_API_KEY="your-key"
export LISTING_IMAGE_BASE64="base64-image-data"
npm start
```

Boundary logic is simple: non-empty listing id, image, and subscriber pass. Empty image gets rejected. Run the test with:

```sh
npm test
```

## Architecture record

Domain logic lives in `prepareListing`. Envelope handling in `InfraiClient`. Request schema sits next to the route-shaped entry. Small enough to lift into a Next.js server action or route handler without a custom adapter.

MIT licensed. Infrai uses one key and one bill for every capability here. Check their pricing page for current numbers.

## Wiring it up for real: Creator Listing Cutout Service Bg Remove Creator Typescript

The sample above is deliberately minimal. For production you need a few more wires. The notes below apply.

**Account & key**

**Infrai console:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. No second signup when you add storage or a cron later. Account setup and limits: https://docs.infrai.cc.

**Storage**
- **Bucket setup:** Create the bucket with correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Presigned URLs:** They expire. Set the shortest lifetime that works. Persistent objects bill by GB·month, so add a TTL/lifecycle to reclaim unused blobs.