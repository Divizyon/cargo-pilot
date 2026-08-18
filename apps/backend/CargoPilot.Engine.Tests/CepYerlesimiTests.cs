using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// OPT-15: sonradan gelen kutu var olan bir yığının ALTINA konabilir.
///
/// Dört istif kuralı (istiflenebilirlik, istif adedi, üst ağırlık, kırılganlık)
/// yalnızca AŞAĞI bakar — aday pozisyonun altında ne olduğunu sorar. Bu, "yeni
/// kutu daima yığının en üstüne konur" varsayımına dayanıyordu. Varsayım yanlış:
/// boşluk defteri iki kutu arasında kalan CEBİ aday olarak tutar (bu onun asıl
/// amacı), dolayısıyla bir kutu üstünde zaten yük olan bir yere yerleşebilir. O
/// kutunun KENDİ kısıtları hiçbir yerde sorulmaz.
///
/// Senaryo, köprü kurulmasını zorlayarak bunu üretir:
///   • İki sütun yan yana (0-80 ve 80-160), yükseklik 120.
///   • Üstlerine tam genişlikte ince bir köprü (%80 destek, tam eşikte).
///   • Geriye 160-200 arasında, köprünün ALTINDA bir cep kalır.
///   • Cebe sığan son kutu kırılgandır; üstüne köprü biner.
///
/// Sıralama hacim-azalandır ve ölçüler bu sırayı verecek şekilde seçilmiştir:
/// sütunlar (1.920.000) → köprü (800.000) → cep kutusu (480.000). Yönelimler
/// <c>Fixed</c>'dir; serbest bırakılırsa motor kutuları döndürür ve kurgulanan
/// geometri dağılır.
/// </summary>
public sealed class CepYerlesimiTests
{
    private const decimal VehicleWidth = 200m;
    private const decimal VehicleHeight = 200m;
    private const decimal VehicleLength = 400m;

    [Fact]
    public void Cebe_YerlesenKirilganKutunun_Ustune_YukBinemez()
    {
        const string senaryo = nameof(Cebe_YerlesenKirilganKutunun_Ustune_YukBinemez);
        var input = KopruSenaryosu(FragilityType.Fragile);

        PhysicalInvariants.AssertAll(senaryo, input, EngineScenario.Run(input));
    }

    /// <summary>
    /// Aynı kör nokta istif adedinde de var: cebe yerleşen kutunun
    /// <c>MaxStackCount</c>'u üstündeki yükle hiç karşılaştırılmıyordu.
    /// </summary>
    [Fact]
    public void Cebe_YerlesenIstiflenemezKutunun_Ustune_YukBinemez()
    {
        var input = KopruSenaryosu(FragilityType.NonFragile, pocketStackable: false);
        var result = EngineScenario.Run(input);

        var pocket = result.Placements.Where(p => p.ItemId == EngineScenario.ItemId(2)).ToList();

        foreach (var box in pocket)
        {
            var restsOnIt = result.Placements.Any(other =>
                other.Y == box.Y + box.Height
                && other.X < box.X + box.Width && box.X < other.X + other.Width
                && other.Z < box.Z + box.Length && box.Z < other.Z + other.Length);

            Assert.False(restsOnIt, $"İstiflenemez kutunun üstüne yük bindi: {box.X}/{box.Y}/{box.Z}.");
        }
    }


    private static OptimizationInput KopruSenaryosu(
        FragilityType pocketFragility,
        bool pocketStackable = true)
        => EngineScenario.Input(
            [
                // Iki sutun. Yukseklik 120 secildi cunku 2 x 120 arac yuksekligini
                // asar; boylece blok insasi bunlari ust uste degil YAN YANA koyar.
                EngineScenario.Item(0, width: 80m, height: 120m, length: 200m, weight: 10m, quantity: 2,
                    allowedRotations: AllowedRotations.Fixed),

                // Kopru: tam genislikte, iki sutunun uzerinde. Destek 160/200 = %80,
                // yani tam esikte gecer.
                EngineScenario.Item(1, width: 200m, height: 20m, length: 200m, weight: 5m, quantity: 1,
                    allowedRotations: AllowedRotations.Fixed),

                // Cep kutusu: 160-200 arasindaki bosluga tam oturur ve kopru onun
                // ustune biner.
                EngineScenario.Item(
                    2, width: 40m, height: 120m, length: 100m, weight: 1m, quantity: 1,
                    isStackable: pocketStackable,
                    allowedRotations: AllowedRotations.Fixed,
                    fragilityType: pocketFragility),
            ],
            LoadingPlanOptimizationCriteria.VolumeFirst,
            vehicleWidth: VehicleWidth,
            vehicleHeight: VehicleHeight,
            vehicleLength: VehicleLength,
            vehicleMaxWeight: 1_000m);
}
