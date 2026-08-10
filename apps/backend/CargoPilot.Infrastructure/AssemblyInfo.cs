using System.Runtime.CompilerServices;

// Test projesinin internal üyelere (ör. OptimizationEngine.GetOrientations) erişebilmesi için.
// Üretim davranışını değiştirmez; yalnızca test görünürlüğü sağlar.
[assembly: InternalsVisibleTo("CargoPilot.Infrastructure.Tests")]
