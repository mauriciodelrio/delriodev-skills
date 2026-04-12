---
name: file-handling
description: >
  File handling in Node.js backend. Covers multipart uploads with
  multer, large file streaming, file validation (type,
  size), integration with presigned URLs (S3), processing pipelines,
  and secure patterns for upload/download.
---

# 📁 File Handling — File Management

## Principle

> **Never trust the file uploaded by the user.**
> Validate type, size, and content. Never execute or interpret
> uploaded files. Prefer presigned URLs for large files.

---

## Decision: Direct Upload or Presigned URL?

```
DIRECT UPLOAD (through the backend):
  ✅ Small files (< 10 MB)
  ✅ You need to process the file before saving
  ✅ Immediate server-side validation
  ❌ The backend is a bottleneck (CPU, memory, bandwidth)

PRESIGNED URL (direct to S3):
  ✅ Large files (> 10 MB)
  ✅ Many concurrent uploads
  ✅ Reduce load on the backend
  ❌ Less control over validation before upload
  → Backend generates signed URL → client uploads directly to S3
  → Validate post-upload with Lambda trigger or webhook
```

---

## Multer — Direct Upload

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Storage configuration
const storage = multer.diskStorage({
  destination: './uploads/temp',
  filename: (req, file, cb) => {
    // Unique name to avoid collisions
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// For small files: store in memory (Buffer)
const memoryStorage = multer.memoryStorage();

// Configuration with validation
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5 MB max
    files: 5,                    // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new AppError(400, 'INVALID_FILE_TYPE', `Type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

// Express routes
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.post('/gallery', authenticate, upload.array('images', 5), uploadGallery);
router.post('/document', authenticate, upload.fields([
  { name: 'contract', maxCount: 1 },
  { name: 'attachments', maxCount: 3 },
]), uploadDocument);
```

### Controller

```typescript
async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, 'NO_FILE', 'No file was uploaded');
  }

  // Validate actual content (don't trust just the header mimetype)
  const fileType = await detectFileType(req.file.path);
  if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
    await fs.unlink(req.file.path); // Clean up invalid file
    throw new AppError(400, 'INVALID_FILE_TYPE', 'The file is not a valid image');
  }

  // Process (resize, optimize) and upload to permanent storage
  const url = await imageService.processAndUpload(req.file.path, {
    width: 200,
    height: 200,
    quality: 80,
  });

  // Clean up temp
  await fs.unlink(req.file.path);

  res.json({ data: { avatarUrl: url } });
}
```

---

## NestJS — File Upload

```typescript
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/temp',
      filename: (req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('Only images are allowed'), false);
        return;
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.filesService.processAvatar(file, user.id);
  }
}
```

---

## Presigned URL — Direct Upload to S3

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Generate URL for upload
async function generateUploadUrl(params: {
  fileName: string;
  contentType: string;
  maxSize: number;
  userId: string;
}): Promise<{ uploadUrl: string; key: string }> {
  // Validate content type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(params.contentType)) {
    throw new AppError(400, 'INVALID_TYPE', 'File type not allowed');
  }

  const key = `uploads/${params.userId}/${randomUUID()}/${params.fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: params.contentType,
    ContentLength: params.maxSize,
    Metadata: {
      'uploaded-by': params.userId,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

  return { uploadUrl, key };
}

// Generate URL for download
async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

// Endpoint
router.post('/files/upload-url', authenticate, async (req, res) => {
  const { fileName, contentType } = req.body;
  const result = await generateUploadUrl({
    fileName,
    contentType,
    maxSize: 10 * 1024 * 1024, // 10 MB
    userId: req.user.id,
  });
  res.json({ data: result });
});
```

---

## Streaming — Large Files

```typescript
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

// Download with streaming (don't load everything into memory)
async function downloadFile(req: Request, res: Response) {
  const file = await filesRepo.findById(req.params.id);
  if (!file) throw new NotFoundError('File', req.params.id);

  // Headers
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
  res.setHeader('Content-Length', file.size);

  // Stream from S3 or disk
  const stream = createReadStream(file.path);
  await pipeline(stream, res);
}

// Upload with streaming to S3 (without saving to disk)
import { Upload } from '@aws-sdk/lib-storage';

async function streamToS3(readableStream: Readable, key: string, contentType: string) {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: readableStream,
      ContentType: contentType,
    },
  });

  upload.on('httpUploadProgress', (progress) => {
    logger.debug({ key, loaded: progress.loaded, total: progress.total }, 'Upload progress');
  });

  return upload.done();
}
```

---

## File Validation

```typescript
// NEVER trust just the extension or the header mimetype
// Verify the file's magic bytes

import { fileTypeFromBuffer } from 'file-type';

async function validateFileContent(buffer: Buffer): Promise<string> {
  const type = await fileTypeFromBuffer(buffer);
  
  if (!type) {
    throw new AppError(400, 'UNKNOWN_TYPE', 'Could not determine the file type');
  }

  const allowed: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
  };

  if (!allowed[type.mime]) {
    throw new AppError(400, 'INVALID_TYPE', `Type not allowed: ${type.mime}`);
  }

  return type.mime;
}

// For images: verify it is a valid image
import sharp from 'sharp';

async function validateImage(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image');
    }
    // Limit dimensions
    if (metadata.width > 10000 || metadata.height > 10000) {
      throw new AppError(400, 'IMAGE_TOO_LARGE', 'Image exceeds maximum dimensions');
    }
    return metadata;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'INVALID_IMAGE', 'The file is not a valid image');
  }
}
```

---

## Cleanup

```typescript
// Clean up temporary files
// 1. After successful processing
await fs.unlink(tempFilePath);

// 2. In case of error (finally block or middleware)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Clean up uploaded files if there was an error
  if (req.file) {
    fs.unlink(req.file.path).catch(() => {});
  }
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    files.forEach((f) => fs.unlink(f.path).catch(() => {}));
  }
  next(err);
});

// 3. Cron job to clean up old temps
// Delete files in /uploads/temp/ older than 1 hour
```

---

## Anti-patterns

```
❌ Trusting file.mimetype from the header → verify magic bytes
❌ Saving with original name → path traversal (../../etc/passwd)
❌ No size limit → 10 GB upload = denial of service
❌ Loading entire file into memory → use streams for large files
❌ Files on the server filesystem → doesn't scale, lost on deploy
❌ Presigned URL without short expiration → shareable URL = indefinite access
❌ No post-upload validation (presigned) → malicious files in S3
❌ Serving uploaded files on the same domain → XSS if HTML/SVG
❌ Not cleaning up temporary files → disk fills up
❌ Upload endpoint without auth → upload abuse
```
