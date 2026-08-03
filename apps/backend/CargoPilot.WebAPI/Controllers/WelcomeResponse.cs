namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// API karşılama yanıt modeli.
/// </summary>
/// <param name="Message">Karşılama mesajı.</param>
/// <param name="Status">API durum bilgisi.</param>
/// <param name="TimestampUtc">Yanıtın oluşturulduğu UTC zaman damgası.</param>
public sealed record WelcomeResponse(string Message, string Status, DateTime TimestampUtc);
