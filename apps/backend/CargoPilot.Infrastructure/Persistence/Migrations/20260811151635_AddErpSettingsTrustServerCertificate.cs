using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddErpSettingsTrustServerCertificate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "TrustServerCertificate",
                table: "ErpSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TrustServerCertificate",
                table: "ErpSettings");
        }
    }
}
