package com.kbtkkhadijahwonorejotv.data.repository

import android.util.Log
import com.kbtkkhadijahwonorejotv.data.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.Date
import java.util.TimeZone

private const val SONGS_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbzQru1H6uJapk-Iws8HgCOCIC6Hm3AMjdRvxZhFha0ry4aBj6iFq7XCwxjCZQZz4PdZFQ/exec"
private fun songsEndpointUrl(): String = SONGS_ENDPOINT_URL.ifBlank {
    throw IllegalStateException("Endpoint Google Apps Script KB TK Khadijah Wonorejo TV belum diatur.")
}

class ApiSongRepository {
    private var cachedSongs: List<Song> = emptyList()
    private var lastFetchAtMs: Long = 0L
    private var cachedLikeUserId: String? = null

    suspend fun fetchSongs(
        likeUserId: String? = null,
        forceRefresh: Boolean = false,
        onPageLoaded: suspend (List<Song>) -> Unit = {}
    ): Result<List<Song>> = withContext(Dispatchers.IO) {
        runCatching {
            val now = System.currentTimeMillis()
            val normalizedLikeUserId = likeUserId?.trim().orEmpty().ifBlank { null }
            if (!forceRefresh && cachedSongs.isNotEmpty() && cachedLikeUserId == normalizedLikeUserId && now - lastFetchAtMs < CACHE_TTL_MS) {
                Log.d(TAG, "Using in-memory cache. count=${cachedSongs.size}")
                return@runCatching cachedSongs
            }

            val requestUrl = buildString {
                append(songsEndpointUrl())
                append("?ts=${System.currentTimeMillis()}")
                if (!normalizedLikeUserId.isNullOrBlank()) {
                    append("&user_id=${java.net.URLEncoder.encode(normalizedLikeUserId, "UTF-8")}")
                }
            }

            val songsArray = JSONArray()
            var offset = 0
            var pageCount = 0
            while (pageCount++ < 50) {
                val pageUrl = "$requestUrl&limit=40&offset=$offset"
                val connection = (URL(pageUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 15000
                    readTimeout = 45000
                    useCaches = false
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Cache-Control", "no-cache")
                    setRequestProperty("Pragma", "no-cache")
                }
                val body = try {
                    val code = connection.responseCode
                    if (code !in 200..299) throw IllegalStateException("HTTP $code saat mengambil data film.")
                    connection.inputStream.bufferedReader().use { it.readText() }
                } finally {
                    connection.disconnect()
                }
                if (body.trimStart().startsWith("<")) {
                    throw IllegalStateException("Backend mengembalikan HTML saat mengambil data film.")
                }
                val root = JSONObject(body)
                if (!root.optBoolean("success", false)) throw IllegalStateException("Response API tidak sukses.")
                val page = root.optJSONArray("films")
                    ?: root.optJSONArray("movies")
                    ?: throw IllegalStateException("Field films tidak ditemukan.")
                for (i in 0 until page.length()) songsArray.put(page.get(i))
                if (page.length() > 0) {
                    val partialSongs = parseSongs(songsArray)
                    withContext(Dispatchers.Main) { onPageLoaded(partialSongs) }
                }
                if (root.isNull("next_offset")) break
                val nextOffset = root.optInt("next_offset", -1)
                if (nextOffset <= offset || page.length() == 0) break
                offset = nextOffset
            }

            val songs = parseSongs(songsArray)
            cachedSongs = songs
            lastFetchAtMs = now
            cachedLikeUserId = normalizedLikeUserId
            songs
        }
    }

    private fun parseSongs(songsArray: JSONArray): List<Song> {
        Log.d(TAG, "Raw films from API: ${songsArray.length()}")
        var activeCount = 0
        val songs = buildList<Song> {
            for (i in 0 until songsArray.length()) {
                val item = songsArray.optJSONObject(i) ?: continue
                val title = readString(item, "title", "film_title", "movie_title", "judul_film", "song_title", "judul_lagu", "judul")
                val rawYear = readString(item, "year", "release", "releaseYear", "release_year", "tahun_release", "tahun_pembuatan")
                val youtubeUrl = readString(item, "video_url", "videoUrl", "youtube_url", "youtubeUrl", "movie_url", "movieUrl")
                val videoId = readString(item, "video_id", "videoId")
                val sourceChannelId = readString(item, "source_channel_id")
                val thumbnailUrl = readString(item, "thumbnail_url", "thumbnailUrl", "cover_url", "coverUrl", "poster_url", "posterUrl")
                val status = readString(item, "status").ifBlank { "approved" }
                if (!status.equals("approved", ignoreCase = true)) continue
                activeCount++

                val rawId = readString(item, "id", "film_id", "movie_id", "song_id")
                val createdAt = readString(item, "created_at", "createdAt", "uploaded_at", "uploadedAt", "updated_at")
                val kategori = readString(item, "category", "genre", "kategori")
                val resolvedId = rawId.ifBlank {
                    listOf(title, rawYear, createdAt, i.toString()).joinToString("#")
                }
                val resolvedYoutubeUrl = youtubeUrl.ifBlank {
                    if (videoId.isNotBlank()) "https://www.youtube.com/watch?v=$videoId" else ""
                }
                val year = rawYear.ifBlank { yearFromCreatedAt(createdAt) }
                val synopsis = readString(item, "synopsis", "description", "deskripsi", "desc", "notes").ifBlank {
                    if (sourceChannelId == SCHOOL_YOUTUBE_CHANNEL_ID) {
                        ""
                    } else if (resolvedYoutubeUrl.isNotBlank()) {
                        fetchYoutubeMetadataFromBackend(resolvedYoutubeUrl).description.ifBlank {
                            fetchYoutubeDescriptionFromYoutube(resolvedYoutubeUrl, videoId)
                        }
                    } else {
                        ""
                    }
                }
                val resolvedThumbnail = thumbnailUrl.ifBlank { youtubeThumbnailUrl(videoId) }

                Log.d(TAG, "Film from API title=$title youtube_url=$resolvedYoutubeUrl thumbnail_url=$resolvedThumbnail")

                add(
                    Song(
                        id = resolvedId,
                        title = title,
                        year = year,
                        synopsis = synopsis,
                        youtubeUrl = resolvedYoutubeUrl,
                        videoId = videoId,
                        sourceChannelId = sourceChannelId,
                        thumbnailUrl = resolvedThumbnail,
                        createdAt = createdAt,
                        status = status,
                        views = readString(item, "views").toIntOrNull() ?: 0,
                        likes = readString(item, "likes").toIntOrNull() ?: 0,
                        alreadyLiked = item.optBoolean("already_liked", false),
                        artist = kategori.ifBlank { year.ifBlank { "Live" } },
                        genre = kategori.ifBlank { year.ifBlank { "Live" } },
                        category = readString(item, "category", "genre"),
                        description = synopsis,
                        coverUrl = resolvedThumbnail,
                        movieUrl = resolvedYoutubeUrl,
                        audioUrl = resolvedYoutubeUrl,
                        uploadedAt = createdAt,
                        releaseYear = year
                    )
                )
            }
        }
            .filter { it.title.isNotBlank() }
            .distinctBy { it.id }
            .sortedWith(
                compareByDescending<Song> { parseCreatedAtMillis(it.createdAt.ifBlank { it.uploadedAt }) }
                    .thenBy { it.title.lowercase(Locale.US) }
            )

        Log.d(TAG, "Active films after status filter: $activeCount")
        Log.d(TAG, "Films after validation/dedupe/sort: ${songs.size}")
        return songs
    }

    fun getGenres(songs: List<Song>): List<String> = listOf("Semua") + songs.map { it.category }.filter { it.isNotBlank() }.distinct().sorted()
    fun getArtists(songs: List<Song>): List<String> = songs.map { it.year }.filter { it.isNotBlank() }.distinct().sortedDescending()

    fun getFallbackSongs(): List<Song> = emptyList()

    suspend fun fetchActiveLive(): Result<Song?> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL("${songsEndpointUrl()}?type=active_live").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 15000
                readTimeout = 20000
                setRequestProperty("Accept", "application/json")
            }
            val body = try {
                val code = connection.responseCode
                if (code !in 200..299) throw IllegalStateException("HTTP $code saat memeriksa siaran langsung.")
                connection.inputStream.bufferedReader().use { it.readText() }
            } finally {
                connection.disconnect()
            }
            val root = JSONObject(body)
            if (!root.optBoolean("success", false)) {
                throw IllegalStateException(root.optString("message").ifBlank { "Gagal memeriksa siaran langsung." })
            }
            if (!root.has("live")) throw IllegalStateException("Backend perlu diperbarui untuk status live.")
            val live = root.optJSONObject("live") ?: return@runCatching null
            val videoId = readString(live, "id")
            if (videoId.isBlank() || readString(live, "source_channel_id") != SCHOOL_YOUTUBE_CHANNEL_ID) {
                throw IllegalStateException("Data siaran langsung tidak sesuai kanal sekolah.")
            }
            val videoUrl = readString(live, "video_url")
            Song(
                id = videoId,
                title = readString(live, "title"),
                youtubeUrl = videoUrl,
                movieUrl = videoUrl,
                videoId = videoId,
                sourceChannelId = SCHOOL_YOUTUBE_CHANNEL_ID,
                thumbnailUrl = readString(live, "thumbnail_url"),
                coverUrl = readString(live, "thumbnail_url"),
                createdAt = readString(live, "started_at"),
                category = "Live",
                genre = "Live",
                status = "approved"
            )
        }
    }

    suspend fun updateFilmLike(filmId: String, username: String): Result<FilmLikeResult> = withContext(Dispatchers.IO) {
        runCatching {
            if (filmId.trim().isBlank()) throw IllegalStateException("film_id kosong.")
            if (username.trim().isBlank()) {
                throw IllegalStateException("Login diperlukan untuk Like.")
            }
            val connection = (URL(songsEndpointUrl()).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            }
            val body = JSONObject().apply {
                put("type", "film_like")
                put("film_id", filmId)
                put("userId", username)
                put("username", username)
            }.toString()
            OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(body) }
            val responseBody = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()
            if (responseBody.trimStart().startsWith("<")) {
                throw IllegalStateException("Endpoint backend mengembalikan HTML, bukan JSON. Redeploy Apps Script dan pastikan URL web app masih aktif.")
            }
            val responseJson = JSONObject(responseBody)
            if (!responseJson.optBoolean("success", false)) {
                throw IllegalStateException(responseJson.optString("message").ifBlank { "Gagal update like." })
            }
            cachedSongs = emptyList()
            lastFetchAtMs = 0L
            FilmLikeResult(
                totalLikes = responseJson.optInt("total_likes", responseJson.optInt("likes", 0)),
                alreadyLiked = responseJson.optBoolean("already_liked", true)
            )
        }
    }

    suspend fun updateFilmView(filmId: String?, movieUrl: String?): Result<Int> = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL(songsEndpointUrl()).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            }
            val body = JSONObject().apply {
                put("type", "film_view")
                if (!filmId.isNullOrBlank()) put("film_id", filmId)
                if (!movieUrl.isNullOrBlank()) {
                    put("video_url", movieUrl)
                    put("videoUrl", movieUrl)
                    put("youtube_url", movieUrl)
                    put("youtubeUrl", movieUrl)
                    put("movie_url", movieUrl)
                }
            }.toString()
            OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(body) }
            val responseBody = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()
            if (responseBody.trimStart().startsWith("<")) {
                throw IllegalStateException("Endpoint backend mengembalikan HTML, bukan JSON. Redeploy Apps Script dan pastikan URL web app masih aktif.")
            }
            val responseJson = JSONObject(responseBody)
            if (!responseJson.optBoolean("success", false)) {
                throw IllegalStateException(responseJson.optString("message").ifBlank { "Gagal update view." })
            }
            responseJson.optInt("views", 0)
        }
    }

    suspend fun updateFilmMetadata(
        filmId: String,
        username: String,
        title: String,
        year: String,
        deskripsi: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            if (filmId.trim().isBlank()) throw IllegalStateException("film_id kosong.")
            if (username.trim().isBlank()) throw IllegalStateException("Login admin diperlukan.")
            if (title.trim().isBlank()) throw IllegalStateException("Judul wajib diisi.")

            val connection = (URL(songsEndpointUrl()).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            }
            val body = JSONObject().apply {
                put("type", "film_update")
                put("film_id", filmId)
                put("username", username)
                put("title", title)
                put("year", year)
                put("deskripsi", deskripsi)
            }.toString()
            OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(body) }
            val responseBody = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()
            if (responseBody.trimStart().startsWith("<")) {
                throw IllegalStateException("Endpoint backend mengembalikan HTML, bukan JSON. Redeploy Apps Script dan pastikan URL web app masih aktif.")
            }
            val responseJson = JSONObject(responseBody)
            if (!responseJson.optBoolean("success", false)) {
                throw IllegalStateException(responseJson.optString("message").ifBlank { "Gagal update metadata film." })
            }
        }.recoverCatching {
            throw IllegalStateException(it.message ?: "Gagal update metadata film.")
        }
    }
    suspend fun deleteFilm(
        filmId: String,
        username: String,
        videoId: String = "",
        videoUrl: String = ""
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            if (filmId.trim().isBlank()) throw IllegalStateException("film_id kosong.")
            if (username.trim().isBlank()) throw IllegalStateException("Login admin diperlukan.")

            val connection = (URL(songsEndpointUrl()).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            }
            val body = JSONObject().apply {
                put("type", "film_delete")
                put("film_id", filmId)
                put("movie_id", filmId)
                put("id", filmId)
                put("username", username)
                if (videoId.isNotBlank()) {
                    put("video_id", videoId)
                    put("videoId", videoId)
                }
                if (videoUrl.isNotBlank()) {
                    put("video_url", videoUrl)
                    put("videoUrl", videoUrl)
                    put("youtube_url", videoUrl)
                    put("youtubeUrl", videoUrl)
                    put("movie_url", videoUrl)
                }
            }.toString()
            OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(body) }
            val responseBody = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()
            if (responseBody.trimStart().startsWith("<")) {
                throw IllegalStateException("Endpoint backend mengembalikan HTML, bukan JSON. Redeploy Apps Script dan pastikan URL web app masih aktif.")
            }
            val responseJson = JSONObject(responseBody)
            if (!responseJson.optBoolean("success", false)) {
                throw IllegalStateException(responseJson.optString("message").ifBlank { "Gagal menghapus film." })
            }
            cachedSongs = emptyList()
            lastFetchAtMs = 0L
        }.recoverCatching {
            throw IllegalStateException(it.message ?: "Gagal menghapus film.")
        }
    }

    companion object {
        private const val TAG = "ApiSongRepository"
        private const val CACHE_TTL_MS = 60_000L
    }
}

