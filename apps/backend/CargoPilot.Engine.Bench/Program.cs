using CargoPilot.Engine.Bench;

// Yerlestirme motorunun gelistirme dongusu. Iki kip:
//
//   bench  (varsayilan) : sabit korpusu kosar, damga ve sure dagilimi basar.
//   soak                : durmadan yeni senaryo uretir; konteyneri bolerek
//                         urettigi icin ulasilabilir doluluk %100'dur ve olculen
//                         doluluk dogrudan kalite oranidir.
//   br                  : BR1-BR7 (Bischoff & Ratcliff) kiyas kumelerini kosar.
//                         Giyotin korpusundan farki sayinin literaturle
//                         kiyaslanabilir olmasi.
//   serve               : POST /engine/run ucunu acar. Test arayuzunun kimlik
//                         dogrulamasiz ve veritabanisiz konustugu hedef budur.
//
// Uretime girmez.

var mode = args.Length > 0 && !args[0].StartsWith("--", StringComparison.Ordinal)
    ? args[0]
    : "bench";

var options = BenchOptions.Parse(args);

return mode switch
{
    "serve" => await BenchServer.RunAsync(options).ConfigureAwait(false),
    "bench" => BenchCommand.Run(options),
    "soak" => SoakCommand.Run(options),
    "br" => BrCommand.Run(options),
    "help" or "--help" or "-h" => BenchOptions.PrintUsage(),
    _ => BenchOptions.Unknown(mode),
};
