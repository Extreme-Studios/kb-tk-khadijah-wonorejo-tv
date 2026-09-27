const SPREADSHEET_ID = "1mfkgAA79HFB7d11hHwUx3Jhwvr3ww-nU4BNyakUuAS8";
const SCHOOL_CHANNEL_ID = "UCt0FwAI34vzhpkFfbpbopng";
const YOUTUBE_API_KEY_PROPERTY = "YOUTUBE_API_KEY";

const SHEET_ADMIN = "admin";
const SHEET_FILMS = "video";
const SHEET_PORTAL = "poster_posts";
const SHEET_PORTAL_REPORTS = "portal_reports";
const PORTAL_POST_EXPIRE_HOURS = 3;
const ACTIVE_LIVE_STREAM_ID = "active_live_stream";

const FILM_COVER_FOLDER_ID = "14pIbAKaJkS-AX82vfs3xnEldFGR1d5kE"; // Gambar
const FILM_VIDEO_FOLDER_ID = "1DpaWdpbRf2OHg4r12T7USvnwokZsMa18"; // Video
const PORTAL_POSTER_FOLDER_ID = "17f2Ijhuj61OUrW2KXZomclikLlAglBc8"; // Poster

const ADMIN_HEADERS = [
  "username",
  "password"
];

const FILM_HEADERS = [
  "id",
  "title",
  "year",
  "deskripsi",
  "kategori",
  "video_url",
  "video_id",
  "thumbnail_url",
  "created_at",
  "status",
  "views",
  "likes",
  "source_channel_id"
];

const PORTAL_HEADERS = [
  "id",
  "user_id",
  "category",
  "poster_url",
  "posting_at",
  "status"
];

const PORTAL_REPORT_HEADERS = [
  "id",
  "post_id",
  "post_title",
  "category",
  "report_reason",
  "reported_link",
  "poster_url",
  "status"
];

function setupKbTkKhadijahWonorejoTvSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const adminSheet = ensureAdminSheet_(ss);
  const filmsSheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  const portalSheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL, PORTAL_HEADERS);
  const reportsSheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL_REPORTS, PORTAL_REPORT_HEADERS);

  return {
    success: true,
    message: "KB TK Khadijah Wonorejo TV sheets siap.",
    sheets: [adminSheet.getName(), filmsSheet.getName(), portalSheet.getName(), reportsSheet.getName()]
  };
}

function doGet(e) {
  try {
    setupKbTkKhadijahWonorejoTvSheets();
    const type = String((e && e.parameter && e.parameter.type) || "").trim();

    if (type === "health") {
      return jsonOutput_(healthCheck_());
    }

    if (type === "setup") {
      return jsonOutput_(setupKbTkKhadijahWonorejoTvSheets());
    }

    if (type === "portal_posts") {
      return jsonOutput_({
        success: true,
        portal_posts: getActivePortalPosts_()
      });
    }

    if (type === "active_live") {
      return jsonOutput_({ success: true, live: getActiveSchoolLive_() });
    }

    if (type === "youtube_meta") {
      const youtubeUrl = String((e && e.parameter && e.parameter.url) || "").trim();
      return jsonOutput_(fetchYoutubeMetadata_(youtubeUrl));
    }

    const likeUserId = String((e && e.parameter && (e.parameter.user_id || e.parameter.like_user_id)) || "").trim();
    const movies = getApprovedMovies_(likeUserId);
    const categories = getApprovedCategories_(movies);
    const offset = Math.max(0, Number((e && e.parameter && e.parameter.offset) || 0) || 0);
    const limit = Math.min(Math.max(Number((e && e.parameter && e.parameter.limit) || 40) || 40, 1), 40);
    const films = movies.slice(offset, offset + limit).map(function(movie) {
      return {
        id: movie.id,
        title: movie.title,
        created_at: movie.created_at,
        year: movie.year,
        description: movie.description,
        category: movie.category,
        video_url: movie.video_url,
        video_id: movie.video_id,
        source_channel_id: movie.source_channel_id,
        thumbnail_url: movie.thumbnail_url,
        status: movie.status,
        views: movie.views,
        likes: movie.likes,
        already_liked: movie.already_liked
      };
    });
    return jsonOutput_({
      success: true,
      films: films,
      total: movies.length,
      next_offset: offset + films.length < movies.length ? offset + films.length : null,
      categories: categories
    });
  } catch (error) {
    return jsonOutput_({
      success: false,
      message: error && error.message ? error.message : "Unhandled server error (GET)."
    });
  }
}

function healthCheck_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const adminSheet = ensureAdminSheet_(ss);
  const filmsSheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  const portalSheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL, PORTAL_HEADERS);
  const reportsSheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL_REPORTS, PORTAL_REPORT_HEADERS);

  return {
    success: true,
    message: "Health check OK",
    spreadsheet: {
      id: SPREADSHEET_ID,
      name: ss.getName(),
      sheets: [
        adminSheet.getName(),
        filmsSheet.getName(),
        portalSheet.getName(),
        reportsSheet.getName()
      ]
    },
    drive: {
      film_cover_folder_id: FILM_COVER_FOLDER_ID,
      portal_folder_id: PORTAL_POSTER_FOLDER_ID,
      configured: Boolean(FILM_COVER_FOLDER_ID && PORTAL_POSTER_FOLDER_ID)
    }
  };
}

function doPost(e) {
  try {
    setupKbTkKhadijahWonorejoTvSheets();
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const type = String(payload.type || "").trim();

    if (type === "admin_login" || type === "hub_login") {
      return handleAdminLogin_(payload);
    }
    if (type === "admin_check_status" || type === "hub_check_status") {
      return handleAdminCheckStatus_(payload);
    }
    if (type === "admin_update_credentials") {
      return handleAdminUpdateCredentials_(payload);
    }
    if (type === "portal_post") {
      return handlePortalPost_(payload);
    }
    if (type === "portal_report") {
      return handlePortalReport_(payload);
    }
    if (type === "portal_delete") {
      return handlePortalDelete_(payload);
    }
    if (type === "content_report") {
      return handleContentReport_(payload);
    }
    if (type === "film_like") {
      return handleFilmLike_(payload);
    }
    if (type === "film_view") {
      return handleFilmView_(payload);
    }
    if (type === "film_update") {
      return handleFilmUpdate_(payload);
    }
    if (type === "film_delete") {
      return handleFilmDelete_(payload);
    }
    if (type === "channel_import" || type === "youtube_channel_import") {
      return handleYoutubeChannelImport_(payload);
    }
    if (type === "live_stream_update" || type === "active_live_update") {
      return handleLiveStreamUpdate_(payload);
    }
    if (type === "film_registration" || type === "song_registration" || type === "live_registration") {
      return handleFilmRegistration_(payload);
    }

    return jsonOutput_({ success: false, message: "Tipe request tidak dikenal." });
  } catch (error) {
    return jsonOutput_({
      success: false,
      message: error && error.message ? error.message : "Unhandled server error."
    });
  }
}

function handleMemberRegister_(payload) {
  return handleAdminLogin_(payload);
}

function handleMemberLogin_(payload) {
  return handleAdminLogin_(payload);
}

function handleMemberCheckStatus_(payload) {
  return handleAdminCheckStatus_(payload);
}

