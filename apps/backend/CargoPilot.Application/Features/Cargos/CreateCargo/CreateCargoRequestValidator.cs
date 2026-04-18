using FluentValidation;

namespace CargoPilot.Application.Features.Cargos.CreateCargo;

// Bu sinif CreateCargoRequest icin toplam 3 kural tanimlar:
//   1) TrackingNumber bos olamaz
//   2) TrackingNumber en fazla 64 karakter olabilir
//   3) Status gonderildiyse (null degilse) gecerli bir CargoStatus enum degeri olmalidir
public class CreateCargoRequestValidator : AbstractValidator<CreateCargoRequest>
{
    public CreateCargoRequestValidator()
    {
        RuleFor(x => x.TrackingNumber)
            // Kural 1: null/bos/yalniz bosluk karakteri kabul edilmez.
            .NotEmpty().WithMessage("TrackingNumber zorunludur.")
            // Kural 2: ust sinir 64 karakter; DB kolon boyutu ile hizali tutulmali.
            .MaximumLength(64).WithMessage("TrackingNumber en fazla 64 karakter olabilir.");

        RuleFor(x => x.Status!.Value)
            // Kural 3: Status opsiyonel; gonderildiyse CargoStatus enum'unda tanimli bir deger olmali.
            // .When() sayesinde null/gonderilmemis durumda bu kural calismaz ve varsayilan CargoStatus.Created kullanilir.
            .IsInEnum().WithMessage("Status gecerli bir deger olmalidir.")
            .When(x => x.Status.HasValue);
    }
}
