package ai.mangal.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import ai.mangal.assistant.lifecycle.ModelMemoryLifecycleObserver
import ai.mangal.assistant.navigation.MangalNavHost
import ai.mangal.assistant.ui.theme.MangalTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var modelMemoryLifecycleObserver: ModelMemoryLifecycleObserver

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(modelMemoryLifecycleObserver)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.parseColor("#0B0F17")),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.parseColor("#090D14"))
        )
        setContent {
            MangalTheme {
                MangalNavHost()
            }
        }
    }
}