function handleYoutubeChannelImport_(payload) {
  const channelUrl = normalizeYoutubeChannelUrl_(payload.channel_url || payload.channelUrl || payload.url || "");
  const maxItems = Math.min(Math.max(Number(payload.max_items || payload.maxItems || 500), 1), 1000);
  if (!channelUrl) {
    return jsonOutput_({ success: false, message: "Link channel YouTube wajib diisi." });
  }
  // The app imports only this school channel; do not fetch arbitrary channels.
  const allowedChannel = /^https?:\/\/(?:www\.)?youtube\.com\/(?:@tkkhadijahwonorejo2232|channel\/UCt0FwAI34vzhpkFfbpbopng)\/?$/i;
  if (!allowedChannel.test(channelUrl.replace(/[?#].*$/, ""))) {
    return jsonOutput_({ success: false, message: "Hanya channel TK Khadijah Wonorejo yang boleh diimpor." });
  }
  const apiKey = String(PropertiesService.getScriptProperties().getProperty(YOUTUBE_API_KEY_PROPERTY) || "").trim();
  if (!apiKey) {
    return jsonOutput_({ success: false, message: "Script Property YOUTUBE_API_KEY belum diisi." });
  }
  const channel = youtubeApiGet_("channels", {
    part: "snippet,contentDetails",
    id: SCHOOL_CHANNEL_ID,
    maxResults: 1
  }, apiKey).items[0];
  const uploadsId = channel && channel.contentDetails && channel.contentDetails.relatedPlaylists
    ? channel.contentDetails.relatedPlaylists.uploads : "";
  if (!uploadsId) {
    return jsonOutput_({ success: false, message: "Daftar unggahan channel tidak ditemukan." });
  }

  const uploads = youtubeApiPlaylistItems_(uploadsId, maxItems, apiKey);
  if (!uploads.length) {
    return jsonOutput_({ success: false, message: "Tidak ada video publik channel yang berhasil dibaca." });
  }
  const uploadedIds = {};
  uploads.forEach(function(item) { uploadedIds[item.videoId] = true; });

  const categoryByVideoId = {};
  let pageToken = "";
  const seenPlaylistPages = {};
  do {
    if (seenPlaylistPages[pageToken]) throw new Error("Halaman playlist YouTube berulang.");
    seenPlaylistPages[pageToken] = true;
    const page = youtubeApiGet_("playlists", {
      part: "snippet",
      channelId: SCHOOL_CHANNEL_ID,
      maxResults: 50,
      pageToken: pageToken
    }, apiKey);
    (page.items || []).forEach(function(playlist) {
      const playlistId = String(playlist.id || "");
      const title = String((playlist.snippet && playlist.snippet.title) || "").trim();
      if (!playlistId || !title) return;
      youtubeApiPlaylistItems_(playlistId, 1000, apiKey).forEach(function(item) {
        if (uploadedIds[item.videoId] && !categoryByVideoId[item.videoId]) {
          categoryByVideoId[item.videoId] = title;
        }
      });
    });
    pageToken = String(page.nextPageToken || "");
  } while (pageToken);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const values = sheet.getDataRange().getValues();
    const col = getSheetHeaderMap_(values[0]);
    const existingById = {};
    for (let r = 1; r < values.length; r++) {
      const id = String(values[r][col["video_id"]] || "").trim()
        || extractYouTubeVideoId_(String(values[r][col["video_url"]] || ""));
      if (id) existingById[id] = r;
    }
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const importedIds = [];
    const newRows = [];
    const categoryValues = values.slice(1).map(function(row) { return [row[col["kategori"]]]; });
    const sourceValues = values.slice(1).map(function(row) { return [row[col["source_channel_id"]]]; });
    uploads.forEach(function(item) {
      const videoId = item.videoId;
      const category = categoryByVideoId[videoId] || "Video Kanal";
      const existingIndex = existingById[videoId];
      if (existingIndex !== undefined) {
        const row = values[existingIndex];
        const source = String(row[col["source_channel_id"]] || "").trim();
        if (source && source !== SCHOOL_CHANNEL_ID) {
          skipped++;
          return;
        }
        let changed = false;
        if (String(row[col["kategori"]] || "") !== category) {
          categoryValues[existingIndex - 1][0] = category;
          changed = true;
        }
        if (!source) {
          sourceValues[existingIndex - 1][0] = SCHOOL_CHANNEL_ID;
          changed = true;
        }
        if (changed) updated++;
        else skipped++;
        return;
      }
      const snippet = item.snippet;
      const thumbnails = snippet.thumbnails || {};
      const thumbnail = thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default || {};
      const title = String(snippet.title || "").trim() || ("Video YouTube " + videoId);
      const published = String(snippet.publishedAt || "");
      newRows.push([
        "film_" + videoId,
        title,
        published ? published.substring(0, 4) : "",
        String(snippet.description || ""),
        category,
        "https://www.youtube.com/watch?v=" + videoId,
        videoId,
        String(thumbnail.url || "") || buildYouTubeThumbnailUrl_(videoId),
        new Date(),
        "approved",
        0,
        0,
        SCHOOL_CHANNEL_ID
      ]);
      existingById[videoId] = -1;
      importedIds.push(videoId);
      imported++;
    });
    if (updated && categoryValues.length) {
      sheet.getRange(2, col["kategori"] + 1, categoryValues.length, 1).setValues(categoryValues);
      sheet.getRange(2, col["source_channel_id"] + 1, sourceValues.length, 1).setValues(sourceValues);
    }
    if (newRows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, FILM_HEADERS.length).setValues(newRows);
    }
    SpreadsheetApp.flush();
    return jsonOutput_({
      success: true,
      message: "Sinkronisasi channel selesai.",
      total: uploads.length,
      imported: imported,
      updated: updated,
      skipped: skipped,
      channel_id: SCHOOL_CHANNEL_ID,
      channel_title: String((channel.snippet && channel.snippet.title) || ""),
      imported_video_ids: importedIds
    });
  } finally {
    lock.releaseLock();
  }
}

function getActiveSchoolLive_() {
  const apiKey = String(PropertiesService.getScriptProperties().getProperty(YOUTUBE_API_KEY_PROPERTY) || "").trim();
  if (!apiKey) throw new Error("Script Property YOUTUBE_API_KEY belum diisi.");

  // Search is cached to protect the daily quota. Video status is checked on every request
  // so a completed broadcast disappears without waiting for the search cache to expire.
  const cache = CacheService.getScriptCache();
  let ids = cache.get("school_active_live_ids");
  if (ids === null) {
    const results = youtubeApiGet_("search", {
      part: "snippet",
      channelId: SCHOOL_CHANNEL_ID,
      eventType: "live",
      type: "video",
      maxResults: 10
    }, apiKey);
    ids = (results.items || []).map(function(item) {
      return item && item.id && item.id.videoId;
    }).filter(Boolean).join(",") || "-";
    cache.put("school_active_live_ids", ids, 1200);
  }
  if (ids === "-") return null;

  const details = youtubeApiGet_("videos", {
    part: "snippet,liveStreamingDetails",
    id: ids
  }, apiKey);
  const active = (details.items || []).find(function(item) {
    const snippet = item.snippet || {};
    const timing = item.liveStreamingDetails || {};
    return snippet.channelId === SCHOOL_CHANNEL_ID
      && snippet.liveBroadcastContent === "live"
      && Boolean(timing.actualStartTime)
      && !timing.actualEndTime;
  });
  if (!active) {
    cache.remove("school_active_live_ids");
    return null;
  }
  const snippet = active.snippet || {};
  const thumbs = snippet.thumbnails || {};
  return {
    id: active.id,
    title: snippet.title || "Live KB TK Khadijah Wonorejo",
    video_url: "https://www.youtube.com/watch?v=" + active.id,
    thumbnail_url: (thumbs.high || thumbs.medium || thumbs.default || {}).url || "",
    source_channel_id: SCHOOL_CHANNEL_ID,
    started_at: (active.liveStreamingDetails || {}).actualStartTime || ""
  };
}

function youtubeApiGet_(resource, params, apiKey) {
  const query = Object.keys(params).filter(function(key) {
    return params[key] !== "" && params[key] !== null && params[key] !== undefined;
  }).map(function(key) {
    return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
  }).join("&");
  const url = "https://www.googleapis.com/youtube/v3/" + resource + "?" + query
    + "&key=" + encodeURIComponent(apiKey);
  let response;
  try {
    response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  } catch (error) {
    // UrlFetchApp errors may include the request URL, which contains the key.
    throw new Error("Koneksi YouTube Data API gagal.");
  }
  const status = response.getResponseCode();
  let data;
  try {
    data = JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error("Respons YouTube Data API tidak valid (HTTP " + status + ").");
  }
  if (status < 200 || status >= 300) {
    const reason = data && data.error && data.error.message ? data.error.message : "Permintaan gagal";
    throw new Error("YouTube Data API (HTTP " + status + "): " + reason);
  }
  return data;
}

function youtubeApiPlaylistItems_(playlistId, maxItems, apiKey) {
  const items = [];
  const seen = {};
  const seenPages = {};
  let pageToken = "";
  do {
    if (seenPages[pageToken]) throw new Error("Halaman video YouTube berulang.");
    seenPages[pageToken] = true;
    const page = youtubeApiGet_("playlistItems", {
      part: "snippet",
      playlistId: playlistId,
      maxResults: Math.min(50, maxItems - items.length),
      pageToken: pageToken
    }, apiKey);
    (page.items || []).forEach(function(item) {
      const snippet = item.snippet || {};
      const videoId = String((snippet.resourceId && snippet.resourceId.videoId) || "");
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || seen[videoId]) return;
      if (snippet.title === "Private video" || snippet.title === "Deleted video") return;
      seen[videoId] = true;
      items.push({ videoId: videoId, snippet: snippet });
    });
    pageToken = String(page.nextPageToken || "");
  } while (pageToken && items.length < maxItems);
  return items;
}

