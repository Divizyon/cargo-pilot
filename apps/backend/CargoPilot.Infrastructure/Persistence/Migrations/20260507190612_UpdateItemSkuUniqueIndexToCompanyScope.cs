using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateItemSkuUniqueIndexToCompanyScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Items_SKU",
                table: "Items");

            migrationBuilder.CreateIndex(
                name: "IX_Items_CompanyId_SKU",
                table: "Items",
                columns: new[] { "CompanyId", "SKU" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Items_CompanyId_SKU",
                table: "Items");

            migrationBuilder.CreateIndex(
                name: "IX_Items_SKU",
                table: "Items",
                column: "SKU",
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}
