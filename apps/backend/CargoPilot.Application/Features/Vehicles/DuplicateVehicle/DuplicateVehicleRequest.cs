using System.ComponentModel.DataAnnotations;

namespace CargoPilot.Application.Features.Vehicles.DuplicateVehicle;

public sealed record DuplicateVehicleRequest(
    [Required(ErrorMessage = "Araç adı zorunludur.")]
    [StringLength(200, ErrorMessage = "Araç adı en fazla 200 karakter olabilir.")]
    string VehicleName,

    // Plaka opsiyonel: konteynerin plakasi yoktur (o alan seri numarasi tasir)
    // ve kopyalama diyalogu da "Plaka opsiyoneldir" diyerek bos gonderiyor.
    // [Required] bos dizeyi reddettigi icin istek model baglamada 400'e
    // dusuyordu — plakasiz arac hic kopyalanamiyordu.
    [StringLength(50, ErrorMessage = "Plaka en fazla 50 karakter olabilir.")]
    string? PlateNumber);
