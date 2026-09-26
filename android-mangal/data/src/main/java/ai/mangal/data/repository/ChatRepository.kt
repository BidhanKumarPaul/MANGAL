package ai.mangal.data.repository

import ai.mangal.data.db.ChatDao
import ai.mangal.data.db.ChatMessageEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val chatDao: ChatDao
) {
    fun observeSessionMessages(sessionId: String): Flow<List<ChatMessageEntity>> {
        return chatDao.observeMessages(sessionId)
    }

    suspend fun appendMessage(
        sessionId: String,
        role: String,
        content: String,
        toolName: String? = null,
        toolPayloadJson: String? = null
    ): Long {
        return chatDao.insertMessage(
            ChatMessageEntity(
                sessionId = sessionId,
                role = role,
                content = content,
                toolName = toolName,
                toolPayloadJson = toolPayloadJson
            )
        )
    }

    suspend fun clearConversationMemory() {
        chatDao.clearAllHistory()
    }
}
