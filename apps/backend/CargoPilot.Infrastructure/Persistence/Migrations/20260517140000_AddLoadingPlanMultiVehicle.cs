using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLoadingPlanMultiVehicle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LoadingPlanVehicles",
                columns: table => new
                {
                    LoadingPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadingPlanVehicles", x => new { x.LoadingPlanId, x.VehicleId });
                    table.ForeignKey(
                        name: "FK_LoadingPlanVehicles_LoadingPlans_LoadingPlanId",
                        column: x => x.LoadingPlanId,
                        principalTable: "LoadingPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LoadingPlanVehicles_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanVehicles_LoadingPlanId_SortOrder",
                table: "LoadingPlanVehicles",
                columns: new[] { "LoadingPlanId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanVehicles_VehicleId",
                table: "LoadingPlanVehicles",
                column: "VehicleId");

            // Mevcut VehicleId verilerini LoadingPlanVehicles tablosuna taşı
            migrationBuilder.Sql(@"
                INSERT INTO LoadingPlanVehicles (LoadingPlanId, VehicleId, SortOrder)
                SELECT Id, VehicleId, 0
                FROM LoadingPlans
                WHERE VehicleId IS NOT NULL
                  AND VehicleId != '00000000-0000-0000-0000-000000000000'
            ");

            migrationBuilder.AddColumn<Guid>(
                name: "VehicleId",
                table: "LoadingPlanPlacements",
                type: "uniqueidentifier",
                nullable: true);

            // Mevcut placements için VehicleId'yi plan'daki VehicleId'den doldur
            migrationBuilder.Sql(@"
                UPDATE lpp
                SET lpp.VehicleId = lp.VehicleId
                FROM LoadingPlanPlacements lpp
                INNER JOIN LoadingPlans lp ON lpp.LoadingPlanId = lp.Id
                WHERE lp.VehicleId IS NOT NULL
                  AND lp.VehicleId != '00000000-0000-0000-0000-000000000000'
            ");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanPlacements_VehicleId",
                table: "LoadingPlanPlacements",
                column: "VehicleId");

            migrationBuilder.AddForeignKey(
                name: "FK_LoadingPlanPlacements_Vehicles_VehicleId",
                table: "LoadingPlanPlacements",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.DropForeignKey(
                name: "FK_LoadingPlans_Vehicles_VehicleId",
                table: "LoadingPlans");

            migrationBuilder.DropIndex(
                name: "IX_LoadingPlans_VehicleId",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "LoadingPlans");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VehicleId",
                table: "LoadingPlans",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: Guid.Empty);

            // Eski VehicleId'yi LoadingPlanVehicles'dan geri al (ilk araç, SortOrder=0)
            migrationBuilder.Sql(@"
                UPDATE lp
                SET lp.VehicleId = lpv.VehicleId
                FROM LoadingPlans lp
                INNER JOIN LoadingPlanVehicles lpv ON lpv.LoadingPlanId = lp.Id AND lpv.SortOrder = 0
            ");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlans_VehicleId",
                table: "LoadingPlans",
                column: "VehicleId");

            migrationBuilder.AddForeignKey(
                name: "FK_LoadingPlans_Vehicles_VehicleId",
                table: "LoadingPlans",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.DropForeignKey(
                name: "FK_LoadingPlanPlacements_Vehicles_VehicleId",
                table: "LoadingPlanPlacements");

            migrationBuilder.DropIndex(
                name: "IX_LoadingPlanPlacements_VehicleId",
                table: "LoadingPlanPlacements");

            migrationBuilder.DropColumn(
                name: "VehicleId",
                table: "LoadingPlanPlacements");

            migrationBuilder.DropTable(
                name: "LoadingPlanVehicles");
        }
    }
}
