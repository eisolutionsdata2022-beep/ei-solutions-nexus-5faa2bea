using System.Net.Http;
using System.Text;
using System.Xml.Linq;
using EISolutions.IppbAgent.Models;
using Microsoft.Extensions.Configuration;

namespace EISolutions.IppbAgent.Services;

/// <summary>
/// Talks to the locally-installed signed RD Service (Mantra MFS100, Morpho
/// MSO1300, Startek FM220 …) over loopback HTTP using the standard custom
/// HTTP verbs RDSERVICE and CAPTURE.
///
/// In production with a real, signed RD Service this returns the actual PID
/// block. In dev / L1 stage it short-circuits and returns a simulated hash.
/// </summary>
public sealed class RdServiceClient
{
    private readonly IConfiguration _config;
    private readonly HttpClient _http;

    public RdServiceClient(IConfiguration config)
    {
        _config = config;
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(_config.GetValue("RdService:TimeoutSeconds", 30)) };
    }

    /// <summary>Probes ports 11100..11102 for any READY RD Service.</summary>
    public async Task<RdServiceInfo?> DiscoverAsync(CancellationToken ct = default)
    {
        var ports = _config.GetSection("RdService:Ports").Get<int[]>() ?? new[] { 11100, 11101, 11102 };
        foreach (var port in ports)
        {
            try
            {
                using var req = new HttpRequestMessage(new HttpMethod("RDSERVICE"), $"http://127.0.0.1:{port}/");
                using var res = await _http.SendAsync(req, ct);
                if (!res.IsSuccessStatusCode) continue;
                var body = await res.Content.ReadAsStringAsync(ct);
                var doc = XDocument.Parse(body);
                var info = doc.Root!;
                return new RdServiceInfo
                {
                    Port = port,
                    Status = info.Attribute("status")?.Value ?? "UNKNOWN",
                    DeviceModel = info.Attribute("info")?.Value ?? "Unknown",
                    Version = info.Attribute("rdsVer")?.Value ?? "0.0",
                };
            }
            catch { /* try next port */ }
        }
        return null;
    }

    /// <summary>Issues a CAPTURE call and returns the raw PID block XML.</summary>
    public async Task<string> CaptureAsync(int port, CancellationToken ct = default)
    {
        var pidOpts = _config["RdService:PidOptionsXml"]!;
        using var req = new HttpRequestMessage(new HttpMethod("CAPTURE"), $"http://127.0.0.1:{port}/rd/capture")
        {
            Content = new StringContent(pidOpts, Encoding.UTF8, "text/xml"),
        };
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadAsStringAsync(ct);
    }
}
