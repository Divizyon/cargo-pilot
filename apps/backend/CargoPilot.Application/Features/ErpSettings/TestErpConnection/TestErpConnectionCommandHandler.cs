using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

internal sealed class TestErpConnectionCommandHandler : IRequestHandler<TestErpConnectionCommand, Result<ErpConnectionTestResponse>>
{
    private readonly IEnumerable<IErpConnector> _connectors;

    public TestErpConnectionCommandHandler(IEnumerable<IErpConnector> connectors)
    {
        _connectors = connectors;
    }

    public async Task<Result<ErpConnectionTestResponse>> Handle(TestErpConnectionCommand request, CancellationToken cancellationToken)
    {
        var connector = _connectors.FirstOrDefault(c => c.ProviderType == request.ProviderType);
        if (connector is null)
            return Result<ErpConnectionTestResponse>.Failure(
                new Error(ErrorType.Validation, "ErpSettings.UnsupportedProvider", "Desteklenmeyen ERP sağlayıcısı."));

        ErpCredentials credentials;
        try
        {
            credentials = ErpCredentials.Create(
                request.CompanyCode, request.Username, request.Password, request.TrustServerCertificate);
        }
        catch (ErpConfigurationException ex)
        {
            return Result<ErpConnectionTestResponse>.Failure(
                new Error(ErrorType.Validation, "ErpSettings.CredentialsInvalid", ex.Message));
        }

        var result = await connector.TestConnectionAsync(request.ServerAddress, credentials, cancellationToken);

        var message = result.IsSuccess
            ? "Bağlantı başarılı."
            : result.ErrorMessage ?? "ERP sistemine bağlanılamadı.";

        return Result<ErpConnectionTestResponse>.Success(
            new ErpConnectionTestResponse(result.IsSuccess, message));
    }
}
