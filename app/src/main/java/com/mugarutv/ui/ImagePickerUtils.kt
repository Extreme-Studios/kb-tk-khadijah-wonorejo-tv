package com.mugarutv.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Base64OutputStream
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.InputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class SelectedImagePayload(
    val base64: String,
    val fileName: String,
    val mimeType: String,
    val previewBitmap: Bitmap
)

data class SelectedFilePayload(
    val base64: String,
    val fileName: String,
    val mimeType: String,
    val sizeBytes: Long
)

suspend fun readSelectedImage(
    context: Context,
    uri: Uri
): Result<SelectedImagePayload> = withContext(Dispatchers.IO) {
    runCatching {
        val resolver = context.contentResolver
        val mimeType = resolver.getType(uri)?.ifBlank { null } ?: "image/jpeg"
        val fileName = resolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null
        )?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        }?.ifBlank { null } ?: defaultFileNameForMimeType(mimeType)

        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("Gambar tidak bisa dibaca.")

        val previewBitmap = decodeSampledBitmapFromBytes(bytes, MAX_IMAGE_EDGE, MAX_IMAGE_EDGE)
            ?: throw IllegalStateException("Preview gambar gagal dibuat.")
        val processedImage = prepareImagePayload(
            originalMimeType = mimeType,
            originalFileName = fileName,
            previewBitmap = previewBitmap
        )

        SelectedImagePayload(
            base64 = Base64.encodeToString(processedImage.bytes, Base64.NO_WRAP),
            fileName = processedImage.fileName,
            mimeType = processedImage.mimeType,
            previewBitmap = processedImage.previewBitmap
        )
    }.recoverCatching { error ->
        throw IllegalStateException(error.message ?: "Gagal memproses gambar.")
    }
}

private fun defaultFileNameForMimeType(mimeType: String): String = when (mimeType.lowercase()) {
    "image/png" -> "image.png"
    "image/webp" -> "image.webp"
    else -> "image.jpg"
}

private data class ProcessedImagePayload(
    val bytes: ByteArray,
    val fileName: String,
    val mimeType: String,
    val previewBitmap: Bitmap
)

private fun prepareImagePayload(
    originalMimeType: String,
    originalFileName: String,
    previewBitmap: Bitmap
): ProcessedImagePayload {
    var boundedBitmap = scaleBitmapIfNeeded(previewBitmap)
    val shouldPreservePng = originalMimeType.equals("image/png", ignoreCase = true) && boundedBitmap.hasAlpha()
    var outputMimeType = if (shouldPreservePng) "image/png" else "image/jpeg"
    var format = if (shouldPreservePng) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
    var quality = if (shouldPreservePng) 100 else 84
    var outputBytes = ByteArrayOutputStream().use { stream ->
        boundedBitmap.compress(format, quality, stream)
        stream.toByteArray()
    }
    
    // 1. Fallback PNG to JPEG if file is too large
    if (outputBytes.size > MAX_IMAGE_UPLOAD_BYTES && shouldPreservePng) {
        outputMimeType = "image/jpeg"
        format = Bitmap.CompressFormat.JPEG
        quality = 84
        outputBytes = ByteArrayOutputStream().use { stream ->
            boundedBitmap.compress(format, quality, stream)
            stream.toByteArray()
        }
    }
    
    // 2. Reduce JPEG quality if still too large
    if (outputBytes.size > MAX_IMAGE_UPLOAD_BYTES && format == Bitmap.CompressFormat.JPEG) {
        val qualities = listOf(70, 50, 30)
        for (q in qualities) {
            quality = q
            val tempBytes = ByteArrayOutputStream().use { stream ->
                boundedBitmap.compress(format, quality, stream)
                stream.toByteArray()
            }
            if (tempBytes.size <= MAX_IMAGE_UPLOAD_BYTES) {
                outputBytes = tempBytes
                break
            }
        }
    }
    
    // 3. Iteratively downscale if still too large
    var scale = 0.8f
    while (outputBytes.size > MAX_IMAGE_UPLOAD_BYTES && scale >= 0.2f) {
        val nextWidth = (boundedBitmap.width * scale).toInt().coerceAtLeast(1)
        val nextHeight = (boundedBitmap.height * scale).toInt().coerceAtLeast(1)
        val scaledBitmap = Bitmap.createScaledBitmap(boundedBitmap, nextWidth, nextHeight, true)
        
        outputBytes = ByteArrayOutputStream().use { stream ->
            scaledBitmap.compress(format, quality, stream)
            stream.toByteArray()
        }
        
        if (outputBytes.size <= MAX_IMAGE_UPLOAD_BYTES) {
            boundedBitmap = scaledBitmap
            break
        }
        
        if (format == Bitmap.CompressFormat.JPEG) {
            val qualities = listOf(70, 50, 30)
            var success = false
            for (q in qualities) {
                val tempBytes = ByteArrayOutputStream().use { stream ->
                    scaledBitmap.compress(format, q, stream)
                    stream.toByteArray()
                }
                if (tempBytes.size <= MAX_IMAGE_UPLOAD_BYTES) {
                    outputBytes = tempBytes
                    quality = q
                    boundedBitmap = scaledBitmap
                    success = true
                    break
                }
            }
            if (success) break
        }
        scale -= 0.2f
    }
    
    if (outputBytes.size > MAX_IMAGE_UPLOAD_BYTES) {
        throw IllegalStateException("Ukuran gambar terlalu besar setelah dikompresi. Pilih gambar yang lebih kecil.")
    }
    val outputFileName = ensureImageExtension(originalFileName, outputMimeType)
    return ProcessedImagePayload(
        bytes = outputBytes,
        fileName = outputFileName,
        mimeType = outputMimeType,
        previewBitmap = boundedBitmap
    )
}

