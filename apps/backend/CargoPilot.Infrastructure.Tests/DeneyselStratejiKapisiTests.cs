using CargoPilot.Application.Common.Optimization;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Plans.CreatePlan;
using CargoPilot.Application.Features.Plans.ReOptimizePlan;
using CargoPilot.Domain.Enums;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Deneysel yerlestirici/sequencer alanlarinin ozellik anahtariyla korundugunu
/// sabitler (ALGORITMA-YOL-HARITASI.md F0-4b).
///
/// Kritik olan reddin BICIMI: bayrak kapaliyken istek sessizce Greedy'ye
/// dusurulmez, dogrulama hatasi verir. Sessiz dusurme, istemcinin hangi motorun
/// kostugunu bilmedigi olcumler uretirdi.
/// </summary>
public sealed class DeneyselStratejiKapisiTests
{
    private static readonly Guid VehicleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ItemId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static CreatePlanCommandValidator CreateValidator(bool enabled)
        => new(Options.Create(new OptimizationSettings { EnableExperimentalStrategies = enabled }));

    private static ReOptimizePlanCommandValidator ReOptimizeValidator(bool enabled)
        => new(Options.Create(new OptimizationSettings { EnableExperimentalStrategies = enabled }));

    private static CreatePlanCommand CreateCommand(
        PlacementStrategy strategy = PlacementStrategy.Greedy,
        SequencerKind? sequencer = SequencerKind.Static,
        int seed = 0)
        => new(
            PlanName: "Test",
            VehicleId: VehicleId,
            Items: [new CreatePlanItemRequest(ItemId, 1)],
            OptimizationCriteria: LoadingPlanOptimizationCriteria.VolumeFirst,
            Groups: null,
            ClusterGroups: true,
            PlacementStrategy: strategy,
            Sequencer: sequencer,
            Seed: seed);

    /// <summary>
    /// Sequencer belirtilmediginde duvar orucu GRASP kosar (`DR-13`): 700
    /// ornekli olcumde arama dolulugu %79,86'dan %85,32'ye cikariyor ve
    /// istemcinin bunu ayrica istemesi gerekmemeli.
    /// </summary>
    [Fact]
    public void SequencerBelirtilmezse_DuvarOrucu_GraspKosar()
        => Assert.Equal(
            SequencerKind.Grasp,
            SequencerSelection.Resolve(PlacementStrategy.WallBuilder, requested: null));

    /// <summary>
    /// Greedy'nin cevabi degismez. Greedy zaten sequencer okumaz ama cozum
    /// buradan gectigi icin bugunku deger acikca kilitlenir (`DR-01`).
    /// </summary>
    [Fact]
    public void SequencerBelirtilmezse_Greedy_StaticKalir()
        => Assert.Equal(
            SequencerKind.Static,
            SequencerSelection.Resolve(PlacementStrategy.Greedy, requested: null));

    /// <summary>Acikca istenen sequencer her zaman kazanir.</summary>
    [Fact]
    public void SequencerBelirtilirse_Cozum_OnuDegistirmez()
        => Assert.Equal(
            SequencerKind.Static,
            SequencerSelection.Resolve(PlacementStrategy.WallBuilder, SequencerKind.Static));

    /// <summary>
    /// Sequencer opsiyonel hale geldi; belirtilmemis istek bayrak kapaliyken de
    /// gecerli olmali, aksi halde bugunku varsayilan cagri yolu kirilirdi.
    /// </summary>
    [Fact]
    public void BayrakKapali_SequencerBelirtilmemis_Gecerli()
    {
        var result = CreateValidator(enabled: false).Validate(CreateCommand(sequencer: null));

        Assert.True(result.IsValid);
    }

    /// <summary>
    /// Belirtilmemis sequencer bir kacamak degildir: duvar orucu bayrak
    /// kapaliyken yine reddedilir.
    /// </summary>
    [Fact]
    public void BayrakKapali_WallBuilder_SequencerBelirtilmemis_Reddedilir()
    {
        var result = CreateValidator(enabled: false)
            .Validate(CreateCommand(strategy: PlacementStrategy.WallBuilder, sequencer: null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void BayrakKapali_Varsayilanlar_Gecerli()
    {
        var result = CreateValidator(enabled: false).Validate(CreateCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void BayrakKapali_WallBuilder_Reddedilir()
    {
        var result = CreateValidator(enabled: false)
            .Validate(CreateCommand(strategy: PlacementStrategy.WallBuilder));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void BayrakKapali_GwcaSequencer_Reddedilir()
    {
        var result = CreateValidator(enabled: false)
            .Validate(CreateCommand(sequencer: SequencerKind.Gwca));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void BayrakAcik_WallBuilder_Kabul()
    {
        var result = CreateValidator(enabled: true)
            .Validate(CreateCommand(strategy: PlacementStrategy.WallBuilder, sequencer: SequencerKind.Gwca));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void NegatifTohum_Reddedilir()
    {
        var result = CreateValidator(enabled: true).Validate(CreateCommand(seed: -1));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void TanimsizStrateji_Reddedilir()
    {
        var result = CreateValidator(enabled: true)
            .Validate(CreateCommand(strategy: (PlacementStrategy)99));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void YenidenOptimizasyon_AyniKapiyiUygular()
    {
        var command = new ReOptimizePlanCommand(
            Id: Guid.NewGuid(),
            VehicleId: VehicleId,
            Items: [new ReOptimizePlanItemRequest(ItemId, 1)],
            OptimizationCriteria: LoadingPlanOptimizationCriteria.VolumeFirst,
            Groups: null,
            ClusterGroups: true,
            PlacementStrategy: PlacementStrategy.WallBuilder);

        Assert.False(ReOptimizeValidator(enabled: false).Validate(command).IsValid);
        Assert.True(ReOptimizeValidator(enabled: true).Validate(command).IsValid);
    }
}
