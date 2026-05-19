using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsDraftToVehicles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_InternalHeight_Positive",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_InternalLength_Positive",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_InternalWidth_Positive",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_LayerCount_Min1",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles");

            migrationBuilder.AddColumn<bool>(
                name: "IsDraft",
                table: "Vehicles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalHeight_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR [InternalHeight] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalLength_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR [InternalLength] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalWidth_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR [InternalWidth] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_LayerCount_Min1",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR [LayerCount] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR [MaxWeightCapacity] > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_InternalHeight_Positive",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_InternalLength_Positive",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_InternalWidth_Positive",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_LayerCount_Min1",
                table: "Vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "IsDraft",
                table: "Vehicles");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalHeight_Positive",
                table: "Vehicles",
                sql: "[InternalHeight] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalLength_Positive",
                table: "Vehicles",
                sql: "[InternalLength] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalWidth_Positive",
                table: "Vehicles",
                sql: "[InternalWidth] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_LayerCount_Min1",
                table: "Vehicles",
                sql: "[LayerCount] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles",
                sql: "[MaxWeightCapacity] > 0");
        }
    }
}
