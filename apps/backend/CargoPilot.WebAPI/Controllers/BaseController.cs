using CargoPilot.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected IActionResult HandleResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }
}
