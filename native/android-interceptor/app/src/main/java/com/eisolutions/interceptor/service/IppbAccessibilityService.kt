package com.eisolutions.interceptor.service

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.eisolutions.interceptor.relay.CaptureRelay
import com.eisolutions.interceptor.relay.PackageWhitelist
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * IppbAccessibilityService
 * ------------------------
 * Core interception engine. Watches AccessibilityEvents from every
 * foreground app. When a whitelisted IPPB / CSC / Aadhaar app fires a
 * capture-related event (button text "Capture", "Scan Fingerprint",
 * "Aadhaar Auth", or an EditText labeled "PID Data" gains focus), this
 * service:
 *
 *   1. Suppresses the in-app capture by intercepting the event and
 *      raising our overlay banner.
 *   2. Calls CaptureRelay.requestCapture() to push the work to the
 *      retailer's PC agent via Firestore.
 *   3. Awaits the captured PID XML hash from the relay.
 *   4. Calls InjectionEngine.inject() to write the result back into the
 *      source app's PID EditText (or via clipboard fallback).
 *
 * No data leaves the tablet unencrypted — see crypto/SessionCrypto.kt.
 */
@AndroidEntryPoint
class IppbAccessibilityService : AccessibilityService() {

    @Inject lateinit var whitelist: PackageWhitelist
    @Inject lateinit var relay: CaptureRelay
    @Inject lateinit var injection: InjectionEngine
    @Inject lateinit var overlay: OverlayController

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var inflightJob: Job? = null

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val ev = event ?: return
        val pkg = ev.packageName?.toString() ?: return

        // Cheap allow check before any heavy parsing
        if (!whitelist.isAllowed(pkg)) return

        val source = ev.source ?: return
        if (!isCaptureTrigger(source, ev)) {
            source.recycle()
            return
        }

        // Already handling one capture — debounce
        if (inflightJob?.isActive == true) {
            source.recycle()
            return
        }

        inflightJob = scope.launch {
            try {
                overlay.show(OverlayController.State.Capturing)
                val pidOptions = extractPidOptions(source)
                val targetNode = findInjectionTarget(rootInActiveWindow)

                val detectionOnly = whitelist.detectionOnly
                val result = relay.requestCapture(
                    sourcePackage = pkg,
                    pidOptionsXml = pidOptions,
                    detectionOnly = detectionOnly,
                ).first { it.isTerminal }

                when {
                    detectionOnly && result.status == "acknowledged" -> {
                        // Retailer was notified; we deliberately do NOT inject.
                        // Customer should hand the BCAS tablet back to the
                        // operator who completes capture on the real device.
                        overlay.show(OverlayController.State.DetectionOnly)
                    }
                    result.status == "captured" -> {
                        injection.inject(targetNode, result.pidXml ?: "")
                        overlay.show(OverlayController.State.Injected)
                    }
                    else -> overlay.show(OverlayController.State.Failed(result.errorMessage))
                }
            } finally {
                source.recycle()
                overlay.dismissAfter(2000)
            }
        }
    }

    /** Heuristics: button labels and view-ids commonly used by IPPB / Aadhaar apps. */
    private fun isCaptureTrigger(node: AccessibilityNodeInfo, ev: AccessibilityEvent): Boolean {
        val text = (node.text?.toString() ?: ev.text?.joinToString(" ") ?: "").lowercase()
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val triggers = listOf("capture", "scan fingerprint", "aadhaar auth", "biometric", "rd service")
        if (triggers.any { it in text }) return true
        if ("fp_capture" in viewId || "btn_capture" in viewId || "rd_capture" in viewId) return true
        return false
    }

    /** Read PidOptions XML if the host app exposes it via an EditText/contentDescription. */
    private fun extractPidOptions(node: AccessibilityNodeInfo): String {
        // Walk up to root, then DFS for an EditText with viewId containing "pid"
        var root: AccessibilityNodeInfo? = node
        while (root?.parent != null) root = root.parent
        return findByIdContains(root, "pid")?.text?.toString()
            ?: DEFAULT_PID_OPTIONS
    }

    private fun findInjectionTarget(root: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        return findByIdContains(root, "piddata")
            ?: findByIdContains(root, "pid_data")
            ?: findByIdContains(root, "biometric")
    }

    private fun findByIdContains(node: AccessibilityNodeInfo?, needle: String): AccessibilityNodeInfo? {
        if (node == null) return null
        val id = node.viewIdResourceName?.lowercase() ?: ""
        if (needle in id) return node
        for (i in 0 until node.childCount) {
            findByIdContains(node.getChild(i), needle)?.let { return it }
        }
        return null
    }

    override fun onInterrupt() {
        inflightJob?.cancel()
        overlay.dismiss()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val DEFAULT_PID_OPTIONS =
            "<PidOptions ver=\"1.0\"><Opts fCount=\"1\" fType=\"2\" iCount=\"0\" pCount=\"0\" format=\"0\" pidVer=\"2.0\" timeout=\"10000\" otp=\"\" wadh=\"\" posh=\"UNKNOWN\"/></PidOptions>"
    }
}
