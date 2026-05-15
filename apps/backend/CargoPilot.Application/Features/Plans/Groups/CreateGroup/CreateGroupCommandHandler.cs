using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.CreateGroup;

internal sealed class CreateGroupCommandHandler : IRequestHandler<CreateGroupCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreateGroupCommand> _validator;

    public CreateGroupCommandHandler(
        ILoadingPlanRepository planRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        ICurrentUserService currentUserService,
        IValidator<CreateGroupCommand> validator)
    {
        _planRepository = planRepository;
        _groupRepository = groupRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(CreateGroupCommand request, CancellationToken cancellationToken)
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

        var group = new LoadingPlanItemGroup(Guid.NewGuid(), plan.Id, request.Name, request.Color, request.UnloadingOrder);
        _groupRepository.Add(group);
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(group.Id);
    }
}
