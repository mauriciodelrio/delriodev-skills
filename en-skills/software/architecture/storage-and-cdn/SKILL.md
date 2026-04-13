---
name: storage-and-cdn
description: >
  Use this skill when you need to decide on file storage, media, and static
  content distribution. Covers S3, CloudFront, image/video processing,
  upload strategies, and asset management.
---

# Storage & CDN — Files, Media, and Assets

## Agent workflow

1. Identify what type of content needs to be stored.
2. Walk through the decision tree (section 1) with the user.
3. Configure S3 + CDN based on the chosen option (sections 2-3).
4. Evaluate whether image processing is needed (section 4).
5. Validate against the available budget (section 6).

## 1. Decision tree

```
What do you need to store?
│
├── User-uploaded files (avatars, documents, media)
│   └── S3 + presigned URLs for upload/download
│       ├── Images that need resize/optimization?
│       │   ├── YES → S3 + CloudFront + Lambda@Edge (or Imgproxy)
│       │   │         Alternative: Cloudinary / Imgix (managed, easier)
│       │   └── NO → S3 + CloudFront directly
│       └── Videos?
│           ├── YES → S3 + MediaConvert for transcoding
│           │         Alternative: Mux / Cloudflare Stream (managed)
│           └── NO → Standard S3
│
├── Static frontend assets (JS, CSS, fonts, icons)
│   └── Deploy on Vercel?
│       ├── YES → Vercel handles it automatically (CDN included)
│       └── NO → S3 + CloudFront
│
├── Backups / rarely accessed files
│   └── S3 Glacier or S3 Infrequent Access
│
└── Temporary processing files
    └── S3 with lifecycle policy (auto-delete in X days)
```

## 2. Amazon S3

### Base configuration

```hcl
# Terraform — S3 bucket for user uploads
resource "aws_s3_bucket" "uploads" {
  bucket = "myapp-uploads-${var.environment}"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"  # Protection against accidental deletion
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
  # NEVER make a bucket public — use presigned URLs or CloudFront
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "move-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"  # Files > 90 days → cheaper
    }

    transition {
      days          = 365
      storage_class = "GLACIER"  # Files > 1 year → deep archive
    }
  }

  rule {
    id     = "delete-temp"
    status = "Enabled"
    filter { prefix = "temp/" }

    expiration {
      days = 7  # Delete temporary files after 7 days
    }
  }
}
```

### Storage classes

| Class | Cost/GB/month | Use |
|-------|--------------|-----|
| S3 Standard | $0.023 | frequent access |
| S3 Intelligent-Tier | $0.023 | auto-moves to IA if not accessed |
| S3 Standard-IA | $0.0125 | infrequent access (min 30 days) |
| S3 Glacier Instant | $0.004 | archives, access in ms |
| S3 Glacier Flexible | $0.0036 | archives, access in min-hours |
| S3 Glacier Deep | $0.00099 | archives, access in hours |

Use lifecycle policies to automatically move between classes based on file age.

### Secure upload pattern

The frontend NEVER uploads files directly to the backend. Use presigned URLs for direct upload to S3:

1. Frontend requests an upload URL from the backend (presigned PUT)
2. Backend generates presigned URL with SDK (expires in 5–15 min)
3. Frontend uploads directly to S3 with that URL
4. S3 event trigger notifies the backend when the file arrives
5. Backend processes (validate type, size, virus scan if applicable)

```typescript
// Backend — generate presigned URL
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function getUploadUrl(userId: string, filename: string) {
  const key = `uploads/${userId}/${crypto.randomUUID()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.UPLOADS_BUCKET,
    Key: key,
    ContentType: 'application/octet-stream',
    Metadata: { 'uploaded-by': userId },
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return { url, key };
}
```

## 3. Amazon CloudFront (CDN)

**When to use:**
- Images/media served to users (reduces global latency)
- Static assets (JS, CSS) if not using Vercel
- Frequent file downloads
- APIs with cacheable responses (GET requests)
- DDoS protection (CloudFront includes AWS Shield Standard for free)

**When NOT to use:**
- Files only accessed by the backend (internal processing)
- Deploy on Vercel (already has CDN)
- Very few files and few users (unnecessary overhead)

```hcl
# Terraform — CloudFront distribution for S3
resource "aws_cloudfront_distribution" "media" {
  enabled             = true
  default_root_object = ""
  price_class         = "PriceClass_100"  # US/EU only (cheaper)
  # PriceClass_200 = US/EU/Asia
  # PriceClass_All = Global

  origin {
    domain_name              = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_id                = "s3-uploads"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-uploads"
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    # Managed-CachingOptimized policy
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # Or use ACM certificate for custom domain
  }
}

# Cost: ~$0.085/GB transferred (US/EU) — first TB more expensive
# Free tier: 1 TB transfer/month (12 months)
```

## 4. Image processing

### Decision

```
How many images do you process?
│
├── Few (< 10K/month) and simple operations (resize, crop)
│   └── Sharp in Lambda (S3 trigger or on-demand)
│       Cost: ~free with Lambda free tier
│
├── Moderate (10K–100K/month)
│   └── Imgproxy (self-hosted on ECS) or Cloudinary free/plus
│
└── High volume or complex transformations
    └── Cloudinary ($99+/month) or Imgix ($100+/month)
        Benefit: CDN included, on-the-fly resize, auto-format
```

```typescript
// Lambda — process image on upload (Sharp)
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export async function handler(event: S3Event) {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // Download original
  const original = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = Buffer.from(await original.Body!.transformToByteArray());

  // Generate thumbnails
  const sizes = [
    { suffix: 'thumb', width: 150, height: 150 },
    { suffix: 'medium', width: 600, height: 600 },
    { suffix: 'large', width: 1200, height: 1200 },
  ];

  for (const size of sizes) {
    const resized = await sharp(buffer)
      .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const newKey = key.replace(/\.[^.]+$/, `-${size.suffix}.webp`);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: newKey,
      Body: resized,
      ContentType: 'image/webp',
    }));
  }
}
```

## 5. File organization in S3

```
Recommended key structure:

uploads/
  {userId}/
    {uuid}-{filename}          ← Original files

processed/
  {userId}/
    {uuid}-thumb.webp          ← Generated thumbnails
    {uuid}-medium.webp
    {uuid}-large.webp

exports/
  {date}/
    report-{id}.csv            ← Temporary exports

temp/
  {uuid}                       ← Temporary files (lifecycle: 7 days)

backups/
  db/
    {date}/
      dump.sql.gz              ← DB backups
```

## 6. Rules by budget

**$0–$50/month:**
- S3 Standard (5 GB free tier)
- CloudFront (1 TB free tier)
- Sharp in Lambda for resize
- Vercel for frontend assets

**$50–$300/month:**
- S3 with lifecycle policies
- CloudFront PriceClass_100
- Cloudinary free tier (25 credits/month)

**$300+/month:**
- S3 + full CloudFront
- Cloudinary/Imgix for heavy media
- S3 Intelligent-Tiering automatic

## 7. Gotchas

- Public S3 bucket — ALWAYS block public access, use presigned URLs or CloudFront.
- Uploading files through the backend wastes memory/CPU — use presigned URLs.
- Storing files in the DB (BLOB) — use S3.
- Not using CDN for static assets served to global users.
- A single bucket for everything (uploads, backups, temp, exports) hinders granular policies.
- Not configuring lifecycle policies — storage grows uncontrolled.
- Serving original images without optimization (5 MB per image).
- Predictable S3 URLs without authentication — path traversal risk.
- Not enabling encryption at rest or versioning on buckets with user data.
