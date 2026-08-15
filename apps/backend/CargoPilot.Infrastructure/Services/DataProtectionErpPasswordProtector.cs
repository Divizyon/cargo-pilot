using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using System.Security.Cryptography;

namespace CargoPilot.Infrastructure.Services;

internal sealed class DataProtectionErpPasswordProtector : IErpPasswordProtector
{
    /// <summary>
    /// Anahtar halkasi degistiginde ya da kayit bozuldugunda gosterilecek mesaj; cozulemeyen
    /// parola sunucuya gonderilirse kullanici anlamsiz bir SqlException gorur.
    /// </summary>
    private const string UnreadableCredentialsMessage =
        "ERP kimlik bilgileri okunamadı. Kayıtlı parola çözülemedi; ERP ayarlarından parolayı yeniden kaydedin.";

    private readonly IDataProtector _protector;

    public DataProtectionErpPasswordProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("CargoPilot.ErpSettings.Password");
    }

    public string Protect(string plainText) => _protector.Protect(plainText);

    public string Unprotect(string cipherText)
    {
        try
        {
            return _protector.Unprotect(cipherText);
        }
        catch (CryptographicException ex)
        {
            throw new ErpConfigurationException(UnreadableCredentialsMessage, ex);
        }
        catch (FormatException ex)
        {
            throw new ErpConfigurationException(UnreadableCredentialsMessage, ex);
        }
    }
}
