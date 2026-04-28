namespace CargoPilot.Domain.Entities;

public sealed class IpLoginAttempt {
    private const int _maxFailedAttempts = 5;
    private static readonly int[] _lockoutDurationsMinutes = [2, 5, 10];

    public string IpAddress { get; private set; } = null!;
    public int FailedAttempts { get; private set; }
    public int LockoutCount { get; private set; }
    public DateTime? LockoutEndUtc { get; private set; }
    public DateTime LastAttemptUtc { get; private set; }

    private IpLoginAttempt() { }

    public IpLoginAttempt(string ipAddress) {
        IpAddress = ipAddress;
        LastAttemptUtc = DateTime.UtcNow;
    }

    public bool IsLockedOut() =>
        LockoutEndUtc.HasValue && LockoutEndUtc.Value > DateTime.UtcNow;

    public void RecordFailedAttempt() {
        FailedAttempts++;
        LastAttemptUtc = DateTime.UtcNow;
        if (FailedAttempts >= _maxFailedAttempts) {
            var durationIndex = Math.Min(LockoutCount, _lockoutDurationsMinutes.Length - 1);
            LockoutEndUtc = DateTime.UtcNow.AddMinutes(_lockoutDurationsMinutes[durationIndex]);
            LockoutCount++;
            FailedAttempts = 0;
        }
    }
}
