using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

/// <summary>
/// Saglayici basina siparis yazici. Urun cekiminde oldugu gibi (bkz.
/// <see cref="IErpProductFetcher"/>) her saglayicinin kendi sema bilgisi vardir; kaydi
/// olmayan saglayici icin aktarim hic denenmez, acik hata doner.
/// </summary>
public interface IErpOrderWriter
{
    ErpProviderType ProviderType { get; }

    /// <summary>
    /// Siparisi ERP'ye yazar. Ayni siparis numarasi ERP'de zaten varsa yeni kayit
    /// olusturmaz ve <see cref="ErpOrderWriteResult.AlreadyExisted"/> doner.
    /// </summary>
    Task<ErpOrderWriteResult> WriteOrderAsync(
        string serverAddress,
        ErpCredentials credentials,
        ErpOrderDocument order,
        CancellationToken cancellationToken = default);
}
