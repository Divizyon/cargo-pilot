using System.Security.Cryptography;
using System.Text;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Settings;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Security;

public sealed class AesEncryptionService : IErpEncryptionService
{
    private readonly byte[] _key;

    public AesEncryptionService(IOptions<ErpEncryptionSettings> options)
    {
        _key = Convert.FromBase64String(options.Value.Key);
        if (_key.Length != 32)
            throw new InvalidOperationException("ERP şifreleme anahtarı 32 byte (256-bit) olmalıdır.");
    }

    public string Encrypt(string plainText)
    {
        var nonce = new byte[AesGcm.NonceByteSizes.MaxSize];
        RandomNumberGenerator.Fill(nonce);

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];

        using var aes = new AesGcm(_key, AesGcm.TagByteSizes.MaxSize);
        aes.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var result = new byte[nonce.Length + tag.Length + cipherBytes.Length];
        nonce.CopyTo(result, 0);
        tag.CopyTo(result, nonce.Length);
        cipherBytes.CopyTo(result, nonce.Length + tag.Length);

        return Convert.ToBase64String(result);
    }

    public string Decrypt(string cipherText)
    {
        var data = Convert.FromBase64String(cipherText);
        var nonceSize = AesGcm.NonceByteSizes.MaxSize;
        var tagSize = AesGcm.TagByteSizes.MaxSize;

        var nonce = data[..nonceSize];
        var tag = data[nonceSize..(nonceSize + tagSize)];
        var cipher = data[(nonceSize + tagSize)..];

        var plainBytes = new byte[cipher.Length];
        using var aes = new AesGcm(_key, tagSize);
        aes.Decrypt(nonce, cipher, tag, plainBytes);

        return Encoding.UTF8.GetString(plainBytes);
    }
}
