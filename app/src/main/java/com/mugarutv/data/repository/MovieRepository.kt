package com.mugarutv.data.repository

import com.mugarutv.data.model.Song

class MovieRepository(
    private val api: ApiSongRepository = ApiSongRepository()
) {
    suspend fun fetchMovies(): Result<List<Song>> = api.fetchSongs()
}

