using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DropErpMappingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ErpUserMappings");

            migrationBuilder.DropTable(
                name: "PendingItemMappings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ErpUserMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CargoPilotUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IntegrationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ErpUserEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ErpUserId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    InvalidatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InvalidationReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Active"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErpUserMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ErpUserMappings_Integrations_IntegrationId",
                        column: x => x.IntegrationId,
                        principalTable: "Integrations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ErpUserMappings_Users_CargoPilotUserId",
                        column: x => x.CargoPilotUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PendingItemMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CargoPilotItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IntegrationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ErpId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ErpProductName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ErpRawDataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ErpSku = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                name: "IX_ErpUserMappings_CargoPilotUserId",
                table: "ErpUserMappings",
                column: "CargoPilotUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ErpUserMappings_IntegrationId_CargoPilotUserId",
                table: "ErpUserMappings",
                columns: new[] { "IntegrationId", "CargoPilotUserId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ErpUserMappings_Status",
                table: "ErpUserMappings",
                column: "Status");

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
    }
}
