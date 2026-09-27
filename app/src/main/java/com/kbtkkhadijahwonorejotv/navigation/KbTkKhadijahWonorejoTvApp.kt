package com.kbtkkhadijahwonorejotv.navigation

import android.app.Activity
import android.content.res.Configuration
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.kbtkkhadijahwonorejotv.data.local.PortalSessionStore
import com.kbtkkhadijahwonorejotv.R
import com.kbtkkhadijahwonorejotv.data.local.PlaylistLocalStore
import com.kbtkkhadijahwonorejotv.data.model.PortalPost
import com.kbtkkhadijahwonorejotv.data.model.Song
import com.kbtkkhadijahwonorejotv.data.repository.ApiSongRepository
import com.kbtkkhadijahwonorejotv.data.repository.PortalRepository
import com.kbtkkhadijahwonorejotv.data.repository.PlaylistRepository
import com.kbtkkhadijahwonorejotv.data.repository.SCHOOL_YOUTUBE_CHANNEL_URL
import com.kbtkkhadijahwonorejotv.data.repository.SCHOOL_YOUTUBE_CHANNEL_ID
import com.kbtkkhadijahwonorejotv.data.repository.SongRegistrationRepository
import com.kbtkkhadijahwonorejotv.ui.screens.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

sealed class AppScreen(val route: String, val label: String, val icon: ImageVector) {
    data object Home : AppScreen("home", "Beranda", Icons.Default.Home)
    data object Library : AppScreen("library", "Koleksi", Icons.AutoMirrored.Filled.List)
    data object Live : AppScreen("live", "Live", Icons.Default.PlayArrow)
    data object PortalKita : AppScreen("portal_kita", "Board Info", Icons.Default.Info)
    data object About : AppScreen("about", "Profil", Icons.Default.AccountCircle)
}

