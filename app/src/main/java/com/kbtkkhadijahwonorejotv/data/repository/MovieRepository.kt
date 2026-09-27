package com.kbtkkhadijahwonorejotv.data.repository

import com.kbtkkhadijahwonorejotv.data.model.Song

class MovieRepository(
    private val api: ApiSongRepository = ApiSongRepository()
) {
    suspend fun fetchMovies(): Result<List<Song>> = api.fetchSongs()
}

