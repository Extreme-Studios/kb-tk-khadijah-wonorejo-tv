package com.kbtkkhadijahwonorejotv

import android.app.Application
import com.kbtkkhadijahwonorejotv.updates.ContentUpdateScheduler

class KbTkKhadijahWonorejoTvApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ContentUpdateScheduler.ensureScheduled(this)
    }
}
