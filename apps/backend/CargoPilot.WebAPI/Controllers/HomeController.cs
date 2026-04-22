using CargoPilot.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// API sağlık ve karşılama endpoint'leri.
/// </summary>
[ApiController]
[Route("/")]
[Tags("Home")]
public class HomeController : BaseController
{
    /// <summary>
    /// API'nin çalışır durumda olduğunu doğrular ve karşılama mesajı döner.
    /// </summary>
    /// <returns>Karşılama mesajı, durum ve UTC zaman damgası.</returns>
    /// <response code="200">API başarıyla yanıt verdi.</response>
    [HttpGet]
    [ProducesResponseType(typeof(Result<WelcomeResponse>), StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        var response = new WelcomeResponse(
            "Cargo Pilot Projesine Hoş Geldiniz!",
            "ok",
            DateTime.UtcNow);
            
        return HandleResult(Result<WelcomeResponse>.Success(response));
    }
}