function importItemsWithCategory_(sheet, items, category, channelId, importedIds, onImport, onSkip) {
  items.forEach(function(item) {
    const videoId = String(item.videoId || "").trim();
    if (!videoId) return;
    const id = item.id || ("film_" + (videoId || Date.now() + "_" + Math.floor(Math.random() * 1000)));
    
    // Check duplicates by ID and Category
    const duplicate = findFilmByVideoId_(sheet, videoId);
    
    if (duplicate) {
      const sourceColumn = duplicate.col["source_channel_id"];
      if (sourceColumn !== undefined && !String(duplicate.row[sourceColumn] || "").trim()) {
        sheet.getRange(duplicate.rowNumber, sourceColumn + 1).setValue(channelId);
      }
      if (onSkip) onSkip();
      return;
    }

    let title = String(item.title || "").trim();
    let description = String(item.description || "").trim();
    let thumbnailUrl = String(item.thumbnailUrl || "").trim();
    let itemYear = String(item.year || "").trim();
    const videoUrl = item.url || (videoId ? "https://www.youtube.com/watch?v=" + videoId : "");

    if (!title) {
      title = videoId ? "Video YouTube " + videoId : "Post YouTube";
    }
    if (!thumbnailUrl && videoId) {
      thumbnailUrl = buildYouTubeThumbnailUrl_(videoId);
    }

    sheet.appendRow([
      id,
      title,
      itemYear,
      description,
      category,
      videoUrl,
      videoId,
      thumbnailUrl,
      new Date(),
      "approved",
      0,
      0,
      channelId
    ]);
    if (onImport) onImport();
    if (videoId) importedIds.push(videoId);
  });
}

function normalizeYoutubeChannelUrl_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.charAt(0) === "@") return "https://www.youtube.com/" + raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return "https://" + raw;
  return "https://www.youtube.com/" + raw.replace(/^\/+/, "");
}

function resolveYoutubeChannelInfo_(channelUrl) {
  const normalizedUrl = normalizeYoutubeChannelUrl_(channelUrl);
  const directMatch = normalizedUrl.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{20,})/i);
  if (directMatch && directMatch[1]) {
    return { channelId: directMatch[1], title: "", url: "https://www.youtube.com/channel/" + directMatch[1] };
  }

  const html = fetchText_(normalizedUrl, "GET", null);
  const channelId = extractYoutubeChannelIdFromText_(html);
  const title = extractYoutubeChannelTitleFromHtml_(html);
  return {
    channelId: channelId,
    title: title,
    url: channelId ? "https://www.youtube.com/channel/" + channelId : normalizedUrl
  };
}

function extractYoutubeChannelIdFromText_(text) {
  const raw = String(text || "");
  const patterns = [
    /"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{20,})"/,
    /"externalId"\s*:\s*"(UC[A-Za-z0-9_-]{20,})"/,
    /<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[A-Za-z0-9_-]{20,})["']/i,
    /\/channel\/(UC[A-Za-z0-9_-]{20,})/i
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = raw.match(patterns[i]);
    if (match && match[1]) return match[1];
  }
  return "";
}

function extractYoutubeChannelTitleFromHtml_(html) {
  const raw = String(html || "");
  const ogTitle = raw.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle && ogTitle[1]) return decodeHtmlEntities_(ogTitle[1]);
  const title = raw.match(/<title>([^<]+)<\/title>/i);
  if (title && title[1]) return decodeHtmlEntities_(title[1]).replace(/\s*-\s*YouTube\s*$/i, "").trim();
  return "";
}

function fetchYoutubeChannelVideos_(channelId, maxItems) {
  const byId = {};
  const ordered = [];

  function addItem(item) {
    const videoId = String(item && item.videoId || "").trim();
    if (!videoId || byId[videoId]) return;
    byId[videoId] = {
      videoId: videoId,
      url: normalizeYoutubeUrl_(item.url || ("https://www.youtube.com/watch?v=" + videoId)),
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim(),
      thumbnailUrl: String(item.thumbnailUrl || "").trim() || buildYouTubeThumbnailUrl_(videoId),
      year: String(item.year || "").trim()
    };
    ordered.push(byId[videoId]);
  }

  fetchYoutubeChannelRssVideos_(channelId).forEach(addItem);

  const html = fetchText_("https://www.youtube.com/channel/" + encodeURIComponent(channelId) + "/videos?view=0&sort=dd&flow=grid", "GET", null);
  parseYoutubeVideoRendererItems_(html).forEach(addItem);

  const apiKey = extractYoutubeInnertubeApiKey_(html);
  const clientVersion = extractYoutubeClientVersion_(html) || "2.20240601.00.00";
  let continuation = extractYoutubeContinuationToken_(html);
  let guard = 0;
  while (continuation && apiKey && ordered.length < maxItems && guard < 40) {
    guard++;
    const response = fetchYoutubeContinuation_(apiKey, clientVersion, continuation);
    parseYoutubeVideoRendererItems_(response).forEach(addItem);
    const next = extractYoutubeContinuationToken_(response);
    if (!next || next === continuation) break;
    continuation = next;
  }

  return ordered.slice(0, maxItems);
}

function fetchYoutubeChannelRssVideos_(channelId) {
  const items = [];
  try {
    const url = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId);
    const text = fetchText_(url, "GET", null);
    if (!text) return items;
    const document = XmlService.parse(text);
    const root = document.getRootElement();
    const atom = XmlService.getNamespace("http://www.w3.org/2005/Atom");
    const media = XmlService.getNamespace("media", "http://search.yahoo.com/mrss/");
    const yt = XmlService.getNamespace("yt", "http://www.youtube.com/xml/schemas/2015");
    const entries = root.getChildren("entry", atom);
    entries.forEach(function(entry) {
      const videoIdEl = entry.getChild("videoId", yt);
      const titleEl = entry.getChild("title", atom);
      const groupEl = entry.getChild("group", media);
      const descEl = groupEl ? groupEl.getChild("description", media) : null;
      const thumbEl = groupEl ? groupEl.getChild("thumbnail", media) : null;
      const publishedEl = entry.getChild("published", atom);
      const videoId = videoIdEl ? videoIdEl.getText() : "";
      const publishedText = publishedEl ? String(publishedEl.getText() || "") : "";
      const publishedYear = publishedText ? publishedText.substring(0, 4) : "";
      if (!videoId) return;
      items.push({
        videoId: videoId,
        url: "https://www.youtube.com/watch?v=" + videoId,
        title: titleEl ? titleEl.getText() : "",
        description: descEl ? descEl.getText() : "",
        thumbnailUrl: thumbEl ? String(thumbEl.getAttribute("url").getValue() || "") : "",
        year: publishedYear
      });
    });
  } catch (error) {
    Logger.log("YouTube RSS fetch failed: " + (error && error.message ? error.message : String(error)));
  }
  return items;
}

function parseYoutubeVideoRendererItems_(text) {
  const raw = unescapeYoutubeJsonText_(text);
  const items = [];
  const seen = {};
  const regex = /"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"[\s\S]{0,2500}?"title"\s*:\s*\{[\s\S]{0,500}?"text"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const videoId = match[1];
    if (seen[videoId]) continue;
    seen[videoId] = true;
    items.push({
      videoId: videoId,
      url: "https://www.youtube.com/watch?v=" + videoId,
      title: decodeHtmlEntities_(unescapeYoutubeJsonText_(match[2] || "")),
      description: "",
      thumbnailUrl: buildYouTubeThumbnailUrl_(videoId),
      year: ""
    });
  }

  const simpleRegex = /"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;
  while ((match = simpleRegex.exec(raw)) !== null) {
    const videoId = match[1];
    if (seen[videoId]) continue;
    seen[videoId] = true;
    items.push({
      videoId: videoId,
      url: "https://www.youtube.com/watch?v=" + videoId,
      title: "",
      description: "",
      thumbnailUrl: buildYouTubeThumbnailUrl_(videoId),
      year: ""
    });
  }
  return items;
}

function parseYoutubePlaylists_(html) {
  const playlistIds = [];
  const raw = unescapeYoutubeJsonText_(html);
  const regex = /"playlistId"\s*:\s*"(PL[A-Za-z0-9_-]{18,})"/g;
  let match;
  const seen = {};
  while ((match = regex.exec(raw)) !== null) {
    const playlistId = match[1];
    if (seen[playlistId]) continue;
    seen[playlistId] = true;
    playlistIds.push(playlistId);
  }
  return playlistIds;
}

