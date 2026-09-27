package com.kbtkkhadijahwonorejotv.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val NuLightColorScheme = lightColorScheme(
    primary = NuGreenPrimary,
    onPrimary = Color.White,
    primaryContainer = NuGreenLight,
    onPrimaryContainer = NuGreenDark,
    secondary = NuGoldAccent,
    onSecondary = Color.Black,
    background = BackgroundWhite,
    onBackground = TextMain,
    surface = Color.White,
    onSurface = TextMain,
    surfaceVariant = Color(0xFFF0F7E9),
    onSurfaceVariant = TextSubtle,
    outline = OutlineLight,
    error = ErrorColor
)

@Composable
fun KbTkKhadijahWonorejoTvTheme(
    @Suppress("UNUSED_PARAMETER") darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = NuLightColorScheme,
        typography = Typography,
        content = content
    )
}

val MaterialTheme.success: Color
    @Composable
    get() = SuccessColor
