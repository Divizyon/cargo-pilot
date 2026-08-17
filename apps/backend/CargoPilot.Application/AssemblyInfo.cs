using System.Runtime.CompilerServices;

// Test projesinin internal üyelere (ör. PlacementValidator.GetOrientations) erişebilmesi için.
// Üretim davranışını değiştirmez; yalnızca test görünürlüğü sağlar.
[assembly: InternalsVisibleTo("CargoPilot.Infrastructure.Tests")]

// Golden-master testleri OptimizationEngine'i doğrudan (DI olmadan) örnekler.
[assembly: InternalsVisibleTo("CargoPilot.Engine.Tests")]

// Geliştirme döngüsü barındırıcısı motoru DI olmadan, doğrudan örnekler.
// Üretime girmez; yalnızca ölçüm ve determinizm koşuları için.
[assembly: InternalsVisibleTo("CargoPilot.Engine.Bench")]
