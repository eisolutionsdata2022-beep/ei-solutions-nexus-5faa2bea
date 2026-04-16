package com.eisolutions.ippb.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val EiNavy = Color(0xFF0D2A5C)
private val EiSaffron = Color(0xFFFF9933)
private val EiGreen = Color(0xFF138808)

private val LightColors = lightColorScheme(
    primary = EiNavy, secondary = EiSaffron, tertiary = EiGreen,
)
private val DarkColors = darkColorScheme(
    primary = EiNavy, secondary = EiSaffron, tertiary = EiGreen,
)

@Composable
fun EISolutionsTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(colorScheme = colors, content = content)
}
