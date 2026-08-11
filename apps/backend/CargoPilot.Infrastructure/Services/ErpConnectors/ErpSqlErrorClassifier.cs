namespace CargoPilot.Infrastructure.Services.ErpConnectors;

/// <summary>
/// SQL Server hata numarasini kullaniciya gosterilebilir Turkce mesaja cevirir.
/// Ham <c>SqlException.Message</c> kullaniciya gosterilmez; yalnizca log'a yazilir.
/// </summary>
internal static class ErpSqlErrorClassifier
{
    /// <summary>Kimlik dogrulama hatalari: kullanici adi/sifre veya login yetkisi.</summary>
    private static readonly HashSet<int> AuthenticationErrors = [18456, 18452, 18470];

    /// <summary>Veritabani adiyla veya veritabani erisim yetkisiyle ilgili hatalar.</summary>
    private static readonly HashSet<int> DatabaseErrors = [4060, 4064, 911, 916];

    /// <summary>Sunucuya hic ulasilamadigini gosteren ag/timeout hatalari.</summary>
    private static readonly HashSet<int> UnreachableErrors = [-2, -1, 2, 53, 40, 121, 233, 258, 1225, 10060, 10061, 11001];

    /// <summary>Suresi dolmus SQL login kimlik bilgisi.</summary>
    private static readonly HashSet<int> ExpiredLoginErrors = [18487, 18488];

    /// <summary>TLS sertifika zinciri dogrulanamadi (SEC_E_UNTRUSTED_ROOT).</summary>
    private const int UntrustedCertificateError = -2146893019;

    public const string AuthenticationMessage =
        "Kullanıcı adı veya şifre hatalı. ERP veritabanı kullanıcı bilgilerinizi kontrol edin.";

    public const string ExpiredLoginMessage =
        "SQL kullanıcısının şifresinin süresi dolmuş. IT yöneticinizden şifreyi yenilemesini isteyin.";

    public const string UnreachableMessage =
        "Sunucuya ulaşılamadı — sunucu adresini ve VPN bağlantınızı kontrol edin.";

    public const string UntrustedCertificateMessage =
        "Sunucunun TLS sertifikası doğrulanamadı. Kurum içi (self-signed) sertifika kullanılıyorsa " +
        "'Sunucu sertifikasını doğrulama' ayarını açın.";

    public static string Classify(int errorNumber, string database)
    {
        if (AuthenticationErrors.Contains(errorNumber))
            return AuthenticationMessage;

        if (ExpiredLoginErrors.Contains(errorNumber))
            return ExpiredLoginMessage;

        if (DatabaseErrors.Contains(errorNumber))
            return DatabaseNotFoundMessage(database);

        if (UnreachableErrors.Contains(errorNumber))
            return UnreachableMessage;

        if (errorNumber == UntrustedCertificateError)
            return UntrustedCertificateMessage;

        return "Veritabanına bağlanılamadı. Sunucu adresini, veritabanı adını ve kullanıcı " +
               $"bilgilerini kontrol edin. (SQL hata kodu: {errorNumber})";
    }

    public static string DatabaseNotFoundMessage(string database) =>
        $"'{database}' veritabanı bulunamadı veya bu kullanıcının erişim yetkisi yok. Veritabanı adını kontrol edin.";
}
