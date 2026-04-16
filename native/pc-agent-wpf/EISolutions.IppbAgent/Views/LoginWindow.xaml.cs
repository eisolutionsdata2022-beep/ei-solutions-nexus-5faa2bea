using System.Windows;
using EISolutions.IppbAgent.Services;

namespace EISolutions.IppbAgent.Views;

public partial class LoginWindow : Window
{
    private readonly AuthService _auth;
    public LoginWindow(AuthService auth) { _auth = auth; InitializeComponent(); }

    private async void SignIn_Click(object sender, RoutedEventArgs e)
    {
        ErrorText.Text = "";
        try
        {
            await _auth.SignInAsync(EmailBox.Text.Trim(), PasswordBox.Password);
            DialogResult = true;
            Close();
        }
        catch (Exception ex) { ErrorText.Text = ex.Message; }
    }
}
