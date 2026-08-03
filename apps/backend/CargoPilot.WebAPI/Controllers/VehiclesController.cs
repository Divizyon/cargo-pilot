using CargoPilot.Application.Features.Vehicles.AddVehicleFavorite;
using CargoPilot.Application.Features.Vehicles.CreateVehicle;
using CargoPilot.Application.Features.Vehicles.DeleteVehicle;
using CargoPilot.Application.Features.Vehicles.DuplicateVehicle;
using CargoPilot.Application.Features.Vehicles.GetVehicleById;
using CargoPilot.Application.Features.Vehicles.RemoveVehicleFavorite;
using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using CargoPilot.Application.Features.Vehicles.UpdateVehicle;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CargoPilot.WebAPI.Controllers;

/// <summary>
/// Araç yönetimi endpoint'leri.
/// </summary>
[Route("api/v1/vehicles")]
[Tags("Vehicles")]
[Authorize(Policy = "CompanyMember")]
public sealed class VehiclesController : BaseController {
    private readonly IMediator _mediator;

    public VehiclesController(IMediator mediator) {
        _mediator = mediator;
    }

    /// <summary>
    /// Araçları arar ve sayfalı döndürür. Favoriler listenin üstünde yer alır.
    /// </summary>
    /// <param name="searchTerm">Araç adı veya plaka arama terimi (opsiyonel).</param>
    /// <param name="vehicleType">Araç tipi filtresi (opsiyonel).</param>
    /// <param name="isActive">Aktif/arşivlenmiş filtresi (opsiyonel).</param>
    /// <param name="status">Durum filtresi: "active", "pasif" veya "taslak" (opsiyonel).</param>
    /// <param name="onlyFavorites">Yalnızca favorileri döndürür (opsiyonel).</param>
    /// <param name="page">Sayfa numarası (varsayılan: 1).</param>
    /// <param name="pageSize">Sayfa boyutu, 1-100 arası (varsayılan: 20). isExport=true ise göz ardı edilir.</param>
    /// <param name="isExport">Tüm kayıtları pagination olmadan döndürmek için true geçin.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Arama sonuçları sayfalı döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string? searchTerm,
        [FromQuery] VehicleType? vehicleType,
        [FromQuery] bool? isActive,
        [FromQuery] string? status,
        [FromQuery] bool? onlyFavorites,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool isExport = false,
        CancellationToken cancellationToken = default) {
        bool? isDraft = status?.ToLowerInvariant() switch {
            VehicleStatus.Draft => true,
            VehicleStatus.Active => false,
            _ => null
        };
        bool? effectiveIsActive = status?.ToLowerInvariant() switch {
            VehicleStatus.Active => true,
            VehicleStatus.Passive => false,
            _ => isActive
        };
        var query = new SearchVehiclesQuery(
            SearchTerm: searchTerm,
            VehicleType: vehicleType,
            IsActive: effectiveIsActive,
            OnlyFavorites: onlyFavorites,
            Page: page,
            PageSize: pageSize,
            IsExport: isExport,
            IsDraft: isDraft);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bir aracın tüm teknik detaylarını ve kayıt bilgilerini döndürür.
    /// </summary>
    /// <param name="id">Araç ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Araç detayı döner.</response>
    /// <response code="404">Araç bulunamadı.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default) {
        var query = new GetVehicleByIdQuery(id);
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Yeni bir araç oluşturur.
    /// </summary>
    /// <param name="request">Araç bilgileri.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="201">Araç oluşturuldu; ID döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="409">Plaka zaten kullanımda.</response>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromBody] CreateVehicleRequest request,
        CancellationToken cancellationToken = default) {
        var command = new CreateVehicleCommand(
            request.VehicleName,
            request.Description,
            request.VehicleType,
            request.PlateNumber,
            request.InternalWidth,
            request.InternalHeight,
            request.InternalLength,
            request.MaxWeightCapacity,
            request.LayerCount,
            request.LoadingType,
            request.KingPinDistanceMm,
            request.KingPinTareWeightKg,
            request.KingPinMaxLoadKg,
            request.MainAxleDistanceMm,
            request.MainAxleTareWeightKg,
            request.MainAxleMaxLoadKg,
            request.AdditionalAxleDistanceMm,
            request.AdditionalAxleTareWeightKg,
            request.AdditionalAxleMaxLoadKg,
            IsDraft: request.IsDraft ?? false);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);
        return HandleResult(result);
    }

    /// <summary>
    /// Mevcut bir aracı günceller.
    /// </summary>
    /// <param name="id">Güncellenecek araç ID'si.</param>
    /// <param name="request">Güncellenecek araç bilgileri.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Araç güncellendi; ID döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Araç bulunamadı.</response>
    /// <response code="409">Plaka zaten kullanımda.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        [FromRoute] Guid id,
        [FromBody] UpdateVehicleRequest request,
        CancellationToken cancellationToken = default) {
        var command = new UpdateVehicleCommand(
            id,
            request.VehicleName,
            request.Description,
            request.VehicleType,
            request.PlateNumber,
            request.InternalWidth,
            request.InternalHeight,
            request.InternalLength,
            request.MaxWeightCapacity,
            request.LayerCount,
            request.LoadingType,
            request.IsActive,
            request.KingPinDistanceMm,
            request.KingPinTareWeightKg,
            request.KingPinMaxLoadKg,
            request.MainAxleDistanceMm,
            request.MainAxleTareWeightKg,
            request.MainAxleMaxLoadKg,
            request.AdditionalAxleDistanceMm,
            request.AdditionalAxleTareWeightKg,
            request.AdditionalAxleMaxLoadKg,
            IsDraft: request.IsDraft);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bir aracı arşivler (soft delete). Aktif yükleme planında kullanılan araç arşivlenemez.
    /// </summary>
    /// <param name="id">Arşivlenecek araç ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Araç arşivlendi; ID döner.</response>
    /// <response code="404">Araç bulunamadı.</response>
    /// <response code="409">Araç aktif bir yükleme planında kullanılıyor.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default) {
        var command = new DeleteVehicleCommand(id);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bir aracı favorilere ekler.
    /// </summary>
    /// <param name="id">Favoriye eklenecek araç ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Araç favorilere eklendi.</response>
    /// <response code="404">Araç bulunamadı.</response>
    /// <response code="409">Araç zaten favorilerde.</response>
    [HttpPost("{id:guid}/favorite")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddFavorite(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default) {
        var command = new AddVehicleFavoriteCommand(id);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Bir aracı favorilerden çıkarır.
    /// </summary>
    /// <param name="id">Favoriden çıkarılacak araç ID'si.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="200">Araç favorilerden çıkarıldı.</response>
    /// <response code="404">Araç favorilerde bulunamadı.</response>
    [HttpDelete("{id:guid}/favorite")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFavorite(
        [FromRoute] Guid id,
        CancellationToken cancellationToken = default) {
        var command = new RemoveVehicleFavoriteCommand(id);
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Mevcut bir aracı kopyalar; benzersiz alanlar (araç adı ve plaka) zorunlu olarak yeniden girilir.
    /// </summary>
    /// <param name="id">Kopyalanacak araç ID'si.</param>
    /// <param name="request">Yeni araç adı ve plakası.</param>
    /// <param name="cancellationToken">İptal token'ı.</param>
    /// <response code="201">Yeni araç oluşturuldu; ID döner.</response>
    /// <response code="400">Doğrulama hatası.</response>
    /// <response code="404">Kaynak araç bulunamadı.</response>
    /// <response code="409">Plaka zaten kullanımda.</response>
    [HttpPost("{id:guid}/duplicate")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Duplicate(
        [FromRoute] Guid id,
        [FromBody] DuplicateVehicleRequest request,
        CancellationToken cancellationToken = default) {
        var command = new DuplicateVehicleCommand(id, request.VehicleName, request.PlateNumber);
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsSuccess)
            return StatusCode(StatusCodes.Status201Created, result);
        return HandleResult(result);
    }
}