function parseYoutubeCommunityPosts_(html) {
  const posts = [];
  const raw = unescapeYoutubeJsonText_(html);
  
  const backstageRegex = /"backstagePostRenderer"\s*:\s*\{([\s\S]*?)\n\s*\}\s*,\s*"\w+"\s*:/g;
  let match;
  while ((match = backstageRegex.exec(raw)) !== null) {
    const postBody = match[1];
    
    const idMatch = postBody.match(/"postId"\s*:\s*"([^"]+)"/);
    const postId = idMatch ? idMatch[1] : "";
    if (!postId) continue;
    
    const textMatch = postBody.match(/"text"\s*:\s*"([^"]+)"/);
    const text = textMatch ? decodeHtmlEntities_(unescapeYoutubeJsonText_(textMatch[1])) : "";
    
    const dateMatch = postBody.match(/"publishedTimeText"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
    const dateText = dateMatch ? dateMatch[1] : "";
    
    posts.push({
      id: "post_" + postId,
      title: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      description: text,
      url: "https://www.youtube.com/post/" + postId,
      videoId: "",
      thumbnailUrl: "",
      year: dateText
    });
  }
  return posts;
}

function extractYoutubeInnertubeApiKey_(html) {
  const raw = String(html || "");
  const match = raw.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
  return match && match[1] ? match[1] : "";
}

function extractYoutubeClientVersion_(html) {
  const raw = String(html || "");
  const match = raw.match(/"clientVersion"\s*:\s*"([^"]+)"/);
  return match && match[1] ? match[1] : "";
}

function extractYoutubeContinuationToken_(text) {
  const raw = String(text || "");
  const regex = /"continuationCommand"\s*:\s*\{\s*"token"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const token = unescapeYoutubeJsonText_(match[1]);
    // The first token belongs to the Videos tab. Later tokens on the initial
    // page can point to unrelated tabs and return no videos.
    if (token) return token;
  }
  return "";
}

function fetchYoutubeContinuation_(apiKey, clientVersion, continuation) {
  const body = JSON.stringify({
    context: {
      client: {
        clientName: "WEB",
        clientVersion: clientVersion
      }
    },
    continuation: continuation
  });
  return fetchText_("https://www.youtube.com/youtubei/v1/browse?key=" + encodeURIComponent(apiKey), "POST", body);
}

function fetchText_(url, method, body) {
  const options = {
    method: method || "GET",
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  };
  if (body) {
    options.contentType = "application/json";
    options.payload = body;
  }
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    Logger.log("Fetch failed " + code + " for " + url);
    return "";
  }
  return response.getContentText() || "";
}

function unescapeYoutubeJsonText_(text) {
  return String(text || "")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\u002f/g, "/")
    .replace(/\\\"/g, "\"")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ");
}

function handleLiveStreamUpdate_(payload) {
  validateActiveAdmin_(payload);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  const uploadLink = String(
    payload.upload_link ||
    payload.link_upload ||
    payload.video_url ||
    payload.videoUrl ||
    payload.youtube_url ||
    payload.youtubeUrl ||
    payload.movie_url ||
    payload.live_url ||
    payload.liveUrl ||
    payload.stream_url ||
    payload.streamUrl ||
    ""
  ).trim();
  const normalizedUploadLink = normalizeUploadLink_(uploadLink);
  if (!normalizedUploadLink) return jsonOutput_({ success: false, message: "Link live wajib diisi." });

  const videoId = extractYouTubeVideoId_(normalizedUploadLink);
  const youtubeMeta = videoId ? fetchYoutubeMetadata_(normalizedUploadLink) : { title: "", description: "", thumbnailUrl: "", year: "" };
  const requestedTitle = String(payload.title || payload.judul || "").trim();
  const metaTitle = String(youtubeMeta.title || "").trim();
  const resolvedTitle = metaTitle || requestedTitle || inferLiveTitle_(normalizedUploadLink, "Live");
  const resolvedDeskripsi = String(youtubeMeta.description || payload.deskripsi || payload.synopsis || payload.description || "").trim();
  const resolvedYear = String(youtubeMeta.year || payload.year || payload.releaseYear || "").trim();
  let thumbnailUrl = String(youtubeMeta.thumbnailUrl || youtubeMeta.thumbnail_url || "").trim();
  if (!thumbnailUrl && videoId) thumbnailUrl = buildYouTubeThumbnailUrl_(videoId);

  const found = findFilmById_(sheet, ACTIVE_LIVE_STREAM_ID);
  const views = found && found.col["views"] !== undefined ? Number(found.row[found.col["views"]] || 0) : 0;
  const likes = found && found.col["likes"] !== undefined ? Number(found.row[found.col["likes"]] || 0) : 0;
  const row = [
    ACTIVE_LIVE_STREAM_ID,
    resolvedTitle,
    resolvedYear,
    resolvedDeskripsi,
    "Live",
    normalizedUploadLink,
    videoId,
    thumbnailUrl,
    new Date(),
    "approved",
    views,
    likes,
    ""
  ];

  if (found) {
    sheet.getRange(found.rowNumber, 1, 1, FILM_HEADERS.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return jsonOutput_({
    success: true,
    message: "Live streaming berhasil disimpan.",
    id: ACTIVE_LIVE_STREAM_ID,
    video_url: normalizedUploadLink,
    title: resolvedTitle
  });
}
function handleFilmRegistration_(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);

  const title = String(payload.title || payload.judul || payload.judul_film || payload.songTitle || "").trim();
  const year = String(payload.year || payload.release || payload.releaseYear || payload.tahun_release || payload.tahun_pembuatan || "").trim();
  const deskripsi = String(payload.deskripsi || payload.synopsis || payload.description || payload.notes || "").trim();
  const uploadLink = String(
    payload.upload_link ||
    payload.link_upload ||
    payload.video_url ||
    payload.videoUrl ||
    payload.youtube_url ||
    payload.youtubeUrl ||
    payload.movie_url ||
    payload.live_url ||
    payload.liveUrl ||
    payload.stream_url ||
    payload.streamUrl ||
    ""
  ).trim();
  const normalizedUploadLink = normalizeUploadLink_(uploadLink);
  const videoId = extractYouTubeVideoId_(normalizedUploadLink);
  const youtubeMeta = videoId ? fetchYoutubeMetadata_(normalizedUploadLink) : { title: "", description: "", thumbnailUrl: "" };
  const kategori = String(payload.kategori || payload.category || payload.genre || "").trim() || inferLivePlatformLabel_(normalizedUploadLink);
  const resolvedTitle = title || String(youtubeMeta.title || "").trim() || inferLiveTitle_(normalizedUploadLink, kategori);
  const resolvedDeskripsi = deskripsi || String(youtubeMeta.description || "").trim();
  const resolvedYear = year || String(youtubeMeta.year || "").trim();
  const coverArtBase64 = String(payload.coverImageBase64 || payload.cover_art_base64 || payload.coverArtBase64 || "").trim();
  const coverArtFileName = String(payload.coverImageFileName || payload.cover_art_file_name || payload.coverArtFileName || "cover-art.jpg").trim() || "cover-art.jpg";
  const coverArtMimeType = String(payload.coverImageMimeType || payload.cover_art_mime_type || payload.coverArtMimeType || "image/jpeg").trim() || "image/jpeg";

  if (!normalizedUploadLink) return jsonOutput_({ success: false, message: "Link live wajib diisi." });

  const duplicate = videoId ? findFilmByVideoId_(sheet, videoId) : findFilmByUploadLink_(sheet, normalizedUploadLink);
  if (duplicate) {
    return jsonOutput_({ success: false, message: "Live ini sudah pernah dikirim." });
  }

  let thumbnailUrl = videoId ? String(youtubeMeta.thumbnailUrl || "").trim() : "";
  if (!thumbnailUrl && videoId) thumbnailUrl = buildYouTubeThumbnailUrl_(videoId);
  if (coverArtBase64) {
    thumbnailUrl = uploadBase64ImageToDrive_(
      coverArtBase64,
      coverArtFileName,
      coverArtMimeType,
      FILM_COVER_FOLDER_ID
    );
  }
  sheet.appendRow([
    "film_" + Date.now(),
    resolvedTitle,
    resolvedYear,
    resolvedDeskripsi,
    kategori,
    normalizedUploadLink,
    videoId,
    thumbnailUrl,
    new Date(),
    "approved",
    0,
    0
  ]);

  return jsonOutput_({ success: true, message: "Registrasi live berhasil disimpan." });
}

function handlePortalPost_(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL, PORTAL_HEADERS);
  const user = validateActiveAdmin_(payload);
  const posterBase64 = String(
    payload.posterImageBase64 ||
    payload.imageBase64 ||
    payload.base64 ||
    payload.fileBase64 ||
    ""
  ).trim();
  if (!posterBase64) throw new Error("Base64 poster tidak ditemukan di payload.");

  const posterUrl = uploadBase64ImageToDrive_(
    posterBase64,
    payload.posterImageFileName || payload.fileName || "poster.jpg",
    payload.posterImageMimeType || payload.mimeType || "image/jpeg",
    PORTAL_POSTER_FOLDER_ID
  );
  const category = String(payload.category || "").trim();

  try {
    sheet.appendRow([
      "portal_" + Date.now(),
      user.username,
      category,
      posterUrl,
      new Date(),
      "ACTIVE"
    ]);
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    throw new Error("Upload sukses, tapi gagal tulis ke sheet poster_posts: " + detail);
  }

  return jsonOutput_({ success: true, message: "Poster berhasil dipasang." });
}


