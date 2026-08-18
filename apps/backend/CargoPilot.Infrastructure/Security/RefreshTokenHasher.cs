using System.Security.Cryptography;
using System.Text;

namespace CargoPilot.Infrastructure.Security;

/// <summary>
/// Refresh token'lar veritabanına hash'lenerek yazılır; veritabanı sızıntısında
/// token'lar doğrudan kullanılamaz. Token yüksek entropili rastgele değer
/// olduğundan sözlük saldırısı geçerli değildir, SHA-256 yeterlidir.
/// Parola sıfırlama ve e-posta değişikliği token'larıyla aynı hash deseni kullanılır.
/// </summary>
public static class RefreshTokenHasher {
    /// <summary>Ham refresh token'ın SHA-256 hash'ini büyük harfli hex olarak döner.</summary>
    public static string Hash(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
}