private fun scaleBitmapIfNeeded(bitmap: Bitmap): Bitmap {
    val maxSide = maxOf(bitmap.width, bitmap.height)
    if (maxSide <= MAX_IMAGE_EDGE) return bitmap
    val ratio = MAX_IMAGE_EDGE.toFloat() / maxSide.toFloat()
    val targetWidth = (bitmap.width * ratio).toInt().coerceAtLeast(1)
    val targetHeight = (bitmap.height * ratio).toInt().coerceAtLeast(1)
    return Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
}

private fun decodeSampledBitmapFromBytes(
    bytes: ByteArray,
    reqWidth: Int,
    reqHeight: Int
): Bitmap? {
    try {
        Log.d("ImagePicker", "Decoding bitmap from bytes, size=${bytes.size}")
        val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOptions)
        Log.d("ImagePicker", "Original dimensions: ${boundsOptions.outWidth}x${boundsOptions.outHeight}, mime: ${boundsOptions.outMimeType}")
        
        if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) {
            Log.e("ImagePicker", "Invalid image bounds: ${boundsOptions.outWidth}x${boundsOptions.outHeight}")
            return null
        }

        val sampleSize = calculateInSampleSize(boundsOptions, reqWidth, reqHeight)
        Log.d("ImagePicker", "Calculated sample size: $sampleSize")
        
        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
        }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)
        if (bitmap == null) {
            Log.e("ImagePicker", "BitmapFactory returned null for bytes size=${bytes.size} with sampleSize=$sampleSize")
        } else {
            Log.d("ImagePicker", "Successfully decoded bitmap: ${bitmap.width}x${bitmap.height}")
        }
        return bitmap
    } catch (e: Throwable) {
        Log.e("ImagePicker", "Exception decoding bitmap", e)
        return null
    }
}

private fun calculateInSampleSize(
    options: BitmapFactory.Options,
    reqWidth: Int,
    reqHeight: Int
): Int {
    val (height, width) = options.outHeight to options.outWidth
    var inSampleSize = 1

    if (height > reqHeight || width > reqWidth) {
        val halfHeight = height / 2
        val halfWidth = width / 2

        while ((halfHeight / inSampleSize) >= reqHeight || (halfWidth / inSampleSize) >= reqWidth) {
            inSampleSize *= 2
        }
    }

    return inSampleSize
}

