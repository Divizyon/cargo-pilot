using CargoPilot.Application.Features.BusinessRules.CreateBusinessRule;
using CargoPilot.Application.Features.BusinessRules.DeleteBusinessRule;
using CargoPilot.Application.Features.BusinessRules.GetBusinessRuleById;
using CargoPilot.Application.Features.BusinessRules.ListBusinessRules;
using CargoPilot.Application.Features.BusinessRules.UpdateBusinessRule;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// İş kuralları ve kısıt yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/business-rules")]
[Tags("BusinessRules")]
[Authorize]
public sealed class BusinessRulesController : BaseController
{
    private readonly IMediator _mediator;

    public BusinessRulesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Tüm iş kurallarını listeler.
    /// </summary>
    /// <response code="200">Kural listesi döner.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ListBusinessRulesQuery(), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// ID ile tek bir iş kuralını getirir.
    /// </summary>
    /// <response code="200">Kural detayları döner.</response>
    /// <response code="404">Kural bulunamadı.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetBusinessRuleByIdQuery(id), cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Yeni iş kuralı oluşturur.
    /// </summary>
    /// <response code="201">Kural oluşturuldu; ID döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateBusinessRuleCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);

        return HandleResult(result);
    }

    /// <summary>
    /// İş kuralını günceller.
    /// </summary>
    /// <response code="200">Kural güncellendi; ID döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Kural bulunamadı.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateBusinessRuleCommand command,
        CancellationToken cancellationToken)
    {
        var commandWithId = command with { Id = id };
        var result = await _mediator.Send(commandWithId, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// İş kuralını siler (soft delete).
    /// </summary>
    /// <response code="200">Kural silindi.</response>
    /// <response code="404">Kural bulunamadı.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new DeleteBusinessRuleCommand(id), cancellationToken);
        return HandleResult(result);
    }
}
