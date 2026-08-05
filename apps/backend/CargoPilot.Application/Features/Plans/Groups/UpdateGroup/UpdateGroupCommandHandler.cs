using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.UpdateGroup;

internal sealed class UpdateGroupCommandHandler : IRequestHandler<UpdateGroupCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpdateGroupCommandHandler(
        ILoadingPlanRepository planRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        ICurrentUserService currentUserService)
    {
        _planRepository = planRepository;
        _groupRepository = groupRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(UpdateGroupCommand request, CancellationToken cancellationToken)
    {
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

        group.Update(request.Name, request.Color, request.UnloadingOrder);
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(group.Id);
    }
}
