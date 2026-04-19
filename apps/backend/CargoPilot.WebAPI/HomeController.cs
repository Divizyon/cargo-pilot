using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// API sağlık ve karşılama endpoint'leri.
/// </summary>
[ApiController]
[Route("/")]
[Tags("Home")]
public class HomeController : ControllerBase
{
    /// <summary>
    /// API'nin çalışır durumda olduğunu doğrular ve karşılama mesajı döner.
    /// </summary>
    /// <returns>Karşılama mesajı, durum ve UTC zaman damgası.</returns>
    /// <response code="200">API başarıyla yanıt verdi.</response>
    [HttpGet]
    [ProducesResponseType(typeof(WelcomeResponse), StatusCodes.Status200OK)]
    public ActionResult<WelcomeResponse> Get() => Ok(new WelcomeResponse(
        "Cargo Pilot Projesine Hoş Geldiniz!",
        "ok",
        DateTime.UtcNow));
}

/// <summary>
/// API karşılama yanıt modeli.
/// </summary>
/// <param name="Message">Karşılama mesajı.</param>
/// <param name="Status">API durum bilgisi.</param>
/// <param name="TimestampUtc">Yanıtın oluşturulduğu UTC zaman damgası.</param>
public sealed record WelcomeResponse(string Message, string Status, DateTime TimestampUtc);