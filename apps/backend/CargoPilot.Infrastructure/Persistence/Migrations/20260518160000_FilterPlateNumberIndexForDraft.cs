using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FilterPlateNumberIndexForDraft : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles",
                columns: new[] { "CompanyId", "PlateNumber" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [PlateNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles",
                columns: new[] { "CompanyId", "PlateNumber" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}
