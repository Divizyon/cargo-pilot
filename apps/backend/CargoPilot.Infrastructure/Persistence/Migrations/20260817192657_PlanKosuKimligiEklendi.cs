using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PlanKosuKimligiEklendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PlacementStrategy",
                table: "LoadingPlans",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "SearchDurationMs",
                table: "LoadingPlans",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SearchEvaluations",
                table: "LoadingPlans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SearchImproved",
                table: "LoadingPlans",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SearchIterations",
                table: "LoadingPlans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Seed",
                table: "LoadingPlans",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Sequencer",
                table: "LoadingPlans",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlacementStrategy",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "SearchDurationMs",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "SearchEvaluations",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "SearchImproved",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "SearchIterations",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "Seed",
                table: "LoadingPlans");

            migrationBuilder.DropColumn(
                name: "Sequencer",
                table: "LoadingPlans");
        }
    }
}