@Composable
fun KbTkKhadijahWonorejoTvApp(repository: ApiSongRepository = ApiSongRepository()) {
    val context = LocalContext.current
    val activity = context as? Activity
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val playlistRepository = remember { PlaylistRepository(PlaylistLocalStore(context)) }
    val portalRepository = remember { PortalRepository() }
    val registrationRepository = remember { SongRegistrationRepository() }
    val portalSessionStore = remember { PortalSessionStore(context) }
    val portalSession by portalSessionStore.sessionFlow.collectAsState(initial = null)

    val tabs = listOf(
        AppScreen.Home,
        AppScreen.Library,
        AppScreen.Live,
        AppScreen.PortalKita,
        AppScreen.About
    )
    var currentTab by remember { mutableStateOf<AppScreen>(AppScreen.Home) }
    val tabHistory = remember { mutableStateListOf<AppScreen>().apply { add(AppScreen.Home) } }
    var selectedArtist by remember { mutableStateOf<String?>(null) }
    var selectedAlbum by remember { mutableStateOf<Pair<String, String>?>(null) }
    var playingMovie by remember { mutableStateOf<Song?>(null) }
    var selectedPortalPost by remember { mutableStateOf<PortalPost?>(null) }
    var showPortalSubmission by remember { mutableStateOf(false) }
    var songs by remember { mutableStateOf<List<Song>>(emptyList()) }
    var isLoadingSongs by remember { mutableStateOf(true) }
    var isRefreshingSongs by remember { mutableStateOf(false) }
    var songsError by remember { mutableStateOf<String?>(null) }
    var activeLive by remember { mutableStateOf<Song?>(null) }
    var isLoadingLive by remember { mutableStateOf(false) }
    var liveError by remember { mutableStateOf<String?>(null) }
    val librarySongs = remember(songs) { songs.filter { it.sourceChannelId == SCHOOL_YOUTUBE_CHANNEL_ID } }
    val libraryGenres = remember(librarySongs) { repository.getGenres(librarySongs) }
    val artists = remember(songs) { repository.getArtists(songs) }
    val playlists by playlistRepository.playlists.collectAsState(initial = emptyList())
    var portalPosts by remember { mutableStateOf<List<PortalPost>>(emptyList()) }
    var isLoadingPortal by remember { mutableStateOf(true) }
    var portalError by remember { mutableStateOf<String?>(null) }
    val portalCategories = remember { portalRepository.getCategories() }
    val configuration = LocalConfiguration.current
    val isPlayerLandscapeFullscreen = playingMovie != null && configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    fun navigateTo(screen: AppScreen) {
        selectedArtist = null
        selectedAlbum = null
        playingMovie = null
        selectedPortalPost = null
        showPortalSubmission = false
        if (currentTab != screen) {
            currentTab = screen
            tabHistory.add(screen)
        }
    }

    fun refreshSongs(showBlocking: Boolean) = scope.launch {
        if (showBlocking) isLoadingSongs = true else isRefreshingSongs = true
        val activeLikeUserId = portalSession?.username
        repository.fetchSongs(activeLikeUserId, forceRefresh = true) { partialSongs ->
            songs = partialSongs
        }.onSuccess { apiSongs ->
            songs = apiSongs
            songsError = null
        }.onFailure { err ->
            songsError = err.message ?: "Gagal memuat data."
        }
        isLoadingSongs = false
        isRefreshingSongs = false
    }

    fun openSong(song: Song) {
        playingMovie = song
        scope.launch {
            repository.updateFilmView(song.id, song.youtubeUrl.ifBlank { song.movieUrl })
            refreshSongs(false)
        }
    }

    fun refreshPortalPosts(showBlocking: Boolean = true) {
        scope.launch {
            if (showBlocking) isLoadingPortal = true
            portalRepository.fetchActivePosts().onSuccess { posts ->
                portalPosts = posts
                portalError = null
            }.onFailure { error ->
                portalError = error.message ?: "Gagal memuat Board Info."
            }
            isLoadingPortal = false
        }
    }

    fun refreshActiveLive() {
        scope.launch {
            isLoadingLive = true
            liveError = null
            repository.fetchActiveLive().onSuccess { live ->
                activeLive = live
            }.onFailure { error ->
                activeLive = null
                liveError = error.message ?: "Gagal memeriksa siaran langsung."
            }
            isLoadingLive = false
        }
    }

    LaunchedEffect(currentTab, playingMovie) {
        if (currentTab == AppScreen.Live && playingMovie == null) refreshActiveLive()
    }

    LaunchedEffect(Unit) {
        val initialSongLoad = refreshSongs(showBlocking = true)
        refreshPortalPosts(showBlocking = true)
        initialSongLoad.join()

        if (SongRegistrationRepository.GOOGLE_APPS_SCRIPT_ENDPOINT.startsWith("http")) {
            val prefs = context.getSharedPreferences("school_channel_sync_prefs", android.content.Context.MODE_PRIVATE)
            val lastSync = prefs.getLong("last_channel_sync_time", 0L)
            val now = System.currentTimeMillis()
            if (now - lastSync > 6 * 60 * 60 * 1000L) {
                registrationRepository.importYoutubeChannel(SCHOOL_YOUTUBE_CHANNEL_URL)
                    .onSuccess {
                        prefs.edit().putLong("last_channel_sync_time", now).apply()
                        refreshSongs(showBlocking = false)
                    }
                    .onFailure { error ->
                        android.util.Log.e("SchoolChannelSync", "Failed to sync channel", error)
                    }
            }
        }
    }

    BackHandler {
        when {
            playingMovie != null -> playingMovie = null
            showPortalSubmission -> showPortalSubmission = false
            selectedPortalPost != null -> selectedPortalPost = null
            selectedAlbum != null -> selectedAlbum = null
            selectedArtist != null -> selectedArtist = null
            tabHistory.size > 1 -> {
                tabHistory.removeAt(tabHistory.lastIndex)
                currentTab = tabHistory.last()
            }
            else -> activity?.moveTaskToBack(true)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            bottomBar = {
                if (!isPlayerLandscapeFullscreen) {
                    Column {
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.surface,
                        tonalElevation = 4.dp
                    ) {
                        tabs.forEach { screen ->
                            NavigationBarItem(
                                selected = currentTab == screen,
                                onClick = { navigateTo(screen) },
                                icon = { Icon(screen.icon, contentDescription = screen.label) },
                                label = { Text(screen.label, fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = MaterialTheme.colorScheme.primary,
                                    selectedTextColor = MaterialTheme.colorScheme.primary,
                                    unselectedIconColor = MaterialTheme.colorScheme.outline,
                                    unselectedTextColor = MaterialTheme.colorScheme.outline,
                                    indicatorColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                )
                            )
                        }
                    }
                    }
                }
            }
        ) { innerPadding ->
            val modifier = if (isPlayerLandscapeFullscreen) Modifier else Modifier.padding(innerPadding)

            when {
            playingMovie != null -> {
                val movie = playingMovie!!
                VideoPlayerScreen(
                    title = movie.title,
                    rawUrl = movie.youtubeUrl.ifBlank { movie.movieUrl },
                    year = movie.year,
                    description = movie.synopsis.ifBlank { movie.description },
                    modifier = modifier,
                    onBack = { playingMovie = null }
                )
            }
            showPortalSubmission -> {
                PortalPosterSubmissionScreen(
                    modifier = modifier,
                    onBack = { showPortalSubmission = false },
                    onSubmitted = { showPortalSubmission = false; refreshPortalPosts(true) }
                )
            }
            selectedPortalPost != null -> {
                PortalPostDetailScreen(post = selectedPortalPost!!, modifier = modifier, onBack = { selectedPortalPost = null })
            }
            selectedAlbum != null -> {
                AlbumDetailScreen(
                    artistName = selectedAlbum!!.first,
                    albumName = selectedAlbum!!.second,
                    songs = songs,
                    modifier = modifier,
                    onBack = { selectedAlbum = null },
                    onSongClick = { openSong(it) }
                )
            }
            selectedArtist != null -> {
                ArtistDetailScreen(
                    artistName = selectedArtist!!,
                    songs = songs,
                    errorMessage = songsError,
                    modifier = modifier,
                    onBack = { selectedArtist = null },
                    onSongClick = { openSong(it) },
                    onAlbumClick = { selectedAlbum = selectedArtist!! to it }
                )
            }
            else -> when (currentTab) {
                AppScreen.Home -> HomeScreen(
                    songs = songs,
                    artists = artists,
                    errorMessage = songsError,
                    isLoading = isLoadingSongs,
                    isRefreshing = isRefreshingSongs,
                    onRefresh = { refreshSongs(false) },
                    modifier = modifier,
                    onSongClick = { openSong(it) },
                    onArtistClick = { selectedArtist = it }
                )
                AppScreen.Library -> LibraryScreen(
                    songs = librarySongs,
                    genres = libraryGenres,
                    playlists = playlists,
                    errorMessage = songsError,
                    isLoading = isLoadingSongs,
                    isRefreshing = isRefreshingSongs,
                    onRefresh = { refreshSongs(false) },
                    modifier = modifier,
                    onSongClick = { openSong(it) },
                    onArtistClick = { selectedArtist = it },
                    onAddSongToPlaylist = { pId, sId -> scope.launch { playlistRepository.addSongToPlaylist(pId, sId) } },
                    canLike = false
                )
                AppScreen.Live -> LiveStreamListScreen(
                    activeLive = activeLive,
                    modifier = modifier,
                    isLoading = isLoadingLive,
                    errorMessage = liveError,
                    onRefresh = { refreshActiveLive() },
                    onOpenLive = { song -> playingMovie = song }
                )
                AppScreen.PortalKita -> PortalKitaScreen(
                    posts = portalPosts,
                    categories = portalCategories,
                    isLoading = isLoadingPortal,
                    errorMessage = portalError,
                    modifier = modifier,
                    onRefresh = { refreshPortalPosts(true) },
                    onPostPreview = { selectedPortalPost = it },
                    onOpenPosterSubmission = { showPortalSubmission = true }
                )
                AppScreen.About -> AboutScreen(modifier = modifier)
            }
            }
        }

    }
}


