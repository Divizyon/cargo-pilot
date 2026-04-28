using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProgressiveLockoutAndIpTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LockoutCount",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "IpLoginAttempts",
                columns: table => new
                {
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: false),
                    FailedAttempts = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    LockoutCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    LockoutEndUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastAttemptUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IpLoginAttempts", x => x.IpAddress);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IpLoginAttempts");

            migrationBuilder.DropColumn(
                name: "LockoutCount",
                table: "Users");
        }
    }
}
