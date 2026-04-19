namespace CargoPilot.Domain.Entities;

public abstract class BaseEntity {
    public Guid Id { get; protected set; }

    // EF Core sets these via ChangeTracker.CurrentValue (bypasses C# setters at CLR level).
    // S1144 cannot detect runtime assignments made through reflection/expression trees.
#pragma warning disable S1144
    public DateTime CreatedDate { get; private set; }
    public DateTime UpdatedDate { get; private set; }
    public bool IsDeleted { get; private set; }
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
}
