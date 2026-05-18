using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixVehicleDimensionsNullableAndConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles");

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
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles");

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxWeightCapacity",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalWidth",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalLength",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalHeight",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AlterColumn<decimal>(
                name: "Volume",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                computedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                stored: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldComputedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                oldStored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles",
                columns: new[] { "CompanyId", "PlateNumber" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [PlateNumber] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalHeight_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR ([InternalHeight] IS NOT NULL AND [InternalHeight] > 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalLength_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR ([InternalLength] IS NOT NULL AND [InternalLength] > 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_InternalWidth_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR ([InternalWidth] IS NOT NULL AND [InternalWidth] > 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR ([MaxWeightCapacity] IS NOT NULL AND [MaxWeightCapacity] > 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles");

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
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles");

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxWeightCapacity",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalWidth",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalLength",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalHeight",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Volume",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                computedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                stored: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true,
                oldComputedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                oldStored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CompanyId_PlateNumber",
                table: "Vehicles",
                columns: new[] { "CompanyId", "PlateNumber" },
                unique: true,
                filter: "[IsDeleted] = 0");

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
                name: "CK_Vehicles_MaxWeightCapacity_Positive",
                table: "Vehicles",
                sql: "[IsDraft] = 1 OR [MaxWeightCapacity] > 0");
        }
    }
}