data class FilmLikeResult(
    val totalLikes: Int,
    val alreadyLiked: Boolean
)

private fun readString(item: JSONObject, vararg keys: String): String {
    keys.forEach { key ->
        if (item.has(key)) {
            val value = item.opt(key)
            if (value != null && value != JSONObject.NULL) {
                val text = value.toString().trim()
                if (text.isNotBlank()) return text
            }
        }
    }
    return ""
}

private fun parseCreatedAtMillis(value: String): Long {
    if (value.isBlank()) return Long.MIN_VALUE
    val patterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd"
    )
    return patterns.firstNotNullOfOrNull { pattern ->
        runCatching {
            SimpleDateFormat(pattern, Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.parse(value)?.time
        }.getOrNull()
    } ?: Long.MIN_VALUE
}

private fun youtubeThumbnailUrl(videoId: String): String {
    return if (videoId.isBlank()) "" else "https://img.youtube.com/vi/$videoId/hqdefault.jpg"
}

private fun fetchYoutubeMetadataFromBackend(youtubeUrl: String): YoutubeMetaFallback {
    val normalizedUrl = youtubeUrl.trim()
    if (normalizedUrl.isBlank()) return YoutubeMetaFallback()

    return runCatching {
        val requestUrl = buildString {
            append(songsEndpointUrl())
            append("?type=youtube_meta&url=")
            append(java.net.URLEncoder.encode(normalizedUrl, "UTF-8"))
            append("&ts=")
            append(System.currentTimeMillis())
        }
        val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 12000
            readTimeout = 12000
            useCaches = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-cache")
            setRequestProperty("Pragma", "no-cache")
        }
        val code = connection.responseCode
        if (code !in 200..299) {
            connection.disconnect()
            return@runCatching YoutubeMetaFallback()
        }
        val body = connection.inputStream.bufferedReader().use { it.readText() }
        connection.disconnect()
        if (body.trimStart().startsWith("<")) return@runCatching YoutubeMetaFallback()
        val root = JSONObject(body)
        YoutubeMetaFallback(
            title = readString(root, "title"),
            description = readString(root, "description"),
            thumbnailUrl = readString(root, "thumbnail_url", "thumbnailUrl")
        )
    }.getOrElse { YoutubeMetaFallback() }
}

