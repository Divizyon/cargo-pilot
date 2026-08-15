using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncLockAndDraftItemUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DraftItems_IntegrationId_ErpId",
                table: "DraftItems");

            migrationBuilder.AddColumn<DateTime>(
                name: "SyncStartedAtUtc",
                table: "Integrations",
                type: "datetime2",
                nullable: true);

            // Unique index oncesi mevcut cift kayitlar temizlenir: her (IntegrationId, ErpId)
            // grubunda en yeni taslak korunur, eskiler soft-delete edilir.
            migrationBuilder.Sql("""
                WITH Duplicates AS (
                    SELECT Id,
                           ROW_NUMBER() OVER (
                               PARTITION BY IntegrationId, ErpId
                               ORDER BY CreatedAtUtc DESC, Id DESC) AS RowNo
                    FROM DraftItems
                    WHERE IsDeleted = 0
                )
                UPDATE DraftItems
                SET IsDeleted = 1
                WHERE Id IN (SELECT Id FROM Duplicates WHERE RowNo > 1);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_DraftItems_IntegrationId_ErpId",
                table: "DraftItems",
                columns: new[] { "IntegrationId", "ErpId" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DraftItems_IntegrationId_ErpId",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "SyncStartedAtUtc",
                table: "Integrations");

            migrationBuilder.CreateIndex(
                name: "IX_DraftItems_IntegrationId_ErpId",
                table: "DraftItems",
                columns: new[] { "IntegrationId", "ErpId" });
        }
    }
}
