package com.eisolutions.ippb.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.eisolutions.ippb.auth.AuthRepository
import com.eisolutions.ippb.biometric.BiometricRelay
import com.eisolutions.ippb.data.IppbRepository
import com.eisolutions.ippb.data.IppbRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class IppbListItem(val id: String, val requestNo: String, val retailerName: String, val status: String)

sealed class IppbUiState {
    data object Loading : IppbUiState()
    data object SignedOut : IppbUiState()
    data class Queue(val items: List<IppbListItem>) : IppbUiState()
    data class Active(val request: IppbRequest) : IppbUiState()
    data class Error(val message: String) : IppbUiState()
}

@HiltViewModel
class IppbViewModel @Inject constructor(
    private val auth: AuthRepository,
    private val repo: IppbRepository,
    private val relay: BiometricRelay,
) : ViewModel() {

    private val _state = MutableStateFlow<IppbUiState>(IppbUiState.Loading)
    val state: StateFlow<IppbUiState> = _state.asStateFlow()

    init { viewModelScope.launch { observeAuth() } }

    private suspend fun observeAuth() {
        auth.userFlow().collect { user ->
            if (user == null) _state.value = IppbUiState.SignedOut
            else loadQueue(user.uid)
        }
    }

    fun signIn(email: String, password: String) = viewModelScope.launch {
        runCatching { auth.signIn(email, password) }
            .onFailure { _state.value = IppbUiState.Error(it.message ?: "Sign-in failed") }
    }

    private fun loadQueue(uid: String) = viewModelScope.launch {
        repo.staffQueueFlow(uid).collect { rows ->
            _state.value = IppbUiState.Queue(rows.map {
                IppbListItem(it.id, it.requestNo, it.retailerName, it.status.name)
            })
        }
    }

    fun open(id: String) { /* fetch single doc, set Active */ }

    fun triggerBiometric(req: IppbRequest) = viewModelScope.launch {
        val staffId = auth.currentUser?.uid ?: return@launch
        val captureId = relay.createCaptureRequest(req.id, staffId, req.retailerId)
        relay.captureFlow(req.id, captureId).collect { snap ->
            if (snap.status == "captured" && snap.hash != null) {
                repo.saveBiometric(req.id, relay.toBiometric(snap))
            }
        }
    }
}
