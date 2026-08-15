using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.DeleteErpSettings;

/// <summary>
/// Sirketin ERP baglantisini kaldirir: kimlik bilgileri silinir, entegrasyon kaydi
/// pasiflestirilir. Senkronizasyon gecmisi korunur.
/// </summary>
public record DeleteErpSettingsCommand : IRequest<Result<bool>>;
