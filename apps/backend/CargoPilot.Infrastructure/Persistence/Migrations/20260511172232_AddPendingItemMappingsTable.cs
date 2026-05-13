using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingItemMappingsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PendingItemMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IntegrationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ErpId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ErpSku = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ErpProductName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ErpRawDataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CargoPilotItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
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
                    table.PrimaryKey("PK_PendingItemMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PendingItemMappings_Integrations_IntegrationId",
                        column: x => x.IntegrationId,
                        principalTable: "Integrations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PendingItemMappings_Items_CargoPilotItemId",
                        column: x => x.CargoPilotItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PendingItemMappings_CargoPilotItemId",
                table: "PendingItemMappings",
                column: "CargoPilotItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PendingItemMappings_IntegrationId",
                table: "PendingItemMappings",
                column: "IntegrationId");

            migrationBuilder.CreateIndex(
                name: "IX_PendingItemMappings_IntegrationId_ErpId",
                table: "PendingItemMappings",
                columns: new[] { "IntegrationId", "ErpId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PendingItemMappings");
        }
    }
}
