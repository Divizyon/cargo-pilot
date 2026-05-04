namespace CargoPilot.Domain.Packing;

// Efektif boyutlar seçili rotasyon sonrası: L=x, W=y, H=z
public sealed record Rotation(decimal L, decimal W, decimal H);
