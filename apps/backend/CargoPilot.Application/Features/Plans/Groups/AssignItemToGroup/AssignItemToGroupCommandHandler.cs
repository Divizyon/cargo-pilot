using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.AssignItemToGroup;

internal sealed class AssignItemToGroupCommandHandler : IRequestHandler<AssignItemToGroupCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly ICurrentUserService _currentUserService;

    public AssignItemToGroupCommandHandler(
        ILoadingPlanRepository planRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        ICurrentUserService currentUserService)
    {
        _planRepository = planRepository;
        _groupRepository = groupRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(AssignItemToGroupCommand request, CancellationToken cancellationToken)
    {
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
