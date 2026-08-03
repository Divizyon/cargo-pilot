namespace CargoPilot.Domain.Enums;

public enum AllowedRotations {
    All = 0,
    NoVertical = 1,  // Sadece Yaw — H her zaman Y ekseninde
    Fixed = 2,       // Hiç döndürme yok
    NoYaw = 3,       // Yaw yasak — Roll ve Pitch serbest
    PitchOnly = 4,   // Sadece Pitch — W her zaman X ekseninde (X ekseni kilitli)
    RollOnly = 5,    // Sadece Roll  — L her zaman Z ekseninde (Z ekseni kilitli)
}
