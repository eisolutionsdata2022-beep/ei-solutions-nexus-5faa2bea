using System.Security.Cryptography;
using System.Text;
using System.Windows;
using EISolutions.IppbAgent.Models;
using EISolutions.IppbAgent.Views;
using Microsoft.Extensions.Logging;

namespace EISolutions.IppbAgent.Services;

/// <summary>
/// End-to-end orchestration for a single capture request:
///   1. Show modal + play beep.
///   2. If user accepts → mark "capturing" in Firestore.
///   3. Discover RD Service; if found → CAPTURE. Otherwise → L1 simulation.
///   4. Hash PID block (SHA-256(pidBlock || captureId)).
///   5. Write back status="captured" with hash + metadata.
///   6. On any failure → write back status="failed" with error code.
/// </summary>
public sealed class BiometricProcessor
{
    private readonly FirestoreListener _store;
    private readonly RdServiceClient _rd;
    private readonly NotificationService _notif;
    private readonly ILogger<BiometricProcessor> _log;

    public BiometricProcessor(FirestoreListener store, RdServiceClient rd,
                              NotificationService notif, ILogger<BiometricProcessor> log)
    { _store = store; _rd = rd; _notif = notif; _log = log; }

    public async Task HandleAsync(CaptureRequest req)
    {
        if (req.Status != "requested") return;          // already in progress
        if (req.IsExpired) { await FailAsync(req, "EXPIRED", "Capture window expired"); return; }

        var accepted = await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            _notif.PlayBeep();
            var modal = new CaptureModal(req);
            return modal.ShowDialog() == true;
        });
        if (!accepted) { await FailAsync(req, "USER_REJECTED", "Retailer declined"); return; }

        await _store.UpdateCaptureAsync(req.IppbRequestId, req.Id, new Dictionary<string, object?>
        {
            ["status"] = "capturing",
            ["capturingAt"] = DateTime.UtcNow.ToString("O"),
        });

        try
        {
            var info = await _rd.DiscoverAsync();
            CaptureResult result;
            if (info is { Status: "READY" })
            {
                var pidBlock = await _rd.CaptureAsync(info.Port);
                result = new CaptureResult
                {
                    Mode = "L2_RD_SERVICE",
                    Hash = HashPidBlock(pidBlock, req.Id),
                    DeviceModel = info.DeviceModel,
                    RdServiceVersion = info.Version,
                };
            }
            else
            {
                _log.LogWarning("No RD Service — falling back to L1 simulation");
                result = new CaptureResult
                {
                    Mode = "L1_SIMULATION",
                    Hash = SimulateHash(),
                    DeviceModel = "SIMULATED",
                };
            }

            await _store.UpdateCaptureAsync(req.IppbRequestId, req.Id, new Dictionary<string, object?>
            {
                ["status"] = "captured",
                ["mode"] = result.Mode,
                ["hash"] = result.Hash,
                ["deviceModel"] = result.DeviceModel,
                ["rdServiceVersion"] = result.RdServiceVersion,
                ["capturedAt"] = DateTime.UtcNow.ToString("O"),
            });
            _notif.Toast("Biometric sent to staff tablet ✔");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Capture failed");
            await FailAsync(req, "RD_ERROR", ex.Message);
        }
    }

    private async Task FailAsync(CaptureRequest req, string code, string message)
    {
        await _store.UpdateCaptureAsync(req.IppbRequestId, req.Id, new Dictionary<string, object?>
        {
            ["status"] = "failed",
            ["errorCode"] = code,
            ["errorMessage"] = message,
            ["capturedAt"] = DateTime.UtcNow.ToString("O"),
        });
    }

    private static string HashPidBlock(string pidBlock, string captureId)
    {
        var bytes = Encoding.UTF8.GetBytes(pidBlock + captureId);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }

    private static string SimulateHash()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
