using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.CreateVehicle;

public sealed class CreateVehicleCommandValidator : AbstractValidator<CreateVehicleCommand> {
    public CreateVehicleCommandValidator() {
        RuleFor(x => x.VehicleName)
            .NotEmpty().WithMessage("Araç adı zorunludur.")
            .MaximumLength(200).WithMessage("Araç adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Açıklama en fazla 500 karakter olabilir.")
            .When(x => x.Description is not null);

        RuleFor(x => x.VehicleType)
            .IsInEnum().WithMessage("Geçersiz araç tipi.");

        When(x => x.PlateNumber is not null, () =>
            RuleFor(x => x.PlateNumber!)
                .MaximumLength(50).WithMessage("Plaka en fazla 50 karakter olabilir."));

        RuleFor(x => x.InternalWidth)
            .GreaterThan(0).WithMessage("İç genişlik sıfırdan büyük olmalıdır.");

        RuleFor(x => x.InternalHeight)
            .GreaterThan(0).WithMessage("İç yükseklik sıfırdan büyük olmalıdır.");

        RuleFor(x => x.InternalLength)
            .GreaterThan(0).WithMessage("İç uzunluk sıfırdan büyük olmalıdır.");

        RuleFor(x => x.MaxWeightCapacity)
            .GreaterThan(0).WithMessage("Maksimum yük kapasitesi sıfırdan büyük olmalıdır.");

        RuleFor(x => x.LayerCount)
            .GreaterThanOrEqualTo(1).WithMessage("Kat sayısı en az 1 olmalıdır.");

        RuleFor(x => x.LoadingType)
            .IsInEnum().WithMessage("Geçersiz yükleme tipi.");

        When(x => x.KingPinDistanceMm.HasValue, () =>
            RuleFor(x => x.KingPinDistanceMm!.Value)
                .GreaterThan(0).WithMessage("KingPin mesafesi sıfırdan büyük olmalıdır."));

        When(x => x.KingPinTareWeightKg.HasValue, () =>
            RuleFor(x => x.KingPinTareWeightKg!.Value)
                .GreaterThan(0).WithMessage("KingPin dara ağırlığı sıfırdan büyük olmalıdır."));

        When(x => x.KingPinMaxLoadKg.HasValue, () =>
            RuleFor(x => x.KingPinMaxLoadKg!.Value)
                .GreaterThan(0).WithMessage("KingPin maksimum yük sıfırdan büyük olmalıdır."));

        When(x => x.MainAxleDistanceMm.HasValue, () =>
            RuleFor(x => x.MainAxleDistanceMm!.Value)
                .GreaterThan(0).WithMessage("Ana aks mesafesi sıfırdan büyük olmalıdır."));

        When(x => x.MainAxleTareWeightKg.HasValue, () =>
            RuleFor(x => x.MainAxleTareWeightKg!.Value)
                .GreaterThan(0).WithMessage("Ana aks dara ağırlığı sıfırdan büyük olmalıdır."));

        When(x => x.MainAxleMaxLoadKg.HasValue, () =>
            RuleFor(x => x.MainAxleMaxLoadKg!.Value)
                .GreaterThan(0).WithMessage("Ana aks maksimum yük sıfırdan büyük olmalıdır."));

        When(x => x.AdditionalAxleDistanceMm.HasValue, () =>
            RuleFor(x => x.AdditionalAxleDistanceMm!.Value)
                .GreaterThan(0).WithMessage("Ek aks mesafesi sıfırdan büyük olmalıdır."));

        When(x => x.AdditionalAxleTareWeightKg.HasValue, () =>
            RuleFor(x => x.AdditionalAxleTareWeightKg!.Value)
                .GreaterThan(0).WithMessage("Ek aks dara ağırlığı sıfırdan büyük olmalıdır."));

        When(x => x.AdditionalAxleMaxLoadKg.HasValue, () =>
            RuleFor(x => x.AdditionalAxleMaxLoadKg!.Value)
                .GreaterThan(0).WithMessage("Ek aks maksimum yük sıfırdan büyük olmalıdır."));
    }
}
