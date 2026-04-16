using System.Windows;
using EISolutions.IppbAgent.Services;
using EISolutions.IppbAgent.Views;
using H.NotifyIcon;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EISolutions.IppbAgent;

public partial class App : Application
{
    private IHost? _host;
    private TaskbarIcon? _tray;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        _host = Host.CreateDefaultBuilder()
            .ConfigureAppConfiguration(c => c.AddJsonFile("appsettings.json", optional: false))
            .ConfigureServices((ctx, services) =>
            {
                services.AddSingleton<SecureStorage>();
                services.AddSingleton<AuthService>();
                services.AddSingleton<RdServiceClient>();
                services.AddSingleton<NotificationService>();
                services.AddSingleton<FirestoreListener>();
                services.AddSingleton<BiometricProcessor>();
                services.AddSingleton<LoginWindow>();
            })
            .ConfigureLogging(l => l.AddDebug())
            .Build();

        await _host.StartAsync();

        var auth = _host.Services.GetRequiredService<AuthService>();
        if (!await auth.TryRestoreSessionAsync())
        {
            var login = _host.Services.GetRequiredService<LoginWindow>();
            if (login.ShowDialog() != true) { Shutdown(); return; }
        }

        // Initialize tray + start listening
        _tray = (TaskbarIcon)FindResource("TrayIcon")!;
        var listener = _host.Services.GetRequiredService<FirestoreListener>();
        var processor = _host.Services.GetRequiredService<BiometricProcessor>();
        listener.OnCaptureRequested += processor.HandleAsync;
        await listener.StartAsync();
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        _tray?.Dispose();
        if (_host is not null) await _host.StopAsync();
        base.OnExit(e);
    }
}
