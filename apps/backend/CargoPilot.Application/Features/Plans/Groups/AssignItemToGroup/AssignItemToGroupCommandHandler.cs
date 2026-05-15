using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.AssignItemToGroup;

internal sealed class AssignItemToGroupCommandHandler : IRequestHandler<AssignItemToGroupCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<AssignItemToGroupCommand> _validator;

    public AssignItemToGroupCommandHandler(
        ILoadingPlanRepository planRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        ICurrentUserService currentUserService,
        IValidator<AssignItemToGroupCommand> validator)
    {
        _planRepository = planRepository;
        _groupRepository = groupRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(AssignItemToGroupCommand request, CancellationToken cancellationToken)
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

        var inputItem = await _planRepository.GetInputItemByIdAsync(request.InputItemId, plan.Id, cancellationToken);
        if (inputItem is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "InputItem.NotFound", "Ürün bulunamadı."));

        if (request.GroupId.HasValue)
        {
            var group = await _groupRepository.GetByIdAsync(request.GroupId.Value, plan.Id, cancellationToken);
            if (group is null)
                return Result<Guid>.Failure(
                    new Error(ErrorType.NotFound, "Group.NotFound", "Grup bulunamadı."));
        }

        inputItem.AssignGroup(request.GroupId);
        await _planRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(inputItem.Id);
    }
}