private fun ensureImageExtension(fileName: String, mimeType: String): String {
    val baseName = fileName.substringBeforeLast('.', fileName).ifBlank { "image" }
    val extension = when (mimeType.lowercase()) {
        "image/png" -> "png"
        "image/webp" -> "webp"
        else -> "jpg"
    }
    return "$baseName.$extension"
}

private const val MAX_IMAGE_EDGE = 1600
private const val MAX_IMAGE_UPLOAD_BYTES = 1_500_000
private const val DEFAULT_STREAM_BUFFER_SIZE = 16 * 1024

suspend fun readSelectedFile(
    context: Context,
    uri: Uri,
    fallbackFileName: String,
    fallbackMimeType: String,
    maxSizeBytes: Long? = null
): Result<SelectedFilePayload> = withContext(Dispatchers.IO) {
    runCatching {
        val resolver = context.contentResolver
        val fileMeta = resolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
            null,
            null,
            null
        )?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (cursor.moveToFirst()) {
                Pair(
                    if (nameIndex >= 0) cursor.getString(nameIndex) else null,
                    if (sizeIndex >= 0) cursor.getLong(sizeIndex) else -1L
                )
            } else {
                null
            }
        }

        val resolverMimeType = resolver.getType(uri)?.ifBlank { null }
        val mimeType = when {
            fallbackMimeType.equals("audio/mpeg", ignoreCase = true) -> "audio/mpeg"
            resolverMimeType != null -> resolverMimeType
            else -> fallbackMimeType
        }
        val fileName = fileMeta?.first?.ifBlank { null } ?: fallbackFileName
        val declaredSize = fileMeta?.second ?: -1L
        if (maxSizeBytes != null && declaredSize > 0L && declaredSize > maxSizeBytes) {
            val maxMb = (maxSizeBytes / (1024 * 1024)).coerceAtLeast(1)
            throw IllegalStateException("Ukuran file maksimal ${maxMb}MB.")
        }
        val encodedFile = resolver.openInputStream(uri)?.use { input ->
            encodeStreamToBase64(input, maxSizeBytes)
        } ?: throw IllegalStateException("File tidak bisa dibaca.")
        val sizeBytes = if (declaredSize > 0L) declaredSize else encodedFile.sizeBytes

        if (maxSizeBytes != null && sizeBytes > maxSizeBytes) {
            val maxMb = (maxSizeBytes / (1024 * 1024)).coerceAtLeast(1)
            throw IllegalStateException("Ukuran file maksimal ${maxMb}MB.")
        }

        SelectedFilePayload(
            base64 = encodedFile.base64,
            fileName = fileName,
            mimeType = mimeType,
            sizeBytes = sizeBytes
        )
    }.recoverCatching { error ->
        throw IllegalStateException(error.message ?: "Gagal memproses file.")
    }
}

private data class EncodedFile(
    val base64: String,
    val sizeBytes: Long
)

private fun encodeStreamToBase64(input: InputStream, maxSizeBytes: Long?): EncodedFile {
    val output = ByteArrayOutputStream()
    val base64Output = Base64OutputStream(output, Base64.NO_WRAP)
    val buffer = ByteArray(DEFAULT_STREAM_BUFFER_SIZE)
    var totalBytes = 0L

    while (true) {
        val read = input.read(buffer)
        if (read <= 0) break
        totalBytes += read
        if (maxSizeBytes != null && totalBytes > maxSizeBytes) {
            val maxMb = (maxSizeBytes / (1024 * 1024)).coerceAtLeast(1)
            throw IllegalStateException("Ukuran file maksimal ${maxMb}MB.")
        }
        base64Output.write(buffer, 0, read)
    }

    base64Output.flush()
    base64Output.close()
    return EncodedFile(
        base64 = output.toString(Charsets.UTF_8.name()),
        sizeBytes = totalBytes
    )
}
