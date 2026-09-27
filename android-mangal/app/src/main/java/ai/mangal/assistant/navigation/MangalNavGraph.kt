package ai.mangal.assistant.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import ai.mangal.assistant.ui.chat.VoiceChatScreen
import ai.mangal.assistant.ui.custom.CustomModelScreen
import ai.mangal.assistant.ui.models.ModelManagerScreen
import ai.mangal.assistant.ui.settings.SettingsScreen
import ai.mangal.assistant.ui.theme.MangalAmberPrimary
import ai.mangal.assistant.ui.theme.MangalCardSurface
import ai.mangal.assistant.ui.theme.MangalObsidianBg
import ai.mangal.assistant.ui.theme.MangalTextPrimary
import ai.mangal.assistant.ui.theme.MangalTextSecondary

enum class MangalDestination(val route: String, val label: String, val badgeSymbol: String) {
    VOICE_CHAT("voice_chat", "Assistant", "MIC"),
    MODEL_MANAGER("model_manager", "Models", "AI"),
    CUSTOM_MODEL("custom_model", "Custom GGUF", "+"),
    SETTINGS("settings", "Settings", "CFG")
}

@Composable
fun MangalNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: MangalDestination.VOICE_CHAT.route

    Scaffold(
        containerColor = MangalObsidianBg,
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF080B11),
                contentColor = MangalTextPrimary,
                tonalElevation = 8.dp
            ) {
                MangalDestination.entries.forEach { dest ->
                    val isSelected = currentRoute == dest.route
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Box(
                                modifier = Modifier
                                    .size(26.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (isSelected) MangalAmberPrimary else MangalCardSurface
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = dest.badgeSymbol,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color(0xFF090D14) else MangalTextSecondary
                                )
                            }
                        },
                        label = {
                            Text(
                                text = dest.label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color(0xFF090D14),
                            selectedTextColor = MangalAmberPrimary,
                            indicatorColor = Color(0xFF23190B),
                            unselectedIconColor = MangalTextSecondary,
                            unselectedTextColor = MangalTextSecondary
                        )
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
                VoiceChatScreen(
                    onOpenModelsTab = {
                        navController.navigate(MangalDestination.MODEL_MANAGER.route)
                    },
                    onOpenCustomModelTab = {
                        navController.navigate(MangalDestination.CUSTOM_MODEL.route)
                    }
                )
            }
            composable(MangalDestination.MODEL_MANAGER.route) {
                ModelManagerScreen(
                    onOpenCustomModelTab = {
                        navController.navigate(MangalDestination.CUSTOM_MODEL.route)
                    }
                )
            }
            composable(MangalDestination.CUSTOM_MODEL.route) {
                CustomModelScreen()
            }
            composable(MangalDestination.SETTINGS.route) {
                SettingsScreen()
            }
        }
    }
}
