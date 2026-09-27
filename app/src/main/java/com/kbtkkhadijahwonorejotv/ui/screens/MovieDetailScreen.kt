package com.kbtkkhadijahwonorejotv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kbtkkhadijahwonorejotv.data.model.Song
import com.kbtkkhadijahwonorejotv.ui.components.SongCover
import kotlinx.coroutines.launch

@Composable
fun MovieDetailScreen(
    movie: Song,
    modifier: Modifier = Modifier,
    canEditMetadata: Boolean = false,
    onWatchFilm: (String) -> Unit,
    onSaveMetadata: suspend (String, String, String) -> Result<Unit> = { _, _, _ -> Result.success(Unit) },
    onMetadataSaved: (String, String, String) -> Unit = { _, _, _ -> },
    onDeleteFilm: suspend () -> Result<Unit> = { Result.success(Unit) },
    onFilmDeleted: () -> Unit = {}
) {
    val youtubeUrl = movie.youtubeUrl.ifBlank { movie.movieUrl }
    val scope = rememberCoroutineScope()
    var showEditDialog by remember { mutableStateOf(false) }
    var editTitle by remember(movie.id) { mutableStateOf(movie.title) }
    var editYear by remember(movie.id) { mutableStateOf(movie.year) }
    var editDescription by remember(movie.id) { mutableStateOf(movie.synopsis.ifBlank { movie.description }) }
    var editError by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(movie.id, showEditDialog) {
        if (showEditDialog && canEditMetadata) {
            editTitle = movie.title
            editYear = movie.year
            editDescription = movie.synopsis.ifBlank { movie.description }
            editError = null
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(420.dp)
            ) {
                SongCover(
                    song = movie,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, MaterialTheme.colorScheme.background),
                                startY = 420f
                            )
                        )
                )
                Button(
                    onClick = { if (youtubeUrl.isNotBlank()) onWatchFilm(youtubeUrl) },
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 18.dp, start = 20.dp, end = 20.dp)
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    enabled = youtubeUrl.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("Play", fontWeight = FontWeight.Bold)
                }
                if (canEditMetadata) {
                    Column(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        IconButton(onClick = { showEditDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Edit metadata",
                                tint = Color.White
                            )
                        }
                        IconButton(onClick = { showDeleteConfirm = true }) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Hapus video",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }
        }
        item {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp).padding(top = 8.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    tonalElevation = 2.dp,
                    shadowElevation = 4.dp,
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = movie.title,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (movie.year.isNotBlank()) {
                            Text(
                                text = movie.year,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        if (movie.views > 0 || movie.likes > 0) {
                            Text(
                                text = "${movie.views} views  â€¢  ${movie.likes} likes",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Deskripsi",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = movie.synopsis.ifBlank { "Tidak ada deskripsi tersedia." },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 24.sp
                    )
                }

                Button(
                    onClick = { if (youtubeUrl.isNotBlank()) onWatchFilm(youtubeUrl) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .navigationBarsPadding(),
                    shape = RoundedCornerShape(14.dp),
                    enabled = youtubeUrl.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    androidx.compose.material3.Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null
                    )
                    Spacer(Modifier.size(8.dp))
                    Text("Play", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (showEditDialog && canEditMetadata) {
        AlertDialog(
            onDismissRequest = { if (!isSaving) showEditDialog = false },
            title = { Text("Edit Video") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = editTitle,
                        onValueChange = {
                            editTitle = it
                            editError = null
                        },
                        label = { Text("Judul") },
                        singleLine = true,
                        enabled = !isSaving
                    )
                    OutlinedTextField(
                        value = editYear,
                        onValueChange = { editYear = it },
                        label = { Text("Tahun") },
                        singleLine = true,
                        enabled = !isSaving
                    )
                    OutlinedTextField(
                        value = editDescription,
                        onValueChange = { editDescription = it },
                        label = { Text("Deskripsi") },
                        minLines = 4,
                        enabled = !isSaving
                    )
                    editError?.let {
                        Text(
                            text = it,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val normalizedTitle = editTitle.trim()
                        if (normalizedTitle.isBlank()) {
                            editError = "Judul wajib diisi."
                            return@TextButton
                        }
                        scope.launch {
                            isSaving = true
                            val result = onSaveMetadata(normalizedTitle, editYear.trim(), editDescription.trim())
                            isSaving = false
                            result.onSuccess {
                                showEditDialog = false
                                onMetadataSaved(normalizedTitle, editYear.trim(), editDescription.trim())
                            }.onFailure { error ->
                                editError = error.message ?: "Gagal menyimpan metadata."
                            }
                        }
                    },
                    enabled = !isSaving
                ) {
                    Text(if (isSaving) "Menyimpan..." else "Simpan")
                }
            },
            dismissButton = {
                TextButton(onClick = { if (!isSaving) showEditDialog = false }, enabled = !isSaving) {
                    Text("Batal")
                }
            }
        )
    }
    if (showDeleteConfirm && canEditMetadata) {
        AlertDialog(
            onDismissRequest = { if (!isSaving) showDeleteConfirm = false },
            title = { Text("Hapus Video") },
            text = { Text("Yakin ingin menghapus video ini?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            isSaving = true
                            val result = onDeleteFilm()
                            isSaving = false
                            result.onSuccess {
                                showDeleteConfirm = false
                                showEditDialog = false
                                onFilmDeleted()
                            }.onFailure { error ->
                                showDeleteConfirm = false
                                editError = error.message ?: "Gagal menghapus film."
                            }
                        }
                    },
                    enabled = !isSaving
                ) {
                    Text(if (isSaving) "Menghapus..." else "Hapus")
                }
            },
            dismissButton = {
                TextButton(onClick = { if (!isSaving) showDeleteConfirm = false }, enabled = !isSaving) {
                    Text("Batal")
                }
            }
        )
    }
}

