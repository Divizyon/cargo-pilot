namespace CargoPilot.Application.Common.Settings;

public sealed class MinioSettings {
    public string Endpoint { get; set; } = null!;
    public string AccessKey { get; set; } = null!;
    public string SecretKey { get; set; } = null!;
    public string BucketName { get; set; } = "cargo-pilot";
    public bool UseSSL { get; set; }
}
