package com.mugarutv

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.mugarutv.navigation.MugaruTvApp
import com.mugarutv.ui.theme.MugaruTvTheme
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
            MugaruTvTheme {
                var splashFinished by remember { mutableStateOf(false) }
                if (!splashFinished) {
                    AppSplashScreen(onFinish = { splashFinished = true })
                } else {
                    MugaruTvApp()
                }
            }
        }
    }
}

@Composable
fun AppSplashScreen(onFinish: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(2200)
        onFinish()
    }
    val versionName = "Version ${BuildConfig.VERSION_NAME}"
    val loadingTransition = rememberInfiniteTransition(label = "splash-loading")
    val loadingPulse = loadingTransition.animateFloat(
        initialValue = 0.25f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "loading-pulse"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.White, Color(0xFFEEF2F9))
                )
            )
    ) {
        Image(
            painter = painterResource(id = R.drawable.splash),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Fit
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Powered By Extreme Studios",
                style = MaterialTheme.typography.titleSmall,
                color = Color.Black,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(3) { index ->
                    val pulse = when (index) {
                        0 -> loadingPulse.value
                        1 -> 0.35f + (loadingPulse.value * 0.5f)
                        else -> 0.25f + (loadingPulse.value * 0.75f)
                    }
                    Box(
                        modifier = Modifier
                            .size(9.dp)
                            .background(
                                Color.Black.copy(alpha = pulse.coerceIn(0.2f, 1f)),
                                CircleShape
                            )
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = versionName,
                fontSize = 12.sp,
                color = Color.Black.copy(alpha = 0.85f),
                textAlign = TextAlign.Center
            )
        }
    }
}
