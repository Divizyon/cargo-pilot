using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Fiziksel geçerlilik testleri. Golden-master testleri motorun bugünkü
/// çıktısını kilitler; bu paket ise çıktının fizik kurallarını hiç ihlal
/// etmediğini doğrular. Snapshot değişse bile bu değişmezler geçerli kalmalıdır.
///
/// Senaryolar <see cref="InvariantScenarioSource"/> üzerinden gelir: diskteki
/// tüm golden senaryolar ve üç kriterin 500 kutuluk performans senaryosu.
/// </summary>
public sealed class InvariantTests
{
    /// <summary>Katalogdaki tüm senaryo adları; yeni golden senaryo eklendiğinde kendiliğinden büyür.</summary>
    public static TheoryData<string> Senaryolar { get; } = BuildSenaryolar();

    /// <summary>
    /// Üretilen her plan altı değişmezi sağlamalıdır: çakışmasızlık, araç
    /// sınırları, %80 destek, ağırlık kapasitesi, adet korunumu ve kırılgan
    /// kutuların üstünün boş kalması.
    /// </summary>
    [Theory]
    [MemberData(nameof(Senaryolar))]
    public void Motor_UretilenPlan_FizikselDegismezleriKorur(string senaryo)
    {
        var input = InvariantScenarioSource.Load(senaryo);

        PhysicalInvariants.AssertAll(senaryo, input, EngineScenario.Run(input));
    }

    private static TheoryData<string> BuildSenaryolar()
    {
        var data = new TheoryData<string>();

        foreach (var name in InvariantScenarioSource.Names())
        {
            data.Add(name);
        }

        return data;
    }
}
