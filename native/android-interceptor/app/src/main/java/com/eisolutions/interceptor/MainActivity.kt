package com.eisolutions.interceptor

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dagger.hilt.android.AndroidEntryPoint

/**
 * MainActivity
 * ------------
 * Onboarding screen shown on first launch. Walks the staff through:
 *   1. Enable Accessibility Service
 *   2. Grant "Display over other apps" (SYSTEM_ALERT_WINDOW)
 *   3. Sign in with the same staff credentials used in the main IPPB APK
 *   4. Verify retailer PC agent is online
 *
 * After all four green ticks, the service runs in the background. The
 * activity becomes a status / log viewer.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(Modifier.fillMaxSize()) {
                    OnboardingScreen(
                        onOpenAccessibility = {
                            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                        },
                        onOpenOverlay = {
                            startActivity(Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:$packageName"),
                            ))
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun OnboardingScreen(
    onOpenAccessibility: () -> Unit,
    onOpenOverlay: () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().padding(24.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.Start,
    ) {
        Text("EI SOLUTIONS — Biometric Interceptor", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(4.dp))
        Text(
            "ഏതൊരു IPPB / CSC ആപ്പിലെ fingerprint request-ഉം retailer-ന്റെ PC-യിലേക്ക് redirect ചെയ്യും.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(24.dp))

        StepCard(
            number = 1,
            title = "Accessibility Service ഓൺ ചെയ്യുക",
            body = "Settings → Accessibility → EI SOLUTIONS Interceptor → ഓൺ.",
            cta = "Accessibility Settings തുറക്കുക",
            onClick = onOpenAccessibility,
        )
        Spacer(Modifier.height(12.dp))
        StepCard(
            number = 2,
            title = "Display over other apps",
            body = "\"Capturing on PC…\" എന്ന overlay കാണിക്കാൻ ഈ permission വേണം.",
            cta = "Overlay permission ഗ്രാന്റ് ചെയ്യുക",
            onClick = onOpenOverlay,
        )
        Spacer(Modifier.height(12.dp))
        StepCard(
            number = 3,
            title = "Staff login",
            body = "Main IPPB APK-ൽ ഉപയോഗിക്കുന്ന അതേ staff email + password ഇടുക.",
            cta = "Sign in",
            onClick = { /* delegated to AuthScreen */ },
        )
        Spacer(Modifier.height(12.dp))
        StepCard(
            number = 4,
            title = "Retailer PC agent online ആണോ?",
            body = "Retailer-ന്റെ Windows PC-യിൽ EI SOLUTIONS IPPB Agent run ചെയ്യുന്നുണ്ടോ എന്ന് ഉറപ്പാക്കുക.",
            cta = "Status check",
            onClick = { /* triggers heartbeat */ },
        )
    }
}

@Composable
private fun StepCard(number: Int, title: String, body: String, cta: String, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text("$number. $title", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(body, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(8.dp))
            Button(onClick = onClick) { Text(cta) }
        }
    }
}