private fun fetchYoutubeDescriptionFromYoutube(youtubeUrl: String, videoId: String): String {
    val normalizedUrl = youtubeUrl.trim().ifBlank {
        if (videoId.isBlank()) "" else "https://www.youtube.com/watch?v=$videoId"
    }
    if (normalizedUrl.isBlank()) return ""

    return runCatching {
        val pageUrl = if (normalizedUrl.contains("?")) "$normalizedUrl&hl=id" else "$normalizedUrl?hl=id"
        val connection = (URL(pageUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 12000
            readTimeout = 12000
            useCaches = false
            setRequestProperty(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
            )
            setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            setRequestProperty("Cache-Control", "no-cache")
            setRequestProperty("Pragma", "no-cache")
        }
        val code = connection.responseCode
        if (code !in 200..299) {
            connection.disconnect()
            return@runCatching ""
        }
        val html = connection.inputStream.bufferedReader().use { it.readText() }
        connection.disconnect()
        val metaDescription = Regex("""<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']""", RegexOption.IGNORE_CASE)
            .find(html)
            ?.groupValues
            ?.getOrNull(1)
            .orEmpty()
        decodeHtmlEntities(metaDescription.trim())
    }.getOrDefault("")
}

private fun yearFromCreatedAt(createdAt: String): String {
    val millis = parseCreatedAtMillis(createdAt)
    if (millis == Long.MIN_VALUE) return ""
    return runCatching {
        java.text.SimpleDateFormat("yyyy", Locale.US).format(Date(millis))
    }.getOrDefault("")
}

private fun decodeHtmlEntities(text: String): String {
    return text
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
}

private data class YoutubeMetaFallback(
    val title: String = "",
    val description: String = "",
    val thumbnailUrl: String = ""
)

