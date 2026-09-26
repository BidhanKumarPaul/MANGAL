package ai.mangal.data.di

import android.content.Context
import android.util.Base64
import androidx.room.Room
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import ai.mangal.data.db.ChatDao
import ai.mangal.data.db.MangalDatabase
import ai.mangal.data.db.ModelDao
import ai.mangal.data.db.SettingsDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import java.security.SecureRandom
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    private const val PREFS_FILE = "mangal_secure_keystore_prefs"
    private const val KEY_DB_PASSPHRASE = "sqlcipher_db_passphrase"

    @Provides
    @Singleton
    fun provideMangalDatabase(
        @ApplicationContext context: Context
    ): MangalDatabase {
        System.loadLibrary("sqlcipher")
        val passphraseBytes = getOrCreateDatabasePassphrase(context)
        val factory = SupportOpenHelperFactory(passphraseBytes)

        return Room.databaseBuilder(
            context,
            MangalDatabase::class.java,
            "mangal_encrypted.db"
        )
            .openHelperFactory(factory)
            .fallbackToDestructiveMigration()
            .build()
    }

    private fun getOrCreateDatabasePassphrase(context: Context): ByteArray {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        val sharedPrefs = EncryptedSharedPreferences.create(
            context,
            PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        val existing = sharedPrefs.getString(KEY_DB_PASSPHRASE, null)
        if (existing != null) {
            return Base64.decode(existing, Base64.NO_WRAP)
        }

        val randomBytes = ByteArray(32)
        SecureRandom().nextBytes(randomBytes)
        val encoded = Base64.encodeToString(randomBytes, Base64.NO_WRAP)
        sharedPrefs.edit().putString(KEY_DB_PASSPHRASE, encoded).apply()
        return randomBytes
    }

    @Provides
    fun provideChatDao(db: MangalDatabase): ChatDao = db.chatDao()

    @Provides
    fun provideModelDao(db: MangalDatabase): ModelDao = db.modelDao()

    @Provides
    fun provideSettingsDao(db: MangalDatabase): SettingsDao = db.settingsDao()
}
