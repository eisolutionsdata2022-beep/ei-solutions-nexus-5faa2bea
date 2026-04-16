package com.eisolutions.interceptor.service

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * InjectionEngine
 * ---------------
 * Writes a captured PID XML payload back into the source third-party
 * app's input field. Two strategies, in order:
 *
 *   1. Direct AccessibilityNodeInfo.ACTION_SET_TEXT — works on most
 *      modern apps with regular EditText views.
 *   2. Clipboard substitution + ACTION_PASTE — fallback for hardened or
 *      WebView-based apps (CSC VLE portal, some bank apps).
 */
@Singleton
class InjectionEngine @Inject constructor(
    @ApplicationContext private val ctx: Context,
) {
    fun inject(target: AccessibilityNodeInfo?, pidXml: String): Boolean {
        if (target == null || pidXml.isEmpty()) return false

        // Strategy 1: ACTION_SET_TEXT
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, pidXml)
        }
        val ok = target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        if (ok) return true

        // Strategy 2: clipboard + paste
        val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("pid", pidXml))
        target.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        return target.performAction(AccessibilityNodeInfo.ACTION_PASTE)
    }
}
