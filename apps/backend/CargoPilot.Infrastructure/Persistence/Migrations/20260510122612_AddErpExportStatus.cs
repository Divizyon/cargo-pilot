using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddErpExportStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LoadingPlanId",
                table: "SyncLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ErpExportStatus",
                table: "LoadingPlans",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SyncLogs_LoadingPlanId",
                table: "SyncLogs",
                column: "LoadingPlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_SyncLogs_LoadingPlans_LoadingPlanId",
                table: "SyncLogs",
                column: "LoadingPlanId",
                principalTable: "LoadingPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SyncLogs_LoadingPlans_LoadingPlanId",
                table: "SyncLogs");

            migrationBuilder.DropIndex(
                name: "IX_SyncLogs_LoadingPlanId",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "LoadingPlanId",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "ErpExportStatus",
                table: "LoadingPlans");
        }
    }
}
