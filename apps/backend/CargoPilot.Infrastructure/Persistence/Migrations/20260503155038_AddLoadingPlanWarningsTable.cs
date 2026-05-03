using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLoadingPlanWarningsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LoadingPlanWarnings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LoadingPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RelatedItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RelatedPlacementId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadingPlanWarnings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoadingPlanWarnings_Items_RelatedItemId",
                        column: x => x.RelatedItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoadingPlanWarnings_LoadingPlanPlacements_RelatedPlacementId",
                        column: x => x.RelatedPlacementId,
                        principalTable: "LoadingPlanPlacements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoadingPlanWarnings_LoadingPlans_LoadingPlanId",
                        column: x => x.LoadingPlanId,
                        principalTable: "LoadingPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanWarnings_IsDeleted",
                table: "LoadingPlanWarnings",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanWarnings_LoadingPlanId",
                table: "LoadingPlanWarnings",
                column: "LoadingPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanWarnings_RelatedItemId",
                table: "LoadingPlanWarnings",
                column: "RelatedItemId");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanWarnings_RelatedPlacementId",
                table: "LoadingPlanWarnings",
                column: "RelatedPlacementId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoadingPlanWarnings");
        }
    }
}
