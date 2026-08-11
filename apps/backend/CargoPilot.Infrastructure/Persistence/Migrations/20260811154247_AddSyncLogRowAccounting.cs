using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncLogRowAccounting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DroppedByReasonJson",
                table: "SyncLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FetchedCount",
                table: "SyncLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SourceTotal",
                table: "SyncLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UnaccountedCount",
                table: "SyncLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DroppedByReasonJson",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "FetchedCount",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "SourceTotal",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "UnaccountedCount",
                table: "SyncLogs");
        }
    }
}
