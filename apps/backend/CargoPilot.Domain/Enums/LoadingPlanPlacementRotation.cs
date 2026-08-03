namespace CargoPilot.Domain.Enums;

public enum LoadingPlanPlacementRotation {
    NoRotation = 0, // (W, H, L)
    Yaw = 1,        // (L, H, W) — Y ekseni etrafında 90°
    Pitch = 2,      // (W, L, H) — X ekseni etrafında 90°
    Roll = 3,       // (H, W, L) — Z ekseni etrafında 90°
    YawPitch = 4,   // (H, L, W) — Yaw + Pitch kombinasyonu
    RollYaw = 5     // (L, W, H) — Roll + Yaw kombinasyonu
}
