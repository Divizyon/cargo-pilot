using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HardenLoadingPlanIntegrityRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoadingPlanWarnings_LoadingPlanPlacements_RelatedPlacementId",
                table: "LoadingPlanWarnings");

            migrationBuilder.DropIndex(
                name: "IX_LoadingPlanWarnings_RelatedPlacementId",
                table: "LoadingPlanWarnings");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_LoadingPlanPlacements_Id_LoadingPlanId",
                table: "LoadingPlanPlacements",
                columns: new[] { "Id", "LoadingPlanId" });

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanWarnings_RelatedPlacementId_LoadingPlanId",
                table: "LoadingPlanWarnings",
                columns: new[] { "RelatedPlacementId", "LoadingPlanId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_LoadingPlanUnplacedItems_Quantity_Positive",
                table: "LoadingPlanUnplacedItems",
                sql: "[Quantity] > 0");

            migrationBuilder.AddForeignKey(
                name: "FK_LoadingPlanWarnings_LoadingPlanPlacements_RelatedPlacementId_LoadingPlanId",
                table: "LoadingPlanWarnings",
                columns: new[] { "RelatedPlacementId", "LoadingPlanId" },
                principalTable: "LoadingPlanPlacements",
                principalColumns: new[] { "Id", "LoadingPlanId" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoadingPlanWarnings_LoadingPlanPlacements_RelatedPlacementId_LoadingPlanId",
                table: "LoadingPlanWarnings");

            migrationBuilder.DropIndex(
                name: "IX_LoadingPlanWarnings_RelatedPlacementId_LoadingPlanId",
                table: "LoadingPlanWarnings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LoadingPlanUnplacedItems_Quantity_Positive",
                table: "LoadingPlanUnplacedItems");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_LoadingPlanPlacements_Id_LoadingPlanId",
                table: "LoadingPlanPlacements");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanWarnings_RelatedPlacementId",
                table: "LoadingPlanWarnings",
                column: "RelatedPlacementId");

            migrationBuilder.AddForeignKey(
                name: "FK_LoadingPlanWarnings_LoadingPlanPlacements_RelatedPlacementId",
                table: "LoadingPlanWarnings",
                column: "RelatedPlacementId",
                principalTable: "LoadingPlanPlacements",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
