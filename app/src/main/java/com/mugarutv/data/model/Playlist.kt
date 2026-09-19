package com.mugarutv.data.model

data class Playlist(
    val id: String,
    val name: String,
    val songIds: List<String>
)
