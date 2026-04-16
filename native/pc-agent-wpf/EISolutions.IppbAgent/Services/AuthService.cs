using System.Net.Http;
using System.Net.Http.Json;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;

namespace EISolutions.IppbAgent.Services;

/// <summary>
/// Authenticates against Firebase using a custom token issued by the
/// EI Solutions backend. The refresh token is then stored via DPAPI so the
/// retailer doesn't have to sign in every Windows session.
/// </summary>
public sealed class AuthService
{
    private readonly SecureStorage _storage;
    private readonly IConfiguration _config;
    private readonly HttpClient _http = new();

    public string? UserId { get; private set; }
    public string? IdToken { get; private set; }

    public AuthService(SecureStorage storage, IConfiguration config)
    {
        _storage = storage;
        _config = config;
    }

    public async Task<bool> SignInAsync(string email, string password)
    {
        var endpoint = _config["Firebase:TokenEndpoint"]!;
        var res = await _http.PostAsJsonAsync(endpoint, new { email, password });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<TokenResponse>()
                   ?? throw new InvalidOperationException("Empty token response");

        // Exchange custom token for ID + refresh tokens via Identity Toolkit REST.
        var apiKey = _config["Firebase:WebApiKey"]!;
        var url = $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={apiKey}";
        var exchange = await _http.PostAsJsonAsync(url, new { token = body.Token, returnSecureToken = true });
        exchange.EnsureSuccessStatusCode();
        var session = await exchange.Content.ReadFromJsonAsync<SignInResponse>()
                      ?? throw new InvalidOperationException("Empty session response");

        UserId = session.LocalId;
        IdToken = session.IdToken;
        _storage.Save(session.RefreshToken);
        return true;
    }

    public async Task<bool> TryRestoreSessionAsync()
    {
        var refresh = _storage.Load();
        if (refresh is null) return false;

        var apiKey = _config["Firebase:WebApiKey"]!;
        var url = $"https://securetoken.googleapis.com/v1/token?key={apiKey}";
        var res = await _http.PostAsync(url, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refresh,
        }));
        if (!res.IsSuccessStatusCode) { _storage.Clear(); return false; }

        var refreshed = await res.Content.ReadFromJsonAsync<RefreshResponse>()
                        ?? throw new InvalidOperationException("Empty refresh response");
        UserId = refreshed.UserId;
        IdToken = refreshed.IdToken;
        _storage.Save(refreshed.RefreshToken);
        return true;
    }

    public void SignOut() { _storage.Clear(); UserId = null; IdToken = null; }

    private record TokenResponse(string Token, long ExpiresIn);
    private record SignInResponse(string IdToken, string RefreshToken, string LocalId);
    private record RefreshResponse(string IdToken, string RefreshToken, string UserId);
}
