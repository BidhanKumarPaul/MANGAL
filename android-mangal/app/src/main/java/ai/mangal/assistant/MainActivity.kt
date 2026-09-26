package ai.mangal.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import ai.mangal.assistant.lifecycle.ModelMemoryLifecycleObserver
import ai.mangal.assistant.navigation.MangalNavHost
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

private val MangalDarkPalette = darkColorScheme()

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var modelMemoryLifecycleObserver: ModelMemoryLifecycleObserver

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(modelMemoryLifecycleObserver)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = MangalDarkPalette) {
                MangalNavHost()
            }
        }
    }

    override fun onDestroy() {
        lifecycle.removeObserver(modelMemoryLifecycleObserver)
        super.onDestroy()
    }
}
