using CargoPilot.Application.Common.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace CargoPilot.Infrastructure.Services;

internal sealed class DataProtectionErpPasswordProtector : IErpPasswordProtector
{
    private readonly IDataProtector _protector;

    public DataProtectionErpPasswordProtector(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("CargoPilot.ErpSettings.Password");
    }

    public string Protect(string plainText) => _protector.Protect(plainText);

    public string Unprotect(string cipherText) => _protector.Unprotect(cipherText);
}
