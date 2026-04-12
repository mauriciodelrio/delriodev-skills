---
name: storage-and-cdn
description: >
  Árbol de decisiones para almacenamiento de archivos, media, y distribución
  de contenido estático. Cubre S3, CloudFront, procesamiento de imágenes/video,
  estrategias de upload, y gestión de assets. Incluye criterios por tipo de
  contenido, volumen, rendimiento y costo.
---

# 📦 Storage & CDN — Archivos, Media y Assets

## Árbol de Decisión

```
¿Qué necesitas almacenar?
│
├── Archivos subidos por usuarios (avatares, documentos, media)
│   └── S3 + presigned URLs para upload/download
│       ├── ¿Imágenes que necesitan resize/optimización?
│       │   ├── SÍ → S3 + CloudFront + Lambda@Edge (o Imgproxy)
│       │   │        Alternativa: Cloudinary / Imgix (managed, más fácil)
│       │   └── NO → S3 + CloudFront directamente
│       └── ¿Videos?
│           ├── SÍ → S3 + MediaConvert para transcoding
│           │        Alternativa: Mux / Cloudflare Stream (managed)
│           └── NO → S3 estándar
│
├── Assets estáticos del frontend (JS, CSS, fonts, icons)
│   └── ¿Deploy en Vercel?
│       ├── SÍ → Vercel lo maneja automáticamente (CDN incluido)
│       └── NO → S3 + CloudFront
│
├── Backups / archivos que rara vez se acceden
│   └── S3 Glacier o S3 Infrequent Access
│
└── Archivos temporales de procesamiento
    └── S3 con lifecycle policy (auto-delete en X días)
```

---

## Amazon S3

### Configuración Base

```hcl
# Terraform — S3 bucket para uploads de usuarios
resource "aws_s3_bucket" "uploads" {
  bucket = "myapp-uploads-${var.environment}"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"  # Protección contra borrado accidental
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
  # NUNCA hacer un bucket público — usar presigned URLs o CloudFront
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "move-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"  # Archivos > 90 días → más barato
    }

    transition {
      days          = 365
      storage_class = "GLACIER"  # Archivos > 1 año → archivo profundo
    }
  }

  rule {
    id     = "delete-temp"
    status = "Enabled"
    filter { prefix = "temp/" }

    expiration {
      days = 7  # Borrar archivos temporales después de 7 días
    }
  }
}
```

### Clases de Storage

```
S3 Standard:          $0.023/GB/mes — acceso frecuente
S3 Intelligent-Tier:  $0.023/GB/mes — auto-mueve a IA si no se accede
S3 Standard-IA:       $0.0125/GB/mes — acceso infrecuente (min 30 días)
S3 Glacier Instant:   $0.004/GB/mes — archivos, acceso en ms
S3 Glacier Flexible:  $0.0036/GB/mes — archivos, acceso en min-horas
S3 Glacier Deep:      $0.00099/GB/mes — archivos, acceso en horas

Regla: usar lifecycle policies para mover automáticamente
entre clases según edad del archivo.
```

### Patrón de Upload Seguro

```
El frontend NUNCA sube archivos directamente al backend.
Usar presigned URLs para upload directo a S3:

  1. Frontend pide al backend una URL de upload (presigned PUT)
  2. Backend genera presigned URL con SDK (expira en 5–15 min)
  3. Frontend sube directamente a S3 con esa URL
  4. S3 event trigger notifica al backend cuando el archivo llega
  5. Backend procesa (validar tipo, tamaño, virus scan si aplica)
```

```typescript
// Backend — generar presigned URL
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

---

## Amazon CloudFront (CDN)

### Cuándo Usar CDN

```
Cuándo SÍ:
  ✅ Imágenes/media servidas a usuarios (reduce latencia global)
  ✅ Assets estáticos (JS, CSS) si no usas Vercel
  ✅ Descargas de archivos frecuentes
  ✅ APIs con respuestas cacheables (GET requests)
  ✅ Protección DDoS (CloudFront incluye AWS Shield Standard gratis)

Cuándo NO:
  ❌ Archivos que solo accede el backend (procesamiento interno)
  ❌ Deploy en Vercel (ya tiene CDN)
  ❌ Muy pocos archivos y pocos usuarios (overhead innecesario)
```

```hcl
# Terraform — CloudFront distribution para S3
resource "aws_cloudfront_distribution" "media" {
  enabled             = true
  default_root_object = ""
  price_class         = "PriceClass_100"  # Solo US/EU (más barato)
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
    # O usar ACM certificate para dominio custom
  }
}

# Costo: ~$0.085/GB transferido (US/EU) — primer TB más caro
# Free tier: 1 TB de transferencia/mes (12 meses)
```

---

## Procesamiento de Imágenes

### Decisión

```
¿Cuántas imágenes procesan?
│
├── Pocas (< 10K/mes) y operaciones simples (resize, crop)
│   └── Sharp en Lambda (trigger S3 o on-demand)
│       Costo: ~gratis con Lambda free tier
│
├── Moderado (10K–100K/mes)
│   └── Imgproxy (self-hosted en ECS) o Cloudinary free/plus
│
└── Alto volumen o transformaciones complejas
    └── Cloudinary ($99+/mes) o Imgix ($100+/mes)
        Beneficio: CDN incluido, resize on-the-fly, auto-format
```

```typescript
// Lambda — procesar imagen on upload (Sharp)
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export async function handler(event: S3Event) {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // Descargar original
  const original = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = Buffer.from(await original.Body!.transformToByteArray());

  // Generar thumbnails
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

---

## Estrategia de Organización de Archivos en S3

```
Estructura de keys recomendada:

uploads/
  {userId}/
    {uuid}-{filename}          ← Archivos originales

processed/
  {userId}/
    {uuid}-thumb.webp          ← Thumbnails generados
    {uuid}-medium.webp
    {uuid}-large.webp

exports/
  {date}/
    report-{id}.csv            ← Exports temporales

temp/
  {uuid}                       ← Archivos temporales (lifecycle: 7 días)

backups/
  db/
    {date}/
      dump.sql.gz              ← Backups de DB
```

---

## Reglas por Presupuesto

```
$0–$50/mes:
  → S3 Standard (5 GB free tier)
  → CloudFront (1 TB free tier)
  → Sharp en Lambda para resize
  → Vercel para assets de frontend

$50–$300/mes:
  → S3 con lifecycle policies
  → CloudFront PriceClass_100
  → Cloudinary free tier (25 credits/mes)

$300+/mes:
  → S3 + CloudFront completo
  → Cloudinary/Imgix para media pesado
  → S3 Intelligent-Tiering automático
```

---

## Anti-patrones

```
❌ Bucket S3 público — SIEMPRE bloquear acceso público
❌ Subir archivos a través del backend (memory/CPU innecesario) — usar presigned URLs
❌ Guardar archivos en la DB (BLOB) — usar S3
❌ No usar CDN para assets estáticos servidos a usuarios globales
❌ Un solo bucket para todo (uploads, backups, temp, exports)
❌ No configurar lifecycle policies (storage crece sin control)
❌ Servir imágenes originales sin optimizar (5 MB por imagen)
❌ URLs de S3 predecibles sin autenticación (path traversal risk)
❌ No habilitar encryption at rest
❌ No habilitar versioning en buckets con datos de usuario
```
