using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

public sealed class TestErpConnectionCommandHandler : IRequestHandler<TestErpConnectionCommand, Result<TestConnectionResultDto>>
{
    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly IErpConnectionTester _connectionTester;
    private readonly ICurrentUserService _currentUserService;

    public TestErpConnectionCommandHandler(
        IErpSettingsRepository erpSettingsRepository,
        IErpConnectionTester connectionTester,
        ICurrentUserService currentUserService)
    {
        _erpSettingsRepository = erpSettingsRepository;
        _connectionTester = connectionTester;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TestConnectionResultDto>> Handle(TestErpConnectionCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<TestConnectionResultDto>.Failure(
                new Error(ErrorType.Forbidden, "ErpSettings.NoCompany", "Bu işlem için bir şirket üyeliği gereklidir."));

        var settings = await _erpSettingsRepository.GetByCompanyIdAsync(companyId.Value, cancellationToken);
        if (settings is null)
            return Result<TestConnectionResultDto>.Failure(
                new Error(ErrorType.NotFound, "ErpSettings.NotFound", "Bu şirket için ERP ayarı henüz yapılandırılmamış."));

        var (success, message) = await _connectionTester.TestAsync(settings.ServerAddress, cancellationToken);
        return Result<TestConnectionResultDto>.Success(new TestConnectionResultDto(success, message));
    }
}