function handlePortalDelete_(payload) {
  const postId = String(payload.postId || payload.post_id || payload.id || "").trim();
  if (!postId) return jsonOutput_({ success: false, message: "postId wajib diisi." });

  validateActiveAdmin_(payload);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL, PORTAL_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return jsonOutput_({ success: false, message: "Data informasi kosong." });
  }

  const col = getSheetHeaderMap_(values[0]);
  const idIdx = col["id"];
  const posterIdx = col["poster_url"];
  if (idIdx === undefined) {
    return jsonOutput_({ success: false, message: "Kolom id tidak ditemukan." });
  }

  for (let r = 1; r < values.length; r++) {
    const rowId = String(values[r][idIdx] || "").trim();
    if (rowId !== postId) continue;

    if (posterIdx !== undefined) {
      const posterUrl = String(values[r][posterIdx] || "").trim();
      if (posterUrl) deletePosterFileByUrl_(posterUrl);
    }

    sheet.deleteRow(r + 1);
    return jsonOutput_({ success: true, message: "Informasi berhasil dihapus.", deleted_id: postId });
  }

  return jsonOutput_({ success: false, message: "Informasi tidak ditemukan." });
}
function handlePortalReport_(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL_REPORTS, PORTAL_REPORT_HEADERS);
  const reason = String(payload.reason || "").trim();
  const postId = String(payload.postId || "").trim();
  const postTitle = String(payload.postTitle || payload.title || "").trim();
  const category = String(payload.category || "").trim();
  const reportedLink = String(payload.reportedLink || payload.reportedDriveLink || "").trim();
  const posterUrl = String(payload.posterUrl || payload.poster_url || getPortalPosterUrlById_(postId) || "").trim();

  if (!postId) return jsonOutput_({ success: false, message: "postId wajib diisi." });
  if (!reason) return jsonOutput_({ success: false, message: "reason wajib diisi." });

  sheet.appendRow([
    "report_" + Date.now(),
    postId,
    postTitle,
    category,
    reason,
    reportedLink,
    posterUrl,
    "NEW"
  ]);

  return jsonOutput_({ success: true, message: "Laporan diterima. Terima kasih." });
}

function handleContentReport_(payload) {
  const targetType = String(payload.targetType || "").trim().toLowerCase();
  const targetId = String(payload.targetId || "").trim();
  const reason = String(payload.reason || "").trim();
  const reportedLink = String(payload.reportedLink || payload.reportedDriveLink || "").trim();
  const posterUrl = String(payload.posterUrl || payload.poster_url || (targetType === "poster" ? getPortalPosterUrlById_(targetId) : "") || "").trim();

  if (!targetId) return jsonOutput_({ success: false, message: "targetId wajib diisi." });
  if (!reason) return jsonOutput_({ success: false, message: "reason wajib diisi." });
  if (targetType !== "film" && targetType !== "poster") {
    return jsonOutput_({ success: false, message: "targetType harus film atau poster." });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL_REPORTS, PORTAL_REPORT_HEADERS);
  reportsSheet.appendRow([
    "report_" + Date.now(),
    targetId,
    String(payload.postTitle || payload.title || "").trim(),
    String(payload.category || targetType || "").trim(),
    "[" + targetType + "] " + reason,
    reportedLink,
    posterUrl,
    "NEW"
  ]);

  return jsonOutput_({ success: true, message: "Laporan diterima." });
}

function handleFilmLike_(payload) {
  const filmId = String(payload.film_id || payload.movie_id || payload.id || "").trim();
  if (!filmId) return jsonOutput_({ success: false, message: "film_id wajib diisi." });
  validateActiveAdmin_(payload);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const filmsSheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  if (!findFilmById_(filmsSheet, filmId)) {
    return jsonOutput_({ success: false, message: "Film tidak ditemukan." });
  }

  const totalLikes = incrementFilmLikesColumn_(filmsSheet, filmId);
  return jsonOutput_({
    success: true,
    already_liked: false,
    total_likes: totalLikes,
    likes: totalLikes
  });
}

function handleFilmView_(payload) {
  const filmId = String(payload.film_id || payload.movie_id || payload.id || "").trim();
  const videoUrl = String(payload.video_url || payload.videoUrl || payload.youtube_url || payload.youtubeUrl || payload.movie_url || "").trim();
  const videoId = String(payload.video_id || payload.videoId || extractYouTubeVideoId_(videoUrl) || "").trim();
  if (!filmId && !videoId && !videoUrl) {
    return jsonOutput_({ success: false, message: "film_id, video_id, atau video_url wajib diisi." });
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return jsonOutput_({ success: false, message: "Data film kosong." });

  const col = getSheetHeaderMap_(values[0]);
  const idIdx = col["id"];
  const videoIdIdx = col["video_id"];
  const videoUrlIdx = col["video_url"] !== undefined ? col["video_url"] : col["youtube_url"];
  const viewsIdx = col["views"];
  if (viewsIdx === undefined) {
    return jsonOutput_({ success: false, message: "Kolom views tidak ditemukan." });
  }

  for (let r = 1; r < values.length; r++) {
    const rowId = idIdx !== undefined ? String(values[r][idIdx] || "").trim() : "";
    const rowVideoId = videoIdIdx !== undefined ? String(values[r][videoIdIdx] || "").trim() : "";
    const rowVideoUrl = videoUrlIdx !== undefined ? String(values[r][videoUrlIdx] || "").trim() : "";
    const rowExtractedVideoId = extractYouTubeVideoId_(rowVideoUrl);
    const matchedById = filmId && rowId === filmId;
    const matchedByVideoId = videoId && (rowVideoId === videoId || rowExtractedVideoId === videoId);
    const matchedByVideoUrl = videoUrl && rowVideoUrl === videoUrl;
    if (!matchedById && !matchedByVideoId && !matchedByVideoUrl) continue;

    const current = Number(values[r][viewsIdx] || 0);
    const next = Math.max(0, current + 1);
    sheet.getRange(r + 1, viewsIdx + 1).setValue(next);
    return jsonOutput_({ success: true, views: next });
  }

  return jsonOutput_({ success: false, message: "Film tidak ditemukan." });
}

function handleFilmUpdate_(payload) {
  const filmId = String(payload.film_id || payload.movie_id || payload.id || "").trim();
  const title = String(payload.title || payload.judul || payload.judul_film || "").trim();
  const year = String(payload.year || payload.release || payload.releaseYear || payload.tahun_release || payload.tahun_pembuatan || "").trim();
  const deskripsi = String(payload.deskripsi || payload.synopsis || payload.description || payload.notes || "").trim();
  if (!filmId) return jsonOutput_({ success: false, message: "film_id wajib diisi." });
  if (!title) return jsonOutput_({ success: false, message: "Judul wajib diisi." });

  validateActiveAdmin_(payload);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  const found = findFilmById_(sheet, filmId);
  if (!found) {
    return jsonOutput_({ success: false, message: "Film tidak ditemukan." });
  }

  const titleIdx = found.col["title"];
  const yearIdx = found.col["year"];
  const descIdx = found.col["deskripsi"];
  if (titleIdx !== undefined) sheet.getRange(found.rowNumber, titleIdx + 1).setValue(title);
  if (yearIdx !== undefined) sheet.getRange(found.rowNumber, yearIdx + 1).setValue(year);
  if (descIdx !== undefined) sheet.getRange(found.rowNumber, descIdx + 1).setValue(deskripsi);

  return jsonOutput_({
    success: true,
    message: "Metadata film berhasil diperbarui.",
    film: {
      id: filmId,
      title: title,
      year: year,
      deskripsi: deskripsi,
      synopsis: deskripsi,
      description: deskripsi
    }
  });
}


function handleFilmDelete_(payload) {
  const filmId = String(payload.film_id || payload.movie_id || payload.id || "").trim();
  const videoUrl = String(payload.video_url || payload.videoUrl || payload.youtube_url || payload.youtubeUrl || payload.movie_url || "").trim();
  const normalizedVideoUrl = normalizeUploadLink_(videoUrl);
  const videoId = String(payload.video_id || payload.videoId || extractYouTubeVideoId_(normalizedVideoUrl) || "").trim();
  if (!filmId && !videoId && !normalizedVideoUrl) {
    return jsonOutput_({ success: false, message: "film_id, video_id, atau video_url wajib diisi." });
  }

  validateActiveAdmin_(payload);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  let found = filmId ? findFilmById_(sheet, filmId) : null;
  if (!found && videoId) found = findFilmByVideoId_(sheet, videoId);
  if (!found && normalizedVideoUrl) found = findFilmByUploadLink_(sheet, normalizedVideoUrl);
  if (!found) {
    return jsonOutput_({ success: false, message: "Film tidak ditemukan." });
  }

  sheet.deleteRow(found.rowNumber);

  return jsonOutput_({
    success: true,
    message: "Film berhasil dihapus.",
    deleted_id: filmId || videoId || normalizedVideoUrl
  });
}
function normalizeYoutubeUrl_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const videoId = extractYouTubeVideoId_(raw);
  if (!videoId) return raw;
  return "https://www.youtube.com/watch?v=" + videoId;
}

