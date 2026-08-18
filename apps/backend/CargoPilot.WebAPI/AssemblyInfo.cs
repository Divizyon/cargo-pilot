using System.Runtime.CompilerServices;

// Metrics scrape token doğrulaması (DependencyInjection.ResolveMetricsScrapeToken ve
// MetricsScrapeAuthenticationHandler.TokensMatch) internal; testler bunları doğrudan çağırır.
// Üretim davranışını değiştirmez; yalnızca test görünürlüğü sağlar.
[assembly: InternalsVisibleTo("CargoPilot.WebAPI.Tests")]
