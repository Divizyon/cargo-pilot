using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DuzeltVehicleVolumeBirimi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Volume",
                table: "Vehicles",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true,
                computedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000.0",
                stored: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldNullable: true,
                oldComputedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                oldStored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
                oldNullable: true,
                oldComputedColumnSql: "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000.0",
                oldStored: true);
        }
    }
}
