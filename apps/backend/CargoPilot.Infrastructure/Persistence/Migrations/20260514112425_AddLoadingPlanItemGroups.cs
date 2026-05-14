using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLoadingPlanItemGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GroupId",
                table: "LoadingPlanInputItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LoadingPlanItemGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LoadingPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UnloadingOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadingPlanItemGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoadingPlanItemGroups_LoadingPlans_LoadingPlanId",
                        column: x => x.LoadingPlanId,
                        principalTable: "LoadingPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanInputItems_GroupId",
                table: "LoadingPlanInputItems",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_LoadingPlanItemGroups_LoadingPlanId",
                table: "LoadingPlanItemGroups",
                column: "LoadingPlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_LoadingPlanInputItems_LoadingPlanItemGroups_GroupId",
                table: "LoadingPlanInputItems",
                column: "GroupId",
                principalTable: "LoadingPlanItemGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LoadingPlanInputItems_LoadingPlanItemGroups_GroupId",
                table: "LoadingPlanInputItems");

            migrationBuilder.DropTable(
                name: "LoadingPlanItemGroups");

            migrationBuilder.DropIndex(
                name: "IX_LoadingPlanInputItems_GroupId",
                table: "LoadingPlanInputItems");

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "LoadingPlanInputItems");
        }
    }
}
