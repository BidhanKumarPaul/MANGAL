package ai.mangal.core.llm.di

import ai.mangal.core.llm.LlamaCppEngineImpl
import ai.mangal.core.llm.LlmEngine
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class LlmModule {
    @Binds
    @Singleton
    abstract fun bindLlmEngine(impl: LlamaCppEngineImpl): LlmEngine
}
