namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP veritabani baglantisi icin gereken tipli kimlik bilgisi. Katmanlar arasinda duz
/// JSON string yerine bu tip tasinir; <see cref="ToString"/> sifreyi maskeler ki log ve
/// exception mesajlarina sizmasin.
/// </summary>
public sealed record ErpCredentials
{
    /// <summary>Sifre yerine loglanan maske.</summary>
    private const string SecretMask = "***";

    private ErpCredentials(string database, string userId, string password, bool trustServerCertificate)
    {
        Database = database;
        UserId = userId;
        Password = password;
        TrustServerCertificate = trustServerCertificate;
    }

    /// <summary>ERP veritabani adi (ayarlarda 'Veritabani Adi' alani).</summary>
    public string Database { get; }

    public string UserId { get; }

    public string Password { get; }

    /// <summary>
    /// false ise sunucu sertifikasi dogrulanir; self-signed sertifikali sunucularda
    /// baglanti reddedilir. Varsayilan true, cunku musteri ERP sunucularinda cogunlukla
    /// kurum ici self-signed sertifika bulunur.
    /// </summary>
    public bool TrustServerCertificate { get; }

    /// <summary>
    /// Eksik alanlarda varsayilan uydurmaz; kullaniciya gosterilebilir bir yapilandirma
    /// hatasi firlatir.
    /// </summary>
    public static ErpCredentials Create(
        string? database,
        string? userId,
        string? password,
        bool trustServerCertificate = true)
    {
        if (string.IsNullOrWhiteSpace(database))
            throw new ErpConfigurationException("ERP veritabanı adı tanımlı değil. ERP ayarlarından veritabanı adını girin.");

        if (string.IsNullOrWhiteSpace(userId))
            throw new ErpConfigurationException("ERP kullanıcı adı tanımlı değil. ERP ayarlarından kullanıcı adını girin.");

        if (string.IsNullOrWhiteSpace(password))
            throw new ErpConfigurationException("ERP parolası tanımlı değil. ERP ayarlarından parolayı girin.");

        return new ErpCredentials(database, userId, password, trustServerCertificate);
    }

    public override string ToString() =>
        $"ErpCredentials {{ Database = {Database}, UserId = {UserId}, Secret = {SecretMask}, TrustServerCertificate = {TrustServerCertificate} }}";
}