function normalizeUploadLink_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const videoId = extractYouTubeVideoId_(raw);
  if (videoId) return "https://www.youtube.com/watch?v=" + videoId;
  return raw;
}

function inferLivePlatformLabel_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "Live";
  try {
    const parsed = new URL(raw);
    const host = String(parsed.hostname || "").toLowerCase();
    if (host.indexOf("youtube.com") >= 0 || host.indexOf("youtu.be") >= 0) return "YouTube";
    if (host.indexOf("instagram.com") >= 0) return "Instagram";
    if (host.indexOf("facebook.com") >= 0 || host.indexOf("fb.watch") >= 0) return "Facebook";
    return host.replace(/^www\./, "") || "Live";
  } catch (error) {
    return "Live";
  }
}

function inferLiveTitle_(url, platformLabel) {
  const platform = String(platformLabel || "").trim() || inferLivePlatformLabel_(url);
  if (!platform || platform.toLowerCase() === "live") return "Live Streaming";
  return platform + " Live";
}

function extractYouTubeVideoId_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  const watchMatch = raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  const shortsMatch = raw.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  const youtuBeMatch = raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (youtuBeMatch && youtuBeMatch[1]) return youtuBeMatch[1];

  try {
    const parsed = new URL(raw);
    const host = String(parsed.hostname || "").toLowerCase();
    if (host.indexOf("youtube.com") >= 0) {
      const v = parsed.searchParams.get("v");
      if (v) return v.trim();
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = pathParts.indexOf("shorts");
      if (shortsIndex >= 0 && shortsIndex + 1 < pathParts.length) {
        return pathParts[shortsIndex + 1].trim();
      }
    }
    if (host.indexOf("youtu.be") >= 0) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts.length) return pathParts[0].trim();
    }
  } catch (error) {}

  return "";
}

function buildYouTubeThumbnailUrl_(videoId) {
  const id = String(videoId || "").trim();
  if (!id) return "";
  const maxResUrl = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
  const fallbackUrl = "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
  try {
    const response = UrlFetchApp.fetch(maxResUrl, { muteHttpExceptions: true, followRedirects: true });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      return maxResUrl;
    }
  } catch (error) {
    Logger.log("Thumbnail fetch failed for videoId=" + id + ": " + (error && error.message ? error.message : String(error)));
  }
  return fallbackUrl;
}

function fetchYoutubeMetadata_(youtubeUrl) {
  const normalizedUrl = normalizeYoutubeUrl_(youtubeUrl);
  const videoId = extractYouTubeVideoId_(normalizedUrl);
  if (!videoId) {
    return {
      success: false,
      message: "Link YouTube tidak valid.",
      title: "",
      description: "",
      year: "",
      thumbnail_url: "",
      video_id: ""
    };
  }

  const oembedUrl = "https://www.youtube.com/oembed?url=" + encodeURIComponent(normalizedUrl) + "&format=json";
  let title = "";
  let thumbnailUrl = "";
  try {
    const response = UrlFetchApp.fetch(oembedUrl, { muteHttpExceptions: true, followRedirects: true });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      const data = JSON.parse(response.getContentText() || "{}");
      title = String(data.title || "").trim();
      thumbnailUrl = String(data.thumbnail_url || "").trim();
    }
  } catch (error) {
    Logger.log("YouTube oEmbed failed for " + videoId + ": " + (error && error.message ? error.message : String(error)));
  }

  let description = "";
  let year = "";
  try {
    const pageUrl = normalizedUrl.indexOf("?") >= 0 ? normalizedUrl + "&hl=id" : normalizedUrl + "?hl=id";
    const response = UrlFetchApp.fetch(pageUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      const html = response.getContentText() || "";
      const metaDescription = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      if (metaDescription && metaDescription[1]) {
        description = decodeHtmlEntities_(metaDescription[1].trim());
      }
      const published = html.match(/<meta[^>]+itemprop=["']datePublished["'][^>]+content=["']([^"']+)["']/i) || html.match(/"publishDate"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i) || html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i);
      if (published && published[1]) year = String(published[1]).substring(0, 4);
      if (!title) {
        const metaTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
        if (metaTitle && metaTitle[1]) {
          title = decodeHtmlEntities_(metaTitle[1].trim());
        }
      }
    }
  } catch (error) {
    Logger.log("YouTube page fetch failed for " + videoId + ": " + (error && error.message ? error.message : String(error)));
  }

  return {
    success: true,
    title: title,
    description: description,
    year: year,
    thumbnail_url: thumbnailUrl || buildYouTubeThumbnailUrl_(videoId),
    video_id: videoId,
    video_url: normalizedUrl,
    youtube_url: normalizedUrl
  };
}

function findFilmByVideoId_(sheet, videoId) {
  const trimmedVideoId = String(videoId || "").trim();
  if (!trimmedVideoId) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const col = getSheetHeaderMap_(values[0]);
  const videoIdIdx = col["video_id"];
  const videoUrlIdx = col["video_url"] !== undefined ? col["video_url"] : col["youtube_url"];
  if (videoIdIdx === undefined && videoUrlIdx === undefined) return null;

  for (let r = 1; r < values.length; r++) {
    const rowVideoId = videoIdIdx !== undefined ? String(values[r][videoIdIdx] || "").trim() : "";
    const rowVideoUrl = videoUrlIdx !== undefined ? String(values[r][videoUrlIdx] || "").trim() : "";
    const rowExtractedVideoId = extractYouTubeVideoId_(rowVideoUrl);
    if (rowVideoId === trimmedVideoId || rowExtractedVideoId === trimmedVideoId) {
      return { rowNumber: r + 1, row: values[r], col: col };
    }
  }
  return null;
}

function findFilmByUploadLink_(sheet, uploadLink) {
  const trimmedUploadLink = String(uploadLink || "").trim();
  if (!trimmedUploadLink) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const col = getSheetHeaderMap_(values[0]);
  const videoUrlIdx = col["video_url"] !== undefined ? col["video_url"] : col["youtube_url"];
  if (videoUrlIdx === undefined) return null;

  for (let r = 1; r < values.length; r++) {
    const rowVideoUrl = String(values[r][videoUrlIdx] || "").trim();
    if (rowVideoUrl === trimmedUploadLink) {
      return { rowNumber: r + 1, row: values[r], col: col };
    }
  }
  return null;
}

function findFilmByIdAndCategory_(sheet, id, category) {
  const trimmedId = String(id || "").trim();
  if (!trimmedId) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const col = getSheetHeaderMap_(values[0]);
  const idIdx = col["id"];
  const kategoriIdx = col["kategori"] !== undefined ? col["kategori"] : col["category"];
  if (idIdx === undefined) return null;

  for (let r = 1; r < values.length; r++) {
    const rowId = String(values[r][idIdx] || "").trim();
    const rowKategori = kategoriIdx !== undefined ? String(values[r][kategoriIdx] || "").trim() : "";
    if (rowId === trimmedId && rowKategori.toLowerCase() === category.toLowerCase()) {
      return { rowNumber: r + 1, row: values[r], col: col };
    }
  }
  return null;
}

function findFilmByVideoIdAndCategory_(sheet, videoId, category) {
  const trimmedVideoId = String(videoId || "").trim();
  if (!trimmedVideoId) return null;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const col = getSheetHeaderMap_(values[0]);
  const videoIdIdx = col["video_id"];
  const videoUrlIdx = col["video_url"] !== undefined ? col["video_url"] : col["youtube_url"];
  const kategoriIdx = col["kategori"] !== undefined ? col["kategori"] : col["category"];
  if (videoIdIdx === undefined && videoUrlIdx === undefined) return null;

  for (let r = 1; r < values.length; r++) {
    const rowVideoId = videoIdIdx !== undefined ? String(values[r][videoIdIdx] || "").trim() : "";
    const rowVideoUrl = videoUrlIdx !== undefined ? String(values[r][videoUrlIdx] || "").trim() : "";
    const rowExtractedVideoId = extractYouTubeVideoId_(rowVideoUrl);
    const rowKategori = kategoriIdx !== undefined ? String(values[r][kategoriIdx] || "").trim() : "";
    if ((rowVideoId === trimmedVideoId || rowExtractedVideoId === trimmedVideoId) && rowKategori.toLowerCase() === category.toLowerCase()) {
      return { rowNumber: r + 1, row: values[r], col: col };
    }
  }
  return null;
}

function getPortalPosterUrlById_(postId) {
  const id = String(postId || "").trim();
  if (!id) return "";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL, PORTAL_HEADERS);
  const rows = readSheetObjects_(sheet);
  for (let i = 0; i < rows.length; i++) {
    const rowId = String(rows[i].id || "").trim();
    if (rowId === id) return String(rows[i].poster_url || "").trim();
  }
  return "";
}

function diagnoseDriveAccess() {
  try {
    const folder = DriveApp.getFolderById(PORTAL_POSTER_FOLDER_ID);
    return {
      success: true,
      message: "DriveApp OK",
      folderName: folder.getName(),
      folderId: PORTAL_POSTER_FOLDER_ID
    };
  } catch (error) {
    return {
      success: false,
      message: "DriveApp belum punya izin. Jalankan manual function diagnoseDriveAccess() lalu Authorize, kemudian deploy ulang Web App as Execute as: Me.",
      detail: error && error.message ? error.message : String(error)
    };
  }
}

function getApprovedMovies_(likeUserId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_FILMS, FILM_HEADERS);
  return readSheetObjects_(sheet)
    .filter(function(movie) {
      return String(movie.status || "").trim().toLowerCase() === "approved";
    })
    .sort(function(a, b) {
      return parseDateValue_(b.created_at) - parseDateValue_(a.created_at);
    })
    .map(function(movie) {
      const movieId = String(movie.id || "").trim();
      const totalLikes = Number(movie.likes || 0);
      const title = String(movie.title || movie.judul || movie.judul_film || "").trim();
      const year = String(movie.year || movie.release || movie.releaseYear || movie.tahun_release || movie.tahun_pembuatan || "").trim();
      const deskripsi = String(movie.deskripsi || movie.synopsis || movie.description || "").trim();
      const kategori = String(movie.kategori || movie.category || movie.genre || "").trim() || "Live";
      const videoUrl = String(movie.video_url || movie.videoUrl || movie.youtube_url || movie.youtubeUrl || movie.movie_url || "").trim();
      const videoId = String(movie.video_id || movie.videoId || "").trim();
      const sourceChannelId = String(movie.source_channel_id || "").trim();
      const thumbnailUrl = String(movie.thumbnail_url || movie.thumbnailUrl || movie.cover_url || movie.poster_url || "").trim();
      return {
        id: movieId,
        created_at: formatDateValue_(movie.created_at),
        film_id: movieId,
        title: title,
        judul: title,
        judul_film: title,
        year: year,
        release: year,
        releaseYear: year,
        deskripsi: deskripsi,
        synopsis: deskripsi,
        description: deskripsi,
        kategori: kategori,
        category: kategori,
        video_url: videoUrl,
        videoUrl: videoUrl,
        youtube_url: videoUrl,
        youtubeUrl: videoUrl,
        video_id: videoId,
        videoId: videoId,
        source_channel_id: sourceChannelId,
        thumbnail_url: thumbnailUrl,
        thumbnailUrl: thumbnailUrl,
        cover_url: thumbnailUrl,
        poster_url: thumbnailUrl,
        movie_url: videoUrl,
        status: String(movie.status || "").trim(),
        views: Number(movie.views || 0),
        likes: totalLikes,
        total_likes: totalLikes,
        already_liked: false
      };
    });
}

