using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddConstraintIdsJsonToItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConstraintIdsJson",
                table: "Items",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.Sql(
                @"UPDATE Items
                  SET ConstraintIdsJson = CASE
                      WHEN FragilityType = 0 THEN '[]'
                      ELSE '[' + CAST(FragilityType AS nvarchar(max)) + ']'
                  END
                  WHERE IsDeleted = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConstraintIdsJson",
                table: "Items");
        }
    }
}
