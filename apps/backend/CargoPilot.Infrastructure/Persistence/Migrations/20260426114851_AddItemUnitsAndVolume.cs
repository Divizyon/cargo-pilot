using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddItemUnitsAndVolume : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "HeightInCm",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "HeightOriginalValue",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "HeightUnit",
                table: "Items",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "LengthInCm",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LengthOriginalValue",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "LengthUnit",
                table: "Items",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "VolumeInCm3",
                table: "Items",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "WeightInKg",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "WeightOriginalValue",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "WeightUnit",
                table: "Items",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "WidthInCm",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "WidthOriginalValue",
                table: "Items",
                type: "decimal(12,3)",
                precision: 12,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "WidthUnit",
                table: "Items",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HeightInCm",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "HeightOriginalValue",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "HeightUnit",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "LengthInCm",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "LengthOriginalValue",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "LengthUnit",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "VolumeInCm3",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "WeightInKg",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "WeightOriginalValue",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "WeightUnit",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "WidthInCm",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "WidthOriginalValue",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "WidthUnit",
                table: "Items");
        }
    }
}
