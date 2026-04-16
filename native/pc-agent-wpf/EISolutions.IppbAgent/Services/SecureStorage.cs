using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace EISolutions.IppbAgent.Services;

/// <summary>
/// Persists secrets (Firebase refresh token) using Windows DPAPI scoped to
/// the current user. The encrypted blob is unreadable by other Windows users
/// on the same machine.
/// </summary>
public sealed class SecureStorage
{
    private readonly string _path = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "EISolutions", "IppbAgent", "creds.dat");

    public void Save(string secret)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        var data = Encoding.UTF8.GetBytes(secret);
        var encrypted = ProtectedData.Protect(data, optionalEntropy: null,
            scope: DataProtectionScope.CurrentUser);
        File.WriteAllBytes(_path, encrypted);
    }

    public string? Load()
    {
        if (!File.Exists(_path)) return null;
        try
        {
            var encrypted = File.ReadAllBytes(_path);
            var data = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(data);
        }
        catch { return null; }
    }

    public void Clear() { if (File.Exists(_path)) File.Delete(_path); }
}
