using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.DeleteBusinessRule;

public sealed class DeleteBusinessRuleCommandHandler : IRequestHandler<DeleteBusinessRuleCommand, Result<Guid>>
{
    private readonly IBusinessRuleRepository _repository;

    public DeleteBusinessRuleCommandHandler(IBusinessRuleRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<Guid>> Handle(
        DeleteBusinessRuleCommand request,
        CancellationToken cancellationToken)
    {
        var rule = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (rule is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "BusinessRule.NotFound", "Kural bulunamadı."));

        rule.MarkAsDeleted();
        _repository.Update(rule);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(rule.Id);
    }
}
