namespace CargoPilot.Domain.Entities;

/// <summary>
/// Temel (Base) Entity sınıfı. Tüm domain entity'leri bu sınıftan türer.
/// </summary>
public abstract class BaseEntity {
    /// <summary>
    /// Benzersiz nesne kimliği.
    /// </summary>
    public Guid Id { get; protected set; }

    // EF Core sets these via ChangeTracker.CurrentValue (bypasses C# setters at CLR level).
    // S1144 cannot detect runtime assignments made through reflection/expression trees.
#pragma warning disable S1144
    /// <summary>
    /// Kaydın oluşturulma zamanı.
    /// </summary>
    public DateTime CreatedDate { get; private set; }
    
    /// <summary>
    /// Kaydın son güncellenme zamanı.
    /// </summary>
    public DateTime UpdatedDate { get; private set; }
    
    /// <summary>
    /// Silindi olarak işaretlenmiş mi. (Soft-Delete)
    /// </summary>
    public bool IsDeleted { get; private set; }
    
    /// <summary>
    /// Kaydı oluşturan kullanıcının Id'si.
    /// </summary>
    public Guid? CreatedBy { get; private set; }
    
    /// <summary>
    /// Kaydı güncelleyen kullanıcının Id'si.
    /// </summary>
    public Guid? UpdatedBy { get; private set; }
#pragma warning restore S1144

    /// <summary>
    /// Parametresiz yapıcı (Constructor) - EF Core gibi yapılar için gereklidir.
    /// </summary>
    protected BaseEntity() { }

    /// <summary>
    /// Özel ID ile Entity oluşturur.
    /// </summary>
    /// <param name="id">Nesnenin Guid Id'si</param>
    protected BaseEntity(Guid id) {
        if (id == Guid.Empty) {
            throw new ArgumentException("Entity id cannot be empty.", nameof(id));
        }

        Id = id;
    }
}
