namespace CargoPilot.Domain.Enums;

public enum SyncFrequency {
    Every4Hours,
    Daily
}

public static class SyncFrequencyExtensions {
    public static TimeSpan ToTimeSpan(this SyncFrequency frequency) => frequency switch {
        SyncFrequency.Every4Hours => TimeSpan.FromHours(4),
        SyncFrequency.Daily       => TimeSpan.FromHours(24),
        _                         => TimeSpan.FromHours(24)
    };
}