function findFilmById_(filmsSheet, filmId) {
  const values = filmsSheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const col = getSheetHeaderMap_(values[0]);
  const idIdx = col["id"];
  if (idIdx === undefined) return null;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIdx] || "").trim() === filmId) {
      return { rowNumber: r + 1, row: values[r], col: col };
    }
  }
  return null;
}

function incrementFilmLikesColumn_(filmsSheet, filmId) {
  const found = findFilmById_(filmsSheet, filmId);
  if (!found) return 0;
  const likesIdx = found.col["likes"];
  if (likesIdx === undefined) return 0;
  const nextLikes = Math.max(0, Number(found.row[likesIdx] || 0) + 1);
  filmsSheet.getRange(found.rowNumber, likesIdx + 1).setValue(nextLikes);
  return nextLikes;
}

function getApprovedCategories_(movies) {
  const set = {};
  movies.forEach(function(movie) {
    const kategori = String(movie.kategori || movie.category || movie.genre || "").trim();
    if (!kategori) return;
    set[kategori] = true;
  });
  return ["Semua"].concat(Object.keys(set).sort());
}

function getActivePortalPosts_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheetWithHeaders_(ss, SHEET_PORTAL, PORTAL_HEADERS);
  expirePortalPostsIfNeeded_(sheet);
  return readSheetObjects_(sheet)
    .filter(function(post) {
      return String(post.status || "").trim().toUpperCase() === "ACTIVE";
    })
    .map(function(post) {
      const creatorName = String(post.user_id || "").trim();
      return {
        id: post.id,
        title: post.category || creatorName || "",
        band_name: creatorName,
        creator_name: creatorName,
        submitter_name: creatorName,
        category: post.category || "",
        poster_url: post.poster_url || "",
        short_caption: "",
        caption: "",
        event_date: "",
        posting_at: formatDateValue_(post.posting_at),
        status: post.status || "",
        created_at: formatDateValue_(post.posting_at)
      };
    });
}

function expirePortalPostsIfNeeded_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const col = getSheetHeaderMap_(values[0]);
  const statusIdx = col["status"];
  const postingAtIdx = col["posting_at"];
  const posterUrlIdx = col["poster_url"];
  if (statusIdx === undefined || postingAtIdx === undefined) return;

  const nowMs = Date.now();
  const expireMs = PORTAL_POST_EXPIRE_HOURS * 60 * 60 * 1000;
  for (let r = 1; r < values.length; r++) {
    const status = String(values[r][statusIdx] || "").trim().toUpperCase();
    if (status !== "ACTIVE") continue;
    const postingMs = parseDateValue_(values[r][postingAtIdx]);
    if (!postingMs) continue;
    if (nowMs - postingMs >= expireMs) {
      if (posterUrlIdx !== undefined) {
        const posterUrl = String(values[r][posterUrlIdx] || "").trim();
        deletePosterFileByUrl_(posterUrl);
      }
      sheet.getRange(r + 1, statusIdx + 1).setValue("EXPIRED");
    }
  }
}

function deletePosterFileByUrl_(url) {
  const fileId = extractDriveFileIdFromUrl_(url);
  if (!fileId) return;
  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
  } catch (error) {
    Logger.log("Gagal hapus file expired: " + (error && error.message ? error.message : String(error)));
  }
}

