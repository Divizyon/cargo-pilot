using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleErpMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalVehicleId",
                table: "Vehicles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Vehicles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CompanyId_ExternalVehicleId",
                table: "Vehicles",
                columns: new[] { "CompanyId", "ExternalVehicleId" },
                unique: true,
                filter: "[ExternalVehicleId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_CompanyId_ExternalVehicleId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "ExternalVehicleId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Vehicles");
        }
    }
}
