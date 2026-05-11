using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingVehicleMappingDimensions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {


            migrationBuilder.AddColumn<decimal>(
                name: "InternalHeight",
                table: "PendingVehicleMappings",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InternalLength",
                table: "PendingVehicleMappings",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InternalWidth",
                table: "PendingVehicleMappings",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "LayerCount",
                table: "PendingVehicleMappings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LoadingType",
                table: "PendingVehicleMappings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxWeightCapacity",
                table: "PendingVehicleMappings",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "VehicleType",
                table: "PendingVehicleMappings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {


            migrationBuilder.DropColumn(
                name: "InternalHeight",
                table: "PendingVehicleMappings");

            migrationBuilder.DropColumn(
                name: "InternalLength",
                table: "PendingVehicleMappings");

            migrationBuilder.DropColumn(
                name: "InternalWidth",
                table: "PendingVehicleMappings");

            migrationBuilder.DropColumn(
                name: "LayerCount",
                table: "PendingVehicleMappings");

            migrationBuilder.DropColumn(
                name: "LoadingType",
                table: "PendingVehicleMappings");

            migrationBuilder.DropColumn(
                name: "MaxWeightCapacity",
                table: "PendingVehicleMappings");

            migrationBuilder.DropColumn(
                name: "VehicleType",
                table: "PendingVehicleMappings");
        }
    }
}
