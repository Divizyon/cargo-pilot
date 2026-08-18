using CargoPilot.Application.Common.Optimization;
using CargoPilot.Application.Features.Plans.CreatePlan;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Sequencer seçimi ve girdi doğrulaması.
///
/// Bu dosya `DeneyselStratejiKapisiTests`'in yerini aldı. O dosya
/// `EnableExperimentalStrategies` bayrağının davranışını kilitliyordu; bayrak
/// kaldırıldı (`DR-39`) çünkü kapattığı yol artık **tek yol**. Bayrağın kendisi
/// gittiği hâlde altındaki iki soru geçerli kaldı ve buraya taşındı:
/// belirtilmemiş sequencer neye çözülür, ve geçersiz girdi reddedilir mi.
/// </summary>
public sealed class SequencerSecimiTests
{
    private static readonly Guid VehicleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ItemId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static CreatePlanCommandValidator Validator() => new();

    private static CreatePlanCommand Command(SequencerKind? sequencer = null, int seed = 0)
        => new(
            PlanName: "Test",
            VehicleId: VehicleId,
            Items: [new CreatePlanItemRequest(ItemId, 1)],
            OptimizationCriteria: LoadingPlanOptimizationCriteria.VolumeFirst,
            Groups: null,
            ClusterGroups: true,
            Sequencer: sequencer,
            Seed: seed);

    /// <summary>
    /// Sequencer belirtilmediğinde GRASP koşar (`DR-24`): arama doluluğu
    /// %80,09'dan %86,23'e çıkarıyor ve istemcinin bunu ayrıca istemesi
    /// gerekmemeli.
    /// </summary>
    [Fact]
    public void SequencerBelirtilmezse_GraspKosar()
        => Assert.Equal(
            SequencerKind.Grasp,
            SequencerSelection.Resolve(requested: null));

    /// <summary>Açıkça istenen sequencer her zaman kazanır.</summary>
    [Theory]
    [InlineData(SequencerKind.Static)]
    [InlineData(SequencerKind.Ga)]
    [InlineData(SequencerKind.Gwca)]
    public void SequencerBelirtilirse_Cozum_OnuDegistirmez(SequencerKind requested)
        => Assert.Equal(requested, SequencerSelection.Resolve(requested));

    /// <summary>Belirtilmemiş sequencer geçerli bir istektir; çözüm onu doldurur.</summary>
    [Fact]
    public void SequencerBelirtilmemis_Istek_Gecerli()
        => Assert.True(Validator().Validate(Command()).IsValid);

    [Fact]
    public void TanimsizSequencer_Reddedilir()
        => Assert.False(Validator().Validate(Command(sequencer: (SequencerKind)99)).IsValid);

    [Fact]
    public void NegatifTohum_Reddedilir()
        => Assert.False(Validator().Validate(Command(seed: -1)).IsValid);
}
