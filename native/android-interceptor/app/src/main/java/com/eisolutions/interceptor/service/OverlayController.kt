package com.eisolutions.interceptor.service

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OverlayController
 * -----------------
 * Renders a small banner over the third-party app while a capture is
 * being relayed to the retailer's PC. Uses SYSTEM_ALERT_WINDOW so it
 * survives across app windows.
 */
@Singleton
class OverlayController @Inject constructor(
    @ApplicationContext private val ctx: Context,
) {
    sealed class State {
        data object Idle : State()
        data object Capturing : State()
        data object Injected : State()
        data object DetectionOnly : State()
        data class Failed(val msg: String?) : State()
    }

    private val wm by lazy { ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager }
    private val main = Handler(Looper.getMainLooper())
    private var view: View? = null

    fun show(state: State) = main.post {
        ensureView()
        val tv = view?.findViewById<TextView>(android.R.id.text1) ?: return@post
        tv.text = when (state) {
            State.Capturing     -> "🔒 Retailer PC യിൽ fingerprint capture നടക്കുന്നു…"
            State.Injected      -> "✅ Captured — source app-ലേക്ക് inject ചെയ്തു"
            State.DetectionOnly -> "📣 Retailer-നെ notify ചെയ്തു — ഈ device-ൽ തന്നെ capture തുടരുക"
            is State.Failed     -> "❌ Capture പരാജയപ്പെട്ടു: ${state.msg ?: "unknown"}"
            State.Idle          -> ""
        }
    }

    fun dismissAfter(ms: Long) = main.postDelayed({ dismiss() }, ms)

    fun dismiss() = main.post {
        view?.let { runCatching { wm.removeView(it) } }
        view = null
    }

    private fun ensureView() {
        if (view != null) return
        val tv = TextView(ctx).apply {
            id = android.R.id.text1
            setPadding(40, 24, 40, 24)
            setBackgroundColor(0xCC000000.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 16f
        }
        view = tv
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        val lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 80
        }
        runCatching { wm.addView(tv, lp) }
    }
}
