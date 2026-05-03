namespace CargoPilot.Domain.Enums;

public enum UnplacedReason {
    Unknown = 0,
    InsufficientSpace = 1,
    WeightLimitExceeded = 2,
    StackingNotAllowed = 3,
    SegregationOrCompatibility = 4,
    FragilityOrHandlingConstraint = 5,
    RotationOrGeometryConstraint = 6,
    Other = 7
}
