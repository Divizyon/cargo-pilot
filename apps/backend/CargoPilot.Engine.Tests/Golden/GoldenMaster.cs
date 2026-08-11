using System.Text.Json;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Tests.Golden;

/// <summary>
/// Motor çıktısını <c>Snapshots/&lt;SenaryoAdi&gt;.json</c> altındaki referans
/// dosyayla karşılaştırır. Harici snapshot kütüphanesi kullanılmaz.
///
/// Snapshot dosyası yoksa oluşturulur ve test başarısız sayılır; böylece yeni
/// referans gözden geçirilmeden yeşil olmaz. Motor davranışı bilinçli
/// değiştiğinde <c>UPDATE_SNAPSHOTS=1</c> ile çalıştırılarak tüm referanslar
/// yeniden yazılır.
/// </summary>
internal static class GoldenMaster
{
    private const string ProjectFileName = "CargoPilot.Engine.Tests.csproj";
    private const string SnapshotFolderName = "Snapshots";
    private const string UpdateEnvironmentVariable = "UPDATE_SNAPSHOTS";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
    };

    private static readonly Lazy<string> SnapshotDirectory = new(ResolveSnapshotDirectory);

    /// <summary>
    /// Senaryoyu deterministik JSON'a çevirir. Determinizm testleri de bu metodu
    /// kullanır, böylece karşılaştırılan içerik snapshot'takiyle birebir aynıdır.
    /// </summary>
    public static string Serialize(string scenario, OptimizationInput input, OptimizationResult result)
        => Normalize(JsonSerializer.Serialize(SnapshotPayload.From(scenario, input, result), SerializerOptions));

    public static void Match(string scenario, OptimizationInput input, OptimizationResult result)
    {
        var actual = Serialize(scenario, input, result);
        var path = Path.Combine(SnapshotDirectory.Value, scenario + ".json");
        var updateMode = IsUpdateMode();

        if (!File.Exists(path))
        {
            Save(path, actual);

            if (!updateMode)
            {
                Assert.Fail(
                    $"Snapshot dosyası yoktu, oluşturuldu: {path}{Environment.NewLine}" +
                    "İçeriği gözden geçirip commit'leyin, ardından testi tekrar çalıştırın.");
            }

            return;
        }

        var expected = Normalize(File.ReadAllText(path));
        if (string.Equals(expected, actual, StringComparison.Ordinal))
        {
            return;
        }

        if (updateMode)
        {
            Save(path, actual);
            return;
        }

        Assert.Fail(BuildDifferenceMessage(scenario, path, expected, actual));
    }

    private static string BuildDifferenceMessage(string scenario, string path, string expected, string actual)
    {
        var expectedLines = expected.Split('\n');
        var actualLines = actual.Split('\n');

        var index = 0;
        while (index < expectedLines.Length
               && index < actualLines.Length
               && string.Equals(expectedLines[index], actualLines[index], StringComparison.Ordinal))
        {
            index++;
        }

        var expectedLine = index < expectedLines.Length ? expectedLines[index] : "<dosya sonu>";
        var actualLine = index < actualLines.Length ? actualLines[index] : "<dosya sonu>";

        return $"Golden-master farkı: {scenario}{Environment.NewLine}" +
               $"Snapshot: {path}{Environment.NewLine}" +
               $"İlk farklı satır ({index + 1}):{Environment.NewLine}" +
               $"  beklenen: {expectedLine}{Environment.NewLine}" +
               $"  gerçek  : {actualLine}{Environment.NewLine}" +
               $"Davranış bilinçli değiştiyse {UpdateEnvironmentVariable}=1 ile çalıştırıp snapshot'ları yenileyin.";
    }

    private static void Save(string path, string content)
    {
        Directory.CreateDirectory(SnapshotDirectory.Value);
        File.WriteAllText(path, content);
    }

    private static bool IsUpdateMode()
    {
        var value = Environment.GetEnvironmentVariable(UpdateEnvironmentVariable);

        return !string.IsNullOrWhiteSpace(value)
               && !string.Equals(value, "0", StringComparison.Ordinal)
               && !string.Equals(value, "false", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Snapshot'lar kaynak ağacında tutulur (bin klasöründe değil), bu yüzden
    /// proje dizini çalışma anında yukarı doğru .csproj aranarak bulunur.
    /// </summary>
    private static string ResolveSnapshotDirectory()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, ProjectFileName)))
            {
                return Path.Combine(directory.FullName, SnapshotFolderName);
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException(
            $"{ProjectFileName} bulunamadı; snapshot klasörü {AppContext.BaseDirectory} üzerinden çözülemedi.");
    }

    /// <summary>
    /// Satır sonlarını LF'e sabitler ve dosyayı tek bir sondaki yeni satırla bitirir;
    /// böylece git/editör kaynaklı CRLF farkları testi kırmaz.
    /// </summary>
    private static string Normalize(string text)
        => text.Replace("\r\n", "\n", StringComparison.Ordinal)
               .Replace("\r", "\n", StringComparison.Ordinal)
               .TrimEnd('\n') + "\n";
}
