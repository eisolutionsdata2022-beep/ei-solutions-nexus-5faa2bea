package com.eisolutions.ippb.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Multi-step IPPB workflow UI for the staff tablet. Each step is a Composable
 * driven by the current IppbStatus from Firestore. Implemented as a switch on
 * the active request's status; full step components are left as small stubs
 * here to keep this file scannable — production UI mirrors the web app's
 * src/routes/staff.ippb.tsx 1:1.
 */
@Composable
fun IppbWorkflowScreen(viewModel: IppbViewModel = androidx.hilt.navigation.compose.hiltViewModel()) {
    val state by viewModel.state.collectAsState()

    Scaffold(topBar = {
        TopAppBar(title = { Text("EI SOLUTIONS — IPPB Tablet") })
    }) { padding ->
        Column(
            Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (val s = state) {
                is IppbUiState.Loading -> CircularProgressIndicator()
                is IppbUiState.SignedOut -> SignInForm(viewModel::signIn)
                is IppbUiState.Queue -> QueueList(s.items, viewModel::open)
                is IppbUiState.Active -> ActiveRequestPanel(s, viewModel)
                is IppbUiState.Error -> Text("Error: ${s.message}", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable private fun SignInForm(onSubmit: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var pwd by remember { mutableStateOf("") }
    OutlinedTextField(email, { email = it }, label = { Text("Email") })
    OutlinedTextField(pwd, { pwd = it }, label = { Text("Password") })
    Button(onClick = { onSubmit(email, pwd) }) { Text("Sign in") }
}

@Composable private fun QueueList(items: List<IppbListItem>, onOpen: (String) -> Unit) {
    Text("Pending Queue (${items.size})", style = MaterialTheme.typography.titleLarge)
    items.forEach { item ->
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp)) {
                Text(item.requestNo, style = MaterialTheme.typography.titleMedium)
                Text("Retailer: ${item.retailerName}")
                Text("Status: ${item.status}")
                Button(onClick = { onOpen(item.id) }) { Text("Open") }
            }
        }
    }
}

@Composable private fun ActiveRequestPanel(state: IppbUiState.Active, vm: IppbViewModel) {
    // Switch on state.request.status and render the matching step.
    // Each step calls vm.<action>() which delegates to IppbRepository / BiometricRelay.
    Text("Active: ${state.request.requestNo} — ${state.request.status}",
        style = MaterialTheme.typography.titleLarge)
    // ... step components: MobileEntry, OtpVerify, CustomerDetails, BiometricCapture, Submit
    // See src/routes/staff.ippb.tsx for the canonical step UI.
}
