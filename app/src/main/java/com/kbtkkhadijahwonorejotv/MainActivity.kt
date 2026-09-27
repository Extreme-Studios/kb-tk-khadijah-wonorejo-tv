package com.kbtkkhadijahwonorejotv

import android.graphics.Color as AndroidColor
import android.os.Bundle
import android.view.LayoutInflater
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.kbtkkhadijahwonorejotv.navigation.KbTkKhadijahWonorejoTvApp
import com.kbtkkhadijahwonorejotv.ui.theme.KbTkKhadijahWonorejoTvTheme
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.DKGRAY),
            navigationBarStyle = SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.DKGRAY)
        )
        setContent {
            KbTkKhadijahWonorejoTvTheme {
                var splashFinished by remember { mutableStateOf(false) }
                if (!splashFinished) {
                    AppSplashScreen(onFinish = { splashFinished = true })
                } else {
                    KbTkKhadijahWonorejoTvApp()
                }
            }
        }
    }
}

@Composable
fun AppSplashScreen(onFinish: () -> Unit) {
    val context = LocalContext.current
    var firstFrameRendered by remember { mutableStateOf(false) }
    val splashPlayer = remember(context) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri("android.resource://${context.packageName}/${R.raw.school_splash}"))
            volume = 0f
            prepare()
            playWhenReady = true
        }
    }
    DisposableEffect(splashPlayer) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) onFinish()
            }

            override fun onPlayerError(error: PlaybackException) {
                onFinish()
            }

            override fun onRenderedFirstFrame() {
                firstFrameRendered = true
            }
        }
        splashPlayer.addListener(listener)
        onDispose {
            splashPlayer.removeListener(listener)
            splashPlayer.release()
        }
    }
    LaunchedEffect(Unit) {
        delay(6000)
        onFinish()
    }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFFF8FCF4), Color(0xFFE6F5E8), Color(0xFFFFFDEB))
                )
            )
    ) {
        Image(
            painter = painterResource(R.drawable.school_splash_first_frame),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        AndroidView(
            modifier = Modifier.fillMaxSize().alpha(if (firstFrameRendered) 1f else 0f),
            factory = { viewContext ->
                (LayoutInflater.from(viewContext)
                    .inflate(R.layout.school_splash_player, null) as PlayerView).apply {
                    player = splashPlayer
                    setShutterBackgroundColor(AndroidColor.TRANSPARENT)
                }
            }
        )
    }
}
