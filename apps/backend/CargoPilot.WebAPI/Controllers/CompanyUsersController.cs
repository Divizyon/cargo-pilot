using CargoPilot.Application.Features.CompanyUsers.UpdateCompanyUser;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Firma kullanıcı yönetimi endpoint'leri. Yalnızca CompanyAdmin rolüne sahip kullanıcılar erişebilir.
/// </summary>
[Route("api/v1/company/users")]
[Tags("CompanyUsers")]
[Authorize]
public sealed class CompanyUsersController : BaseController
{
    private readonly IMediator _mediator;

    public CompanyUsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Firma kullanıcısının rolünü veya erişim durumunu günceller.
    /// Son adminin rolü düşürülemez veya pasife alınamaz.
    /// Kullanıcı pasife alındığında tüm aktif oturumları iptal edilir ve bilgilendirme e-postası gönderilir.
    /// </summary>
    /// <param name="userId">Güncellenecek kullanıcının ID'si.</param>
    /// <param name="request">Yeni rol ve/veya erişim durumu.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Kullanıcı başarıyla güncellendi.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="403">Bu işlemi yapmaya yetkiniz yok.</response>
    /// <response code="404">Kullanıcı bulunamadı veya bu firmaya ait değil.</response>
    /// <response code="422">Son admin koruması veya başka bir iş kuralı ihlali.</response>
    [HttpPut("{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> UpdateCompanyUser(
        [FromRoute] Guid userId,
        [FromBody] UpdateCompanyUserRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateCompanyUserCommand(userId, request.NewUserType, request.IsActive);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
