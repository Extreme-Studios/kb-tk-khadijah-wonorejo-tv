package com.mugarutv.ui

import android.app.Activity
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

@Composable
fun rememberRewardedSubmissionGate(
    context: Context,
    adUnitId: String,
    preferenceName: String,
    cooldownKey: String,
    cooldownMs: Long
): RewardedSubmissionGate {
    val appContext = context.applicationContext
    return remember(context, adUnitId, preferenceName, cooldownKey, cooldownMs) {
        val prefs = appContext.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
        fun remainingCooldownMs(): Long {
            val now = System.currentTimeMillis()
            val last = prefs.getLong(cooldownKey, 0L)
            return (last + cooldownMs - now).coerceAtLeast(0L)
        }

        RewardedSubmissionGate(
            isAdLoading = false,
            remainingCooldownMs = { remainingCooldownMs() },
            ensureAdLoaded = {},
            show = { _: Activity?, onRewardEarned: () -> Unit, _: (String) -> Unit, onLoadingChanged: (Boolean) -> Unit ->
                onLoadingChanged(false)
                onRewardEarned()
            }
        )
    }
}

data class RewardedSubmissionGate(
    val isAdLoading: Boolean,
    val remainingCooldownMs: () -> Long,
    val ensureAdLoaded: () -> Unit,
    val show: (
        activity: Activity?,
        onRewardEarned: () -> Unit,
        onMessage: (String) -> Unit,
        onLoadingChanged: (Boolean) -> Unit
    ) -> Unit
)

const val PORTAL_REWARD_PREFERENCE_NAME = "portal_submission_gate"
const val HUB_REGISTER_REWARD_COOLDOWN_KEY = "last_hub_register_reward_at_ms"
const val HUB_LOGIN_REWARD_COOLDOWN_KEY = "last_hub_login_reward_at_ms"
const val PORTAL_POSTER_REWARD_COOLDOWN_KEY = "last_portal_poster_reward_at_ms"
const val SONG_REGISTRATION_REWARD_COOLDOWN_KEY = "last_song_registration_reward_at_ms"
const val WATCH_MOVIE_REWARD_COOLDOWN_KEY = "last_watch_movie_reward_at_ms"
const val PORTAL_REWARD_COOLDOWN_MS = 5 * 60 * 1000L
const val ADMOB_APP_ID = ""
const val BANNER_AD_UNIT_ID = ""
const val APP_OPEN_AD_UNIT_ID = ""
const val REWARD_AD_UNIT_ID = ""
