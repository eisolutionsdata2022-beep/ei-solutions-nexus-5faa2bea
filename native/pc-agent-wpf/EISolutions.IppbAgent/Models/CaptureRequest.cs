namespace EISolutions.IppbAgent.Models;

public sealed class CaptureRequest
{
    public required string Id { get; init; }              // captureRequest doc id
    public required string IppbRequestId { get; init; }   // parent doc id
    public required string RetailerId { get; init; }
    public required string StaffId { get; init; }
    public required string Status { get; init; }          // requested|capturing|...
    public string? Mode { get; init; }                    // L1_SIMULATION|L2_RD_SERVICE
    public string RequestedAt { get; init; } = "";
    public string ExpiresAt { get; init; } = "";

    public bool IsExpired => DateTime.UtcNow > DateTime.Parse(ExpiresAt).ToUniversalTime();
}

public sealed class CaptureResult
{
    public required string Mode { get; init; }
    public required string Hash { get; init; }
    public string? DeviceModel { get; init; }
    public string? RdServiceVersion { get; init; }
}

public sealed class RdServiceInfo
{
    public required int Port { get; init; }
    public required string Status { get; init; }   // READY | NOTREADY | USED
    public required string DeviceModel { get; init; }
    public required string Version { get; init; }
}
