namespace CargoPilot.Domain.ValueObjects;

public sealed record TrackingNumber
{
    public string Value { get; }

    public TrackingNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Tracking number cannot be empty.", nameof(value));
        }

        Value = value.Trim();
    }

    public override string ToString() => Value;
}
