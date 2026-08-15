using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddErpSettingsLastConnectionTest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "LastTestSucceeded",
                table: "ErpSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastTestedAtUtc",
                table: "ErpSettings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastTestedConfigHash",
                table: "ErpSettings",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastTestSucceeded",
                table: "ErpSettings");

            migrationBuilder.DropColumn(
                name: "LastTestedAtUtc",
                table: "ErpSettings");

            migrationBuilder.DropColumn(
                name: "LastTestedConfigHash",
                table: "ErpSettings");
        }
    }
}
