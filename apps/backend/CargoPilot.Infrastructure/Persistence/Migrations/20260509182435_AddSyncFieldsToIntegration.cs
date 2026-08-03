using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncFieldsToIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "NextScheduledSyncAt",
                table: "Integrations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SyncFrequency",
                table: "Integrations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SyncStatus",
                table: "Integrations",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextScheduledSyncAt",
                table: "Integrations");

            migrationBuilder.DropColumn(
                name: "SyncFrequency",
                table: "Integrations");

            migrationBuilder.DropColumn(
                name: "SyncStatus",
                table: "Integrations");
        }
    }
}
