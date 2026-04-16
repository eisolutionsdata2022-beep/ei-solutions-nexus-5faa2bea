using System.Media;
using System.Windows;
using H.NotifyIcon;

namespace EISolutions.IppbAgent.Services;

public sealed class NotificationService
{
    public void PlayBeep() => SystemSounds.Exclamation.Play();

    public void Toast(string message)
    {
        // Uses Windows toast via H.NotifyIcon. Falls back to message box if tray not ready.
        Application.Current.Dispatcher.Invoke(() =>
        {
            try
            {
                var tray = (TaskbarIcon?)Application.Current.FindResource("TrayIcon");
                tray?.ShowNotification(title: "EI SOLUTIONS IPPB", message: message);
            }
            catch
            {
                MessageBox.Show(message, "EI SOLUTIONS IPPB");
            }
        });
    }
}
