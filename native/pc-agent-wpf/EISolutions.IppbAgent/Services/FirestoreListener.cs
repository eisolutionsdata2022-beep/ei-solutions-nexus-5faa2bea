using EISolutions.IppbAgent.Models;
using Google.Cloud.Firestore;
using Grpc.Core;
using V1 = Google.Cloud.Firestore.V1;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EISolutions.IppbAgent.Services;

/// <summary>
/// Listens to Firestore for capture requests addressed to the signed-in
/// retailer. Uses a collectionGroup query mirrored from the web app's
/// subscribeRetailerPendingCaptures().
/// </summary>
public sealed class FirestoreListener
{
    private readonly AuthService _auth;
    private readonly IConfiguration _config;
    private readonly ILogger<FirestoreListener> _log;

    public event Func<CaptureRequest, Task>? OnCaptureRequested;

    private FirestoreDb? _db;
    private FirestoreChangeListener? _watch;

    public FirestoreListener(AuthService auth, IConfiguration config, ILogger<FirestoreListener> log)
    { _auth = auth; _config = config; _log = log; }

    public async Task StartAsync()
    {
        if (_auth.UserId is null || _auth.IdToken is null)
            throw new InvalidOperationException("Not signed in");

        var projectId = _config["Firebase:ProjectId"]!;
        var builder = new V1.FirestoreClientBuilder
        {
            ChannelCredentials = ChannelCredentials.Create(
                ChannelCredentials.SecureSsl,
                CallCredentials.FromInterceptor((_, meta) =>
                {
                    meta.Add("authorization", $"Bearer {_auth.IdToken}");
                    return Task.CompletedTask;
                })),
        };
        _db = await FirestoreDb.CreateAsync(projectId, await builder.BuildAsync());

        var query = _db.CollectionGroup("captureRequests")
            .WhereEqualTo("retailerId", _auth.UserId)
            .WhereIn("status", new[] { "requested", "capturing" });

        _watch = query.Listen(snap =>
        {
            foreach (var change in snap.Changes)
            {
                if (change.ChangeType != Google.Cloud.Firestore.DocumentChange.Type.Added) continue;
                var d = change.Document;
                var row = new CaptureRequest
                {
                    Id = d.Id,
                    IppbRequestId = d.Reference.Parent.Parent!.Id,
                    RetailerId = d.GetValue<string>("retailerId"),
                    StaffId = d.GetValue<string>("staffId"),
                    Status = d.GetValue<string>("status"),
                    RequestedAt = d.GetValue<string>("requestedAt"),
                    ExpiresAt = d.GetValue<string>("expiresAt"),
                };
                _ = OnCaptureRequested?.Invoke(row);
            }
        });

        _log.LogInformation("Listening for captures, retailer={Uid}", _auth.UserId);
    }

    public async Task UpdateCaptureAsync(string ippbRequestId, string captureId, IDictionary<string, object?> patch)
    {
        if (_db is null) throw new InvalidOperationException("Not started");
        var doc = _db.Collection("ippbRequests").Document(ippbRequestId)
            .Collection("captureRequests").Document(captureId);
        await doc.UpdateAsync(patch);
    }

    public async Task StopAsync()
    {
        if (_watch is not null) await _watch.StopAsync();
    }
}
