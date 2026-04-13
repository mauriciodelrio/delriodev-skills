---
name: file-handling
description: >
  Usa esta skill cuando implementes manejo de archivos en backend
  Node.js. Cubre multipart uploads con multer, streaming de archivos
  grandes, validación de archivos (tipo, tamaño), integración con
  presigned URLs (S3), pipelines de procesamiento, y patrones
  seguros para upload/download.
---

# File Handling — Manejo de Archivos

## Flujo de trabajo del agente

**1.** Decidir entre upload directo o presigned URL (sección 1).
**2.** Configurar multer o presigned URLs (secciones 2–5).
**3.** Implementar streaming para archivos grandes (sección 6).
**4.** Validar contenido real del archivo (sección 7).
**5.** Implementar cleanup de archivos temporales (sección 8).
**6.** Verificar contra la lista de gotchas (sección 9).

## 1. Decisión: ¿Upload Directo o Presigned URL?

**Upload directo (a través del backend):** archivos pequeños (< 10 MB), necesitas procesar el archivo antes de guardar, validación server-side inmediata. Desventaja: el backend es bottleneck (CPU, memoria, ancho de banda).

**Presigned URL (directo a S3):** archivos grandes (> 10 MB), muchos uploads concurrentes, reduce carga en el backend. Desventaja: menos control sobre validación previa al upload. Backend genera URL firmada → cliente sube directo a S3 → validar post-upload con Lambda trigger o webhook.

## 2. Multer — Upload Directo

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: './uploads/temp',
  filename: (req, file, cb) => {
    // Nombre único para evitar colisiones
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Para archivos pequeños: almacenar en memoria (Buffer)
const memoryStorage = multer.memoryStorage();

// Configuración con validación
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5 MB max
    files: 5,                    // Máximo 5 archivos por request
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new AppError(400, 'INVALID_FILE_TYPE', `Tipo no permitido: ${file.mimetype}`));
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
    throw new AppError(400, 'NO_FILE', 'No se envió ningún archivo');
  }

  // Validar contenido real (no confiar solo en mimetype del header)
  const fileType = await detectFileType(req.file.path);
  if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
    await fs.unlink(req.file.path); // Limpiar archivo inválido
    throw new AppError(400, 'INVALID_FILE_TYPE', 'El archivo no es una imagen válida');
  }

  // Procesar (resize, optimize) y subir a storage permanente
  const url = await imageService.processAndUpload(req.file.path, {
    width: 200,
    height: 200,
    quality: 80,
  });

  // Limpiar temp
  await fs.unlink(req.file.path);

  res.json({ data: { avatarUrl: url } });
}
```

## 3. NestJS — File Upload

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
        cb(new BadRequestException('Solo se permiten imágenes'), false);
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

## 4. Presigned URL — Upload Directo a S3

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Generar URL para upload
async function generateUploadUrl(params: {
  fileName: string;
  contentType: string;
  maxSize: number;
  userId: string;
}): Promise<{ uploadUrl: string; key: string }> {
  // Validar content type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(params.contentType)) {
    throw new AppError(400, 'INVALID_TYPE', 'Tipo de archivo no permitido');
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

// Generar URL para download
async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hora
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

## 5. Streaming — Archivos Grandes

```typescript
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

// Download con streaming (no cargar todo en memoria)
async function downloadFile(req: Request, res: Response) {
  const file = await filesRepo.findById(req.params.id);
  if (!file) throw new NotFoundError('File', req.params.id);

  // Headers
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
  res.setHeader('Content-Length', file.size);

  // Stream desde S3 o disco
  const stream = createReadStream(file.path);
  await pipeline(stream, res);
}

// Upload con streaming a S3 (sin guardar en disco)
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

## 6. Validación de Archivos

```typescript
// NUNCA confiar solo en la extensión o el mimetype del header
// Verificar los magic bytes del archivo

import { fileTypeFromBuffer } from 'file-type';

async function validateFileContent(buffer: Buffer): Promise<string> {
  const type = await fileTypeFromBuffer(buffer);
  
  if (!type) {
    throw new AppError(400, 'UNKNOWN_TYPE', 'No se pudo determinar el tipo de archivo');
  }

  const allowed: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'application/pdf': ['pdf'],
  };

  if (!allowed[type.mime]) {
    throw new AppError(400, 'INVALID_TYPE', `Tipo no permitido: ${type.mime}`);
  }

  return type.mime;
}

// Para imágenes: verificar que es una imagen válida
import sharp from 'sharp';

async function validateImage(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image');
    }
    // Limitar dimensiones
    if (metadata.width > 10000 || metadata.height > 10000) {
      throw new AppError(400, 'IMAGE_TOO_LARGE', 'Imagen excede dimensiones máximas');
    }
    return metadata;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'INVALID_IMAGE', 'El archivo no es una imagen válida');
  }
}
```

## 7. Cleanup

```typescript
// Limpiar archivos temporales
// 1. Después de procesar exitosamente
await fs.unlink(tempFilePath);

// 2. En caso de error (finally block o middleware)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Limpiar archivos subidos si hubo error
  if (req.file) {
    fs.unlink(req.file.path).catch(() => {});
  }
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    files.forEach((f) => fs.unlink(f.path).catch(() => {}));
  }
  next(err);
});

// 3. Cron job para limpiar temps viejos
// Eliminar archivos en /uploads/temp/ con más de 1 hora
```

## 8. Gotchas

- Confiar en `file.mimetype` del header — verificar magic bytes.
- Guardar con nombre original — path traversal (`../../etc/passwd`).
- Sin límite de tamaño — upload de 10 GB = denial of service.
- Cargar archivo completo en memoria — usar streams para archivos grandes.
- Archivos en el filesystem del server — no escala, se pierden en deploy.
- Presigned URL sin expiración corta — URL compartible = acceso indefinido.
- Sin validación post-upload (presigned) — archivos maliciosos en S3.
- Servir archivos subidos con el mismo dominio — XSS si es HTML/SVG.
- No limpiar archivos temporales — disco se llena.
- Upload endpoint sin auth — upload abuse.
