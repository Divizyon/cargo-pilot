using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DropDeadItemAndSyncLogColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ERP taslaklarinda Category=0 (Package) yalnizca kaldirilan ParseCategory
            // varsayilanindan gelebilir; aktarim izgarasi Package uretmez. Tip artik
            // ERP kaynakli taslaklarda sabit Koli (Box=2) oldugundan eski satirlar tasinir.
            migrationBuilder.Sql("UPDATE DraftItems SET Category = 2 WHERE Category = 0;");

            migrationBuilder.DropColumn(
                name: "RuleAssignedCount",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "RuleNotAssignedCount",
                table: "SyncLogs");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "IsRuleAssigned",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "DraftItems");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Items",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRuleAssigned",
                table: "Items",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "DraftItems",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }
    }
}
