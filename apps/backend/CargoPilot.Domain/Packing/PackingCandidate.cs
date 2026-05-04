namespace CargoPilot.Domain.Packing;

public sealed record PackingCandidate(
    ExtremePoint Ep,
    Rotation Rot,
    decimal DeltaX,
    decimal DeltaY,
    double Score,
    bool PassesCgConstraint);
