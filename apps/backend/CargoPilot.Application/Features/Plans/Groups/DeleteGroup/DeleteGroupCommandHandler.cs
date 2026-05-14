using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.DeleteGroup;

internal sealed class DeleteGroupCommandHandler : IRequestHandler<DeleteGroupCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<DeleteGroupCommand> _validator;

    public DeleteGroupCommandHandler(
        ILoadingPlanRepository planRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        ICurrentUserService currentUserService,
        IValidator<DeleteGroupCommand> validator)
    {
        _planRepository = planRepository;
        _groupRepository = groupRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(DeleteGroupCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var plan = await _planRepository.GetByIdAsync(request.PlanId, companyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        var group = await _groupRepository.GetByIdAsync(request.GroupId, plan.Id, cancellationToken);
        if (group is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Group.NotFound", "Grup bulunamadı."));

        if (request.MoveItemsToNull)
            await _groupRepository.NullifyGroupOnItemsAsync(group.Id, cancellationToken);
        else
            await _groupRepository.DeleteItemsByGroupAsync(group.Id, cancellationToken);

        group.MarkAsDeleted();
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(group.Id);
    }
}
