using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers
{
    [ApiController]
    [Route("/")]
    public class HomeController : ControllerBase
    {
        [HttpGet]
        [ProducesResponseType(typeof(WelcomeResponse), StatusCodes.Status200OK)]
        public ActionResult<WelcomeResponse> Get() => Ok(new WelcomeResponse(
            "Cargo Pilot Projesine Hoş Geldiniz!",
            "ok",
            DateTime.UtcNow));
    }

    public sealed record WelcomeResponse(string Message, string Status, DateTime TimestampUtc);
}