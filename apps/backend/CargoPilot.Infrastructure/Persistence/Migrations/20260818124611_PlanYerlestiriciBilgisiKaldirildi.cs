using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Greedy yerlestirici kaldirildi (ALGORITMA-RULEBOOK.md DR-39). Tek
    /// yerlestirici kaldigi icin planin hangisiyle uretildigini saklamanin bilgi
    /// degeri yok.
    ///
    /// DIKKAT: <c>Down</c> sutunu geri ekler ama VERIYI KURTARMAZ. Gecmis
    /// planlarin hangi motorla uretildigi bilgisi kalici olarak kaybolur; bu
    /// bilincli bir kullanici karari.
    ///
    /// <c>Sequencer</c>, <c>Seed</c> ve dort <c>Search*</c> sutunu KALIR — GRASP
    /// uretim yoluna gectigi icin onlar artik bugunkunden daha anlamli.
    /// </summary>
    public partial class PlanYerlestiriciBilgisiKaldirildi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlacementStrategy",
                table: "LoadingPlans");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PlacementStrategy",
                table: "LoadingPlans",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
