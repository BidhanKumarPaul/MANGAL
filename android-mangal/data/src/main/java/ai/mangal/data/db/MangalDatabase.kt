package ai.mangal.data.db

import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val role: String, // "user" | "assistant" | "tool"
    val content: String,
    val toolName: String? = null,
    val toolPayloadJson: String? = null,
    val timestampEpochMs: Long = System.currentTimeMillis()
)

@Entity(tableName = "local_models")
data class LocalModelEntity(
    @PrimaryKey val modelId: String,
    val displayName: String,
    val category: String, // "LLM_GGUF" | "STT_WHISPER" | "CUSTOM_GGUF"
    val quantization: String,
    val fileSizeBytes: Long,
    val requiredRamMb: Int,
    val sha256Checksum: String,
    val localFilePath: String?,
    val isActive: Boolean = false
)

@Entity(tableName = "app_settings")
data class AppSettingEntity(
    @PrimaryKey val settingKey: String,
    val settingValue: String
)

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE sessionId = :sessionId ORDER BY timestampEpochMs ASC")
    fun observeMessages(sessionId: String): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: ChatMessageEntity): Long

    @Query("DELETE FROM chat_messages")
    suspend fun clearAllHistory()
}

@Dao
interface ModelDao {
    @Query("SELECT * FROM local_models ORDER BY isActive DESC, category ASC, requiredRamMb ASC")
    fun observeAllModels(): Flow<List<LocalModelEntity>>

    @Query("SELECT COUNT(*) FROM local_models")
    suspend fun countModels(): Int

    @Query("UPDATE local_models SET isActive = 0 WHERE category = :category")
    suspend fun deactivateCategory(category: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertModel(model: LocalModelEntity)

    @Query("DELETE FROM local_models WHERE modelId = :modelId")
    suspend fun deleteModelById(modelId: String)
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM app_settings")
    fun observeAllSettings(): Flow<List<AppSettingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setSetting(setting: AppSettingEntity)
}

@Database(
    entities = [
        ChatMessageEntity::class,
        LocalModelEntity::class,
        AppSettingEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class MangalDatabase : RoomDatabase() {
    abstract fun chatDao(): ChatDao
    abstract fun modelDao(): ModelDao
    abstract fun settingsDao(): SettingsDao
}
