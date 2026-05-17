using System.ComponentModel.DataAnnotations;

namespace CargoPilot.Application.Features.Vehicles.DuplicateVehicle;

public sealed record DuplicateVehicleRequest(
    [Required(ErrorMessage = "Araç adı zorunludur.")]
    [StringLength(200, ErrorMessage = "Araç adı en fazla 200 karakter olabilir.")]
    string VehicleName,

    [StringLength(50, ErrorMessage = "Plaka en fazla 50 karakter olabilir.")]
    string? PlateNumber);
