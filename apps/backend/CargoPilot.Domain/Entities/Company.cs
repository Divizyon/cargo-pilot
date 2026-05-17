using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Company : BaseEntity {
    public string Name { get; private set; } = null!;
    public string? Address { get; private set; }
    public string? LogoUrl { get; private set; }
    public SubscriptionType SubscriptionType { get; private set; }
    public int MaxUserCount { get; private set; }
    public DateTime? TrialEndsAt { get; private set; }
    public ICollection<AppUser> Users { get; } = [];
    public ICollection<Vehicle> Vehicles { get; } = [];
    public ICollection<Item> Items { get; } = [];
    public ICollection<Integration> Integrations { get; } = [];

    private Company() { }

    public Company(
        Guid id,
        string name,
        SubscriptionType subscriptionType,
        int maxUserCount = 5,
        string? address = null,
        string? logoUrl = null) : base(id) {
        Name = name;
        Address = address;
        LogoUrl = logoUrl;
        SubscriptionType = subscriptionType;
        MaxUserCount = maxUserCount;
    }

    public void UpdateName(string name) => Name = name.Trim();
    public void SetTrial(DateTime trialEndsAt) => TrialEndsAt = trialEndsAt;
    public void SetLogoUrl(string url) => LogoUrl = url;
}
