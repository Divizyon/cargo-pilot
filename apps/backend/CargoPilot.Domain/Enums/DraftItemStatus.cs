namespace CargoPilot.Domain.Enums;

public enum DraftItemStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    UpdatePending = 3,

    /// <summary>ERP guncellemesi kullanici tarafindan reddedildi; urun onaylanmis halinde kalir.</summary>
    UpdateDismissed = 4
}
