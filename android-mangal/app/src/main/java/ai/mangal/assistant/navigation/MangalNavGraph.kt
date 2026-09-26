package ai.mangal.assistant.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import ai.mangal.assistant.ui.chat.VoiceChatScreen
import ai.mangal.assistant.ui.models.ModelManagerScreen
import ai.mangal.assistant.ui.settings.SettingsScreen

enum class MangalDestination(val route: String, val label: String) {
    VOICE_CHAT("voice_chat", "Assistant"),
    MODEL_MANAGER("model_manager", "Models"),
    SETTINGS("settings", "Settings")
}

@Composable
fun MangalNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                MangalDestination.entries.forEach { dest ->
                    NavigationBarItem(
                        selected = currentRoute == dest.route,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {},
                        label = { Text(dest.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MangalDestination.VOICE_CHAT.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(MangalDestination.VOICE_CHAT.route) {
                VoiceChatScreen()
            }
            composable(MangalDestination.MODEL_MANAGER.route) {
                ModelManagerScreen()
            }
            composable(MangalDestination.SETTINGS.route) {
                SettingsScreen()
            }
        }
    }
}
