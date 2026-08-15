namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP baglantisi icin gereken yapilandirma (sunucu adresi, veritabani adi, kimlik
/// bilgisi) eksik ya da okunamaz oldugunda firlatilir. Mesaji kullaniciya gosterilebilir;
/// sifre gibi hassas deger icermez.
/// </summary>
public sealed class ErpConfigurationException : Exception
{
    public ErpConfigurationException()
    {
    }

    public ErpConfigurationException(string message) : base(message)
    {
    }

    public ErpConfigurationException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
