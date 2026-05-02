namespace CargoPilot.Domain.Entities;

public abstract class BaseEntity {
    public Guid Id { get; protected set; }

    // EF Core sets these via ChangeTracker.CurrentValue (bypasses CLR setter usage analysis).
#pragma warning disable S1144
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? UpdatedAtUtc { get; private set; }
    public DateTime? DeletedAtUtc { get; private set; }
    public bool IsDeleted { get; private set; }
    public bool IsActive { get; private set; }
    public Guid? CreatedBy { get; private set; }
    public Guid? UpdatedBy { get; private set; }
#pragma warning restore S1144

    protected BaseEntity() { }

    protected BaseEntity(Guid id) {
        if (id == Guid.Empty) {
            throw new ArgumentException("Entity id cannot be empty.", nameof(id));
        }

        Id = id;
    }

    public void MarkAsDeleted() {
        IsDeleted = true;
        IsActive = false;
    }

    protected void Activate() => IsActive = true;
    protected void Deactivate() => IsActive = false;
}
