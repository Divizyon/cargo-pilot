using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeVehicleDimensionsNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop computed column before altering source columns
            migrationBuilder.DropColumn(
                name: "Volume",
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

            // Recreate computed column (now nullable)
            migrationBuilder.AddColumn<decimal>(
                name: "Volume",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                computedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                stored: true);

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
            migrationBuilder.DropColumn(
                name: "Volume",
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

            // Clear NULLs before reverting to NOT NULL
            migrationBuilder.Sql("UPDATE [Vehicles] SET [InternalWidth] = 0 WHERE [InternalWidth] IS NULL");
            migrationBuilder.Sql("UPDATE [Vehicles] SET [InternalHeight] = 0 WHERE [InternalHeight] IS NULL");
            migrationBuilder.Sql("UPDATE [Vehicles] SET [InternalLength] = 0 WHERE [InternalLength] IS NULL");
            migrationBuilder.Sql("UPDATE [Vehicles] SET [MaxWeightCapacity] = 0 WHERE [MaxWeightCapacity] IS NULL");

            migrationBuilder.AlterColumn<decimal>(
                name: "InternalWidth",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
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
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "MaxWeightCapacity",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Volume",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                computedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                stored: true);

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
