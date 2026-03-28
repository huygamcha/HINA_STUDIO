# Feature Name: Fix Cloudflare R2 Upload Error
---
## 1. Objective
- Resolve the R2 upload failure (likely Access Denied or Endpoint mismatch) when uploading or updating images.

## 2. Requirements
- Ensure `uploadImageToR2` successfully puts objects into the R2 bucket.
- Verify `forcePathStyle` setting for Cloudflare R2 compatibility.
- Ensure environment variables are correctly loaded and used.

## 3. Context (AI Knowledge)
- Prisma Model(s): `Album`, `Image` (if exists)
- Relevant Files: `app/utils/s3.server.ts`, `.env`
- Error reported: General upload failure (likely Access Denied).

## 4. Acceptance Criteria
- [ ] Successful upload of images via `uploadImageToR2`.
- [ ] Correct URL returned using `R2_PUBLIC_URL`.
- [ ] Deletion works as expected.

## 5. Evaluation Plan
- Functional: Manually test image upload in the Admin UI (e.g., edit album).
- Aesthetics: N/A (Backend fix).
