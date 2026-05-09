using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRuleAssignedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RuleAssignedCount",
                table: "SyncLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RuleNotAssignedCount",
                table: "SyncLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsRuleAssigned",
                table: "Items",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RuleAssignedCount",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "RuleNotAssignedCount",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "IsRuleAssigned",
                table: "Items");
        }
    }
}