function extractDriveFileIdFromUrl_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  const byIdParam = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (byIdParam && byIdParam[1]) return byIdParam[1];

  const byFilePath = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (byFilePath && byFilePath[1]) return byFilePath[1];

  const byUcPath = raw.match(/\/uc\?[^#]*id=([a-zA-Z0-9_-]{10,})/);
  if (byUcPath && byUcPath[1]) return byUcPath[1];

  return "";
}

function decodeHtmlEntities_(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getPortalCreatorName_(post) {
  return String(post.user_id || post.creator_name || post.band_name || "").trim();
}

function getPortalCaption_(post) {
  return String(post.caption || post.short_caption || "").trim();
}

function handleAdminLogin_(payload) {
  const username = normalizeAdminUsername_(payload.username || payload.userId || payload.bandName || "");
  const password = String(payload.password || "").trim();
  const admin = findAdminByUsernameForLogin_(username, password);
  if (!admin) return jsonOutput_({ success: false, message: "Admin tidak ditemukan." });
  if (normalizeAdminPassword_(admin.password) !== normalizeAdminPassword_(password)) {
    return jsonOutput_({ success: false, message: "Password salah." });
  }

  return jsonOutput_({
    success: true,
    message: "Login berhasil.",
    user: {
      id: admin.username,
      username: admin.username,
      bandName: admin.username,
      nama_anggota: admin.username,
      whatsapp: admin.username,
      createdAt: formatDateValue_(new Date()),
      status: "ACTIVE"
    }
  });
}


function handleAdminUpdateCredentials_(payload) {
  const currentUsername = normalizeAdminUsername_(payload.username || payload.userId || payload.bandName || "");
  const newUsername = normalizeAdminUsername_(payload.new_username || payload.newUsername || "");
  const newPassword = normalizeAdminPassword_(payload.new_password || payload.newPassword || "");

  if (!currentUsername) return jsonOutput_({ success: false, message: "Username admin aktif tidak ditemukan." });
  

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureAdminSheet_(ss);
  const values = sheet.getDataRange().getValues();
  const col = getSheetHeaderMap_(values[0]);
  const usernameIdx = col["username"];
  const passwordIdx = col["password"];

  if (usernameIdx === undefined || passwordIdx === undefined) {
    return jsonOutput_({ success: false, message: "Kolom username/password tidak ditemukan di sheet admin." });
  }

  let targetRow = -1;
  let duplicateRow = -1;

  for (let i = 1; i < values.length; i++) {
    const rowUsername = normalizeAdminUsername_(String(values[i][usernameIdx] || ""));
    if (rowUsername === currentUsername) targetRow = i + 1;
    if (rowUsername === newUsername) duplicateRow = i + 1;
  }

  if (targetRow < 2) {
    return jsonOutput_({ success: false, message: "Admin tidak ditemukan." });
  }

  if (duplicateRow > 0 && duplicateRow !== targetRow) {
    return jsonOutput_({ success: false, message: "Username baru sudah dipakai admin lain." });
  }

  sheet.getRange(targetRow, usernameIdx + 1).setValue(newUsername);
  sheet.getRange(targetRow, passwordIdx + 1).setValue(newPassword);

  return jsonOutput_({
    success: true,
    message: "Username dan password admin berhasil diperbarui.",
    user: {
      id: newUsername,
      username: newUsername,
      bandName: newUsername,
      nama_anggota: newUsername,
      whatsapp: newUsername,
      createdAt: formatDateValue_(new Date()),
      status: "ACTIVE"
    }
  });
}
function handleAdminCheckStatus_(payload) {
  const username = normalizeAdminUsername_(payload.username || payload.userId || payload.bandName || "");
  const admin = findAdminByUsername_(username);
  if (!admin) return jsonOutput_({ success: false, message: "Info admin tidak ditemukan." });
  return jsonOutput_({
    success: true,
    message: "Status ditemukan.",
    user: {
      id: admin.username,
      username: admin.username,
      bandName: admin.username,
      nama_anggota: admin.username,
      whatsapp: admin.username,
      createdAt: "",
      status: "ACTIVE"
    }
  });
}

function validateActiveAdmin_(payload) {
  const username = normalizeAdminUsername_(payload.username || payload.userId || payload.bandName || "");
  const password = String(payload.password || "").trim();
  if (!username) throw new Error("Login admin diperlukan.");

  const admin = password ? findAdminByUsernameForLogin_(username, password) : findAdminByUsername_(username);
  if (!admin) throw new Error("Admin tidak ditemukan.");
  if (normalizeAdminUsername_(admin.username) !== username) throw new Error("Data admin tidak cocok.");
  if (password && normalizeAdminPassword_(admin.password) !== normalizeAdminPassword_(password)) {
    throw new Error("Password admin tidak cocok.");
  }
  return {
    username: admin.username,
    password: admin.password,
    status: "ACTIVE"
  };
}


function findAdminByUsernameForLogin_(username, password) {
  const normalized = normalizeAdminUsername_(username);
  const normalizedPassword = normalizeAdminPassword_(password);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureAdminSheet_(ss);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    if (normalized === "admin") return { username: "admin", password: "admin" };
    if (normalized === "" && normalizedPassword === "") return { username: "", password: "" };
    return null;
  }

  const col = getSheetHeaderMap_(values[0]);
  const usernameIdx = col["username"];
  const passwordIdx = col["password"];
  if (usernameIdx === undefined || passwordIdx === undefined) return null;

  for (let i = 1; i < values.length; i++) {
    const rowUsername = normalizeAdminUsername_(String(values[i][usernameIdx] || ""));
    const rowPassword = normalizeAdminPassword_(String(values[i][passwordIdx] || ""));
    if (rowUsername === normalized && rowPassword === normalizedPassword) {
      return {
        username: String(values[i][usernameIdx] || "").trim(),
        password: String(values[i][passwordIdx] || "").trim()
      };
    }
  }
  return null;
}
function findAdminByUsername_(username) {
  const normalized = normalizeAdminUsername_(username);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureAdminSheet_(ss);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return normalized === "admin" ? { username: "admin", password: "admin" } : null;
  }
  const col = getSheetHeaderMap_(values[0]);
  const usernameIdx = col["username"];
  const passwordIdx = col["password"];
  if (usernameIdx === undefined || passwordIdx === undefined) return null;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const rowUsername = normalizeAdminUsername_(String(values[rowIndex][usernameIdx] || ""));
    if (rowUsername === normalized) {
      return {
        username: String(values[rowIndex][usernameIdx] || "").trim(),
        password: String(values[rowIndex][passwordIdx] || "").trim()
      };
    }
  }

  return normalized === "admin" ? { username: "admin", password: "admin" } : null;
}

function normalizeAdminUsername_(value) {
  return String(value || "").trim();
}

function normalizeAdminPassword_(value) {
  return String(value || "").trim();
}

function uploadBase64ImageToDrive_(base64, fileName, mimeType, folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const cleanBase64 = String(base64 || "").replace(/^data:.*;base64,/, "");
    const bytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);
    trySetPublicView_(file);
    return buildDriveImageUrl_(file.getId());
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    Logger.log("Drive upload failed: " + detail);
    throw new Error("Upload poster ke Drive gagal: " + detail);
  }
}

function buildDriveImageUrl_(fileId) {
  const id = String(fileId || "").trim();
  if (!id) return "";
  return "https://drive.google.com/thumbnail?id=" + id + "&sz=w2000";
}

function uploadBase64FileToDrive_(base64, fileName, mimeType, folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const cleanBase64 = String(base64 || "").replace(/^data:.*;base64,/, "");
    const bytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);
    trySetPublicView_(file);
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch (error) {
    Logger.log("Drive file upload failed: " + (error && error.message ? error.message : String(error)));
    throw new Error("Upload trailer ke Drive gagal.");
  }
}

function trySetPublicView_(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    Logger.log("Drive sharing skipped: " + (error && error.message ? error.message : String(error)));
  }
}

function getSheetHeaderMap_(headersRow) {
  const col = {};
  headersRow.forEach(function(header, index) {
    col[String(header || "").trim()] = index;
  });
  return col;
}

function getRowValueByHeader_(row, col, headerName) {
  if (!Object.prototype.hasOwnProperty.call(col, headerName)) return "";
  return row[col[headerName]];
}

function ensureSheetWithHeaders_(ss, sheetName, headers) {
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const mismatch = headers.some(function(header, index) {
      return String(currentHeaders[index] || "").trim() !== header;
    });
    if (mismatch) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

function ensureAdminSheet_(ss) {
  return ensureSheetWithHeaders_(ss, SHEET_ADMIN, ADMIN_HEADERS);
}

function readSheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(function(header) { return String(header).trim(); });
  return values.slice(1).map(function(row) {
    const item = {};
    headers.forEach(function(header, index) { item[header] = row[index]; });
    return item;
  });
}

function parseDateValue_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === "[object Date]") return value.getTime();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatDateValue_(value) {
  const timestamp = parseDateValue_(value);
  if (!timestamp) return "";
  return Utilities.formatDate(new Date(timestamp), "Asia/Jakarta", "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function incrementReportCount_(sheetName, idHeader, targetId, countHeader) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const col = getSheetHeaderMap_(values[0]);
  const idIdx = col[idHeader];
  const countIdx = col[countHeader];
  if (idIdx === undefined || countIdx === undefined) return;

  for (let r = 1; r < values.length; r++) {
    const rowId = String(values[r][idIdx] || "").trim();
    if (rowId === targetId) {
      const current = Number(values[r][countIdx] || 0);
      sheet.getRange(r + 1, countIdx + 1).setValue(current + 1);
      break;
    }
  }
}












