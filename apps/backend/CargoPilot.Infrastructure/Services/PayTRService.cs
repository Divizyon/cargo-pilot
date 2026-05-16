using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Settings;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Services;

internal sealed class PayTRService : IPayTRService
{
    // PayTR resmi iframe token endpoint'i — değişmez sabit URL
#pragma warning disable S1075
    private const string ApiUrl = "https://www.paytr.com/odeme/api/get-token";
#pragma warning restore S1075

    private readonly HttpClient _httpClient;
    private readonly PayTRSettings _settings;

    public PayTRService(HttpClient httpClient, IOptions<PayTRSettings> options)
    {
        _httpClient = httpClient;
        _settings = options.Value;
    }

    public async Task<string> GetIframeTokenAsync(
        string merchantOid,
        string email,
        string userIp,
        long amountInKurus,
        string planName,
        CancellationToken cancellationToken = default)
    {
        var testMode = _settings.TestMode ? "1" : "0";
        var paymentAmount = amountInKurus.ToString(System.Globalization.CultureInfo.InvariantCulture);
        const string paymentType = "card";
        const string installmentCount = "0";
        const string currency = "TL";
        const string non3d = "0";

        var userBasket = Convert.ToBase64String(
            Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(new[] { new[] { planName, "1", paymentAmount } })));

        var hashStr = _settings.MerchantId + userIp + merchantOid + email
            + paymentAmount + paymentType + installmentCount + currency + testMode + non3d;

        var paytrToken = ComputeHmacBase64(hashStr + _settings.MerchantSalt, _settings.MerchantKey);

        var formData = new Dictionary<string, string>
        {
            ["merchant_id"]       = _settings.MerchantId,
            ["user_ip"]           = userIp,
            ["merchant_oid"]      = merchantOid,
            ["email"]             = email,
            ["payment_amount"]    = paymentAmount,
            ["payment_type"]      = paymentType,
            ["installment_count"] = installmentCount,
            ["currency"]          = currency,
            ["test_mode"]         = testMode,
            ["non_3d"]            = non3d,
            ["merchant_ok_url"]   = _settings.MerchantOkUrl,
            ["merchant_fail_url"] = _settings.MerchantFailUrl,
            ["user_basket"]       = userBasket,
            ["user_name"]         = email,
            ["user_address"]      = "N/A",
            ["user_phone"]        = "N/A",
            ["paytr_token"]       = paytrToken,
            ["debug_on"]          = testMode,
            ["lang"]              = "tr",
        };

        var response = await _httpClient.PostAsync(
            ApiUrl,
            new FormUrlEncodedContent(formData),
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;

        if (root.TryGetProperty("status", out var statusEl) && statusEl.GetString() == "success")
            return root.GetProperty("token").GetString()!;

        var reason = root.TryGetProperty("reason", out var reasonEl)
            ? reasonEl.GetString()
            : "Bilinmeyen hata";

        throw new InvalidOperationException($"PayTR token alınamadı: {reason}");
    }

    public bool VerifyNotification(string merchantOid, string status, string totalAmount, string hash)
    {
        // PayTR dökümantasyonuna göre hash doğrulama
        // total_refund kısmsal iade varsa farklıdır; tam ödeme için "0"
        var hashStr = _settings.MerchantId + merchantOid + totalAmount
            + _settings.MerchantOkUrl + _settings.MerchantFailUrl + status + "0";

        var expectedHash = ComputeHmacBase64(hashStr + _settings.MerchantSalt, _settings.MerchantKey);
        return expectedHash == hash;
    }

    private static string ComputeHmacBase64(string data, string key)
    {
        var keyBytes  = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToBase64String(hmac.ComputeHash(dataBytes));
    }
}
