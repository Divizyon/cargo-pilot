using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.UpdateDraftItem;

public sealed class UpdateDraftItemCommandHandler : IRequestHandler<UpdateDraftItemCommand, Result<Unit>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpdateDraftItemCommand> _validator;

    public UpdateDraftItemCommandHandler(
        IDraftItemRepository draftItemRepository,
        ICurrentUserService currentUserService,
        IValidator<UpdateDraftItemCommand> validator)
    {
        _draftItemRepository = draftItemRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Unit>> Handle(UpdateDraftItemCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Unit>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Unit>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var draft = await _draftItemRepository.GetByIdAsync(request.Id, companyId.Value, cancellationToken);
        if (draft is null)
            return Result<Unit>.Failure(new Error(ErrorType.NotFound, "DraftItem.NotFound", "Taslak ürün bulunamadı."));

        if (draft.Status == DraftItemStatus.Approved)
            return Result<Unit>.Failure(new Error(ErrorType.Conflict, "DraftItem.AlreadyApproved", "Onaylanmış taslak düzenlenemez."));

        draft.UpdateUserFields(
            request.ProductType,
            request.Category,
            request.Width,
            request.Height,
            request.Length,
            request.Weight,
            request.Diameter,
            request.FragilityType,
            request.IsStackable,
            request.MaxStackCount,
            request.MaxWeightOnTop,
            request.AllowedRotations,
            request.Barcode,
            request.ImageUrl,
            request.StackGroup,
            request.SpecialNotes,
            request.ConstraintIds);

        _draftItemRepository.Update(draft);
        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
