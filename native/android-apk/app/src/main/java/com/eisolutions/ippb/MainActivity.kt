package com.eisolutions.ippb

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.eisolutions.ippb.ui.IppbWorkflowScreen
import com.eisolutions.ippb.ui.theme.EISolutionsTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            EISolutionsTheme {
                IppbWorkflowScreen()
            }
        }
    }
}
