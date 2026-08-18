namespace CargoPilot.Domain.Enums;

public enum AllowedRotations {
    All = 0,
    NoVertical = 1,  // Sadece Yaw — H her zaman Y ekseninde
    Fixed = 2,       // Hiç döndürme yok
    NoYaw = 3,       // Yaw yasak — Roll ve Pitch serbest
    PitchOnly = 4,   // Sadece Pitch — W her zaman X ekseninde (X ekseni kilitli)
    RollOnly = 5,    // Sadece Roll  — L her zaman Z ekseninde (Z ekseni kilitli)

    // W asla dikey duramaz; H ve L dikey olabilir ve yatay çift serbestçe döner.
    // Dört yönelim: NoRotation, Yaw, Pitch, YawPitch. `All`'dan Roll ve RollYaw
    // (W'yi dikeye getiren ikisi) çıkarılmış hâlidir.
    //
    // Bischoff & Ratcliff'in `011` yönelim bayrağının birebir karşılığıdır:
    // BR tiplerinin %37'si bu düzendedir ve `PitchOnly` bunların yalnızca iki
    // yönelimini veriyordu (`DR-42`).
    NoVerticalWidth = 6,
}
