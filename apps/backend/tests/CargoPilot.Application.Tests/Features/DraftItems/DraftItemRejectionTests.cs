using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.DraftItems.ReinstateDraftItem;
using CargoPilot.Application.Features.DraftItems.RejectDraftItem;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.DraftItems;

/// <summary>Kalici ret semantigi: reddetme ve elle geri alma yollari.</summary>
public sealed class DraftItemRejectionTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid IntegrationId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly IDraftItemRepository _draftItemRepository = Substitute.For<IDraftItemRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private DraftItem Arrange(Action<DraftItem>? mutate = null)
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId);
        mutate?.Invoke(draft);
        _draftItemRepository.GetByIdAsync(draft.Id, CompanyId, Arg.Any<CancellationToken>()).Returns(draft);
        return draft;
    }

    private RejectDraftItemCommandHandler CreateRejectSut() =>
        new(_draftItemRepository, _currentUserService);

    private ReinstateDraftItemCommandHandler CreateReinstateSut() =>
        new(_draftItemRepository, _currentUserService);

    [Fact]
    public async Task Reject_BekleyenTaslak_RejectedOlur()
    {
        var draft = Arrange();

        var result = await CreateRejectSut().Handle(new RejectDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        draft.Status.Should().Be(DraftItemStatus.Rejected);
    }

    [Fact]
    public async Task Reject_GuncellemeReddi_ApprovedYerineUpdateDismissedOlur()
    {
        var draft = Arrange(d => d.SetUpdatePending("SKU-YENI", "Yeni Ad", "{}"));

        var result = await CreateRejectSut().Handle(new RejectDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        draft.Status.Should().Be(DraftItemStatus.UpdateDismissed);
    }

    [Fact]
    public async Task Reject_OnaylanmisTaslak_ConflictDoner()
    {
        var draft = Arrange(d => d.Approve());

        var result = await CreateRejectSut().Handle(new RejectDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("DraftItem.AlreadyApproved");
        draft.Status.Should().Be(DraftItemStatus.Approved);
    }

    [Fact]
    public async Task Reject_GuncellemesiReddedilmisTaslak_RejectedeCevrilmez()
    {
        var draft = Arrange(d => d.DismissUpdate());

        var result = await CreateRejectSut().Handle(new RejectDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        draft.Status.Should().Be(DraftItemStatus.UpdateDismissed);
        _draftItemRepository.DidNotReceiveWithAnyArgs().Update(default!);
    }

    [Fact]
    public async Task Reinstate_ReddedilmisTaslak_PendingeDoner()
    {
        var draft = Arrange(d => d.Reject());

        var result = await CreateReinstateSut().Handle(new ReinstateDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        draft.Status.Should().Be(DraftItemStatus.Pending);
        _draftItemRepository.Received(1).Update(draft);
    }

    [Fact]
    public async Task Reinstate_GuncellemesiReddedilmisTaslak_UpdatePendingeDoner()
    {
        var draft = Arrange(d => d.DismissUpdate());

        var result = await CreateReinstateSut().Handle(new ReinstateDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        draft.Status.Should().Be(DraftItemStatus.UpdatePending);
    }

    [Fact]
    public async Task Reinstate_ReddedilmemisTaslak_ConflictDoner()
    {
        var draft = Arrange();

        var result = await CreateReinstateSut().Handle(new ReinstateDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("DraftItem.NotRejected");
        draft.Status.Should().Be(DraftItemStatus.Pending);
    }

    [Fact]
    public async Task Reinstate_TaslakYoksa_NotFoundDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _draftItemRepository.GetByIdAsync(Arg.Any<Guid>(), CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        var result = await CreateReinstateSut().Handle(new ReinstateDraftItemCommand(Guid.NewGuid()), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("DraftItem.NotFound");
    }
}
