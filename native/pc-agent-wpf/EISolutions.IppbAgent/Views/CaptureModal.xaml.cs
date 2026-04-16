using System.Windows;
using EISolutions.IppbAgent.Models;

namespace EISolutions.IppbAgent.Views;

public partial class CaptureModal : Window
{
    public CaptureModal(CaptureRequest req)
    {
        InitializeComponent();
        DetailsText.Text =
            $"IPPB request: {req.IppbRequestId}\n" +
            $"Capture id: {req.Id[..8]}…\n" +
            $"Expires at: {req.ExpiresAt}";
    }

    private void Accept_Click(object sender, RoutedEventArgs e) { DialogResult = true; Close(); }
    private void Reject_Click(object sender, RoutedEventArgs e) { DialogResult = false; Close(); }
}
