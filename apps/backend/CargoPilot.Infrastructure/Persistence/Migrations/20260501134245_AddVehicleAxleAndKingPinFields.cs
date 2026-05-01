using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleAxleAndKingPinFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AdditionalAxleDistanceMm",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AdditionalAxleMaxLoadKg",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AdditionalAxleTareWeightKg",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "KingPinDistanceMm",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "KingPinMaxLoadKg",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "KingPinTareWeightKg",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MainAxleDistanceMm",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MainAxleMaxLoadKg",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MainAxleTareWeightKg",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_AdditionalAxleDistanceMm_Positive_WhenSet",
                table: "Vehicles",
                sql: "[AdditionalAxleDistanceMm] IS NULL OR [AdditionalAxleDistanceMm] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_AdditionalAxleMaxLoadKg_Positive_WhenSet",
                table: "Vehicles",
                sql: "[AdditionalAxleMaxLoadKg] IS NULL OR [AdditionalAxleMaxLoadKg] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_AdditionalAxleTareWeightKg_Positive_WhenSet",
                table: "Vehicles",
                sql: "[AdditionalAxleTareWeightKg] IS NULL OR [AdditionalAxleTareWeightKg] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_KingPinDistanceMm_Positive_WhenSet",
                table: "Vehicles",
                sql: "[KingPinDistanceMm] IS NULL OR [KingPinDistanceMm] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_KingPinMaxLoadKg_Positive_WhenSet",
                table: "Vehicles",
                sql: "[KingPinMaxLoadKg] IS NULL OR [KingPinMaxLoadKg] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_KingPinTareWeightKg_Positive_WhenSet",
                table: "Vehicles",
                sql: "[KingPinTareWeightKg] IS NULL OR [KingPinTareWeightKg] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_MainAxleDistanceMm_Positive_WhenSet",
                table: "Vehicles",
                sql: "[MainAxleDistanceMm] IS NULL OR [MainAxleDistanceMm] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_MainAxleMaxLoadKg_Positive_WhenSet",
                table: "Vehicles",
                sql: "[MainAxleMaxLoadKg] IS NULL OR [MainAxleMaxLoadKg] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_MainAxleTareWeightKg_Positive_WhenSet",
                table: "Vehicles",
                sql: "[MainAxleTareWeightKg] IS NULL OR [MainAxleTareWeightKg] > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_AdditionalAxleDistanceMm_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_AdditionalAxleMaxLoadKg_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_AdditionalAxleTareWeightKg_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_KingPinDistanceMm_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_KingPinMaxLoadKg_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_KingPinTareWeightKg_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_MainAxleDistanceMm_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_MainAxleMaxLoadKg_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_MainAxleTareWeightKg_Positive_WhenSet",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "AdditionalAxleDistanceMm",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "AdditionalAxleMaxLoadKg",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "AdditionalAxleTareWeightKg",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "KingPinDistanceMm",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "KingPinMaxLoadKg",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "KingPinTareWeightKg",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "MainAxleDistanceMm",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "MainAxleMaxLoadKg",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "MainAxleTareWeightKg",
                table: "Vehicles");
        }
    }
}
