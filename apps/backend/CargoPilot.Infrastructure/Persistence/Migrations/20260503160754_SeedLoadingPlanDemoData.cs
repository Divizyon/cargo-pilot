using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedLoadingPlanDemoData : Migration
    {
        private static readonly Guid CompanyId = Guid.Parse("3f53f491-a7bd-4a64-a7d8-2639ca7f2f10");
        private static readonly Guid VehicleId = Guid.Parse("02ac4ae2-c445-44e0-aec8-bf5328febb2d");
        private static readonly Guid UserId = Guid.Parse("f1a3e1c8-860f-4a50-a026-fcb6fb66f846");

        private static readonly Guid ItemId1 = Guid.Parse("a1618f9d-f7f4-4270-bf3f-7392bfbd0b52");
        private static readonly Guid ItemId2 = Guid.Parse("9d3f0ab4-f80b-4ff8-b2ab-0c91f616f434");
        private static readonly Guid ItemId3 = Guid.Parse("ea5ce974-6e7b-48f9-9e6c-c52974f66f54");

        private static readonly Guid PlanId1 = Guid.Parse("5b8d17fd-57c7-4f7e-bfa6-bfbf4ce4ff45");
        private static readonly Guid PlanId2 = Guid.Parse("27af4d03-5f70-4773-8da5-bcbf2f5f18e4");

        private static readonly Guid PlacementId1 = Guid.Parse("55247c46-3a8b-4f95-a3cf-a8756434fa6f");
        private static readonly Guid PlacementId2 = Guid.Parse("fcbd799d-c9d0-40ff-9356-a4d345f01679");
        private static readonly Guid PlacementId3 = Guid.Parse("ec6e55c2-43ff-4379-af5f-45cc13ef7f42");
        private static readonly Guid PlacementId4 = Guid.Parse("7f6a9b85-c20d-4eb8-8e9b-f7f43dbf9854");
        private static readonly Guid PlacementId5 = Guid.Parse("944f0e02-91b1-4259-9f84-9bafbf8f7fe9");
        private static readonly Guid PlacementId6 = Guid.Parse("c7468078-4d20-4275-b4c8-eceb06f9fe47");
        private static readonly Guid PlacementId7 = Guid.Parse("38141a43-a496-44f2-ab88-f0f5f75ab75f");
        private static readonly Guid PlacementId8 = Guid.Parse("1f864639-8f2e-4556-88d8-c9438f6fa7bc");
        private static readonly Guid PlacementId9 = Guid.Parse("94f9e38d-a5dc-4ec9-8239-0aaf172ed77a");
        private static readonly Guid PlacementId10 = Guid.Parse("f5eaf7fe-3288-46aa-b788-531cc9226ecf");

        private static readonly Guid UnplacedId1 = Guid.Parse("68e6f161-5d9e-40cd-ae96-60883877a828");
        private static readonly Guid UnplacedId2 = Guid.Parse("56ddb32c-79e5-44e4-adf4-ddf6f126f97a");
        private static readonly Guid UnplacedId3 = Guid.Parse("8f0cfd6f-a548-4c33-ac6d-76769fca00ba");

        private static readonly Guid WarningId1 = Guid.Parse("9cd82a05-a684-4061-be3e-c6900cb37bd9");
        private static readonly Guid WarningId2 = Guid.Parse("98f9ac98-74e8-4f57-a5c0-bfec11f4f15c");
        private static readonly Guid WarningId3 = Guid.Parse("5383ed20-996d-4d8e-90a8-3b0bd9385414");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var now = new DateTime(2026, 5, 3, 16, 10, 0, DateTimeKind.Utc);

            migrationBuilder.InsertData(
                table: "Companies",
                columns: new[] { "Id", "Name", "Address", "LogoUrl", "SubscriptionType", "MaxUserCount", "CreatedBy", "UpdatedBy", "UpdatedAtUtc" },
                values: new object[] { CompanyId, "Cargo Pilot Demo Company", "Istanbul", "https://example.com/logo.png", 1, 25, UserId, UserId, now });

            migrationBuilder.InsertData(
                table: "Vehicles",
                columns: new[]
                {
                    "Id", "VehicleName", "VehicleType", "PlateNumber", "InternalWidth", "InternalHeight", "InternalLength",
                    "MaxWeightCapacity", "LayerCount", "LoadingType", "CompanyId", "CreatedBy", "UpdatedBy", "UpdatedAtUtc"
                },
                values: new object[]
                {
                    VehicleId, "Demo Trailer 01", 0, "34CP001", 2450m, 2700m, 13600m,
                    24000000m, 3, 0, CompanyId, UserId, UserId, now
                });

            migrationBuilder.InsertData(
                table: "Items",
                columns: new[]
                {
                    "Id", "SKU", "Barcode", "Name", "ProductType", "Category", "Width", "Height", "Length", "Diameter",
                    "Weight", "FragilityType", "IsStackable", "MaxStackCount", "MaxWeightOnTop", "AllowedRotations",
                    "ImageUrl", "StackGroup", "SpecialNotes", "CreatedBy", "UpdatedBy", "UpdatedAtUtc"
                },
                values: new object[,]
                {
                    {
                        ItemId1, "DEMO-LP-20260503-001", "8691000000001", "Demo Box Small", "Box", 2, 400m, 300m, 500m, null,
                        12000m, 0, true, 5, 60000m, 0, "https://example.com/item1.png", "A", "Standard box", UserId, UserId, now
                    },
                    {
                        ItemId2, "DEMO-LP-20260503-002", "8691000000002", "Demo Box Medium", "Box", 2, 600m, 500m, 700m, null,
                        21000m, 1, true, 4, 50000m, 1, "https://example.com/item2.png", "B", "Fragile product", UserId, UserId, now
                    },
                    {
                        ItemId3, "DEMO-LP-20260503-003", "8691000000003", "Demo Box Large", "Box", 2, 800m, 700m, 1000m, null,
                        35000m, 0, false, 1, 0m, 2, "https://example.com/item3.png", "C", "Heavy unit", UserId, UserId, now
                    }
                });

            migrationBuilder.InsertData(
                table: "LoadingPlans",
                columns: new[]
                {
                    "Id", "PlanName", "VehicleId", "OptimizationCriteria", "OptimizationStatus",
                    "ErrorCode", "ErrorMessage", "TotalWeight", "FillRate", "InputTotalQuantity",
                    "PlacedQuantity", "UnplacedQuantity", "CenterOfGravityX", "CenterOfGravityY", "CenterOfGravityZ",
                    "CompanyId", "CreatedBy", "UpdatedBy", "UpdatedAtUtc"
                },
                values: new object[,]
                {
                    {
                        PlanId1, "Demo Plan Calculated", VehicleId, 1, 1,
                        "NONE", "No error", 157000m, 0.8235m, 8,
                        6, 2, null, null, null,
                        CompanyId, UserId, UserId, now
                    },
                    {
                        PlanId2, "Demo Plan Failed", VehicleId, 2, 2,
                        "OPT-AXLE-001", "Axle load constraint violated", 119000m, 0.6125m, 5,
                        4, 1, null, null, null,
                        CompanyId, UserId, UserId, now
                    }
                });

            migrationBuilder.InsertData(
                table: "LoadingPlanPlacements",
                columns: new[]
                {
                    "Id", "LoadingPlanId", "ItemId", "PositionX", "PositionY", "PositionZ", "Rotation",
                    "CreatedBy", "UpdatedBy", "UpdatedAtUtc"
                },
                values: new object[,]
                {
                    { PlacementId1, PlanId1, ItemId1, 0m, 0m, 0m, 0, UserId, UserId, now },
                    { PlacementId2, PlanId1, ItemId1, 450m, 0m, 0m, 0, UserId, UserId, now },
                    { PlacementId3, PlanId1, ItemId2, 0m, 0m, 600m, 1, UserId, UserId, now },
                    { PlacementId4, PlanId1, ItemId2, 650m, 0m, 600m, 1, UserId, UserId, now },
                    { PlacementId5, PlanId1, ItemId3, 0m, 0m, 1400m, 2, UserId, UserId, now },
                    { PlacementId6, PlanId1, ItemId1, 900m, 0m, 1400m, 0, UserId, UserId, now },
                    { PlacementId7, PlanId2, ItemId2, 0m, 0m, 0m, 1, UserId, UserId, now },
                    { PlacementId8, PlanId2, ItemId1, 500m, 0m, 0m, 0, UserId, UserId, now },
                    { PlacementId9, PlanId2, ItemId3, 0m, 0m, 900m, 2, UserId, UserId, now },
                    { PlacementId10, PlanId2, ItemId1, 900m, 0m, 900m, 0, UserId, UserId, now }
                });

            migrationBuilder.InsertData(
                table: "LoadingPlanUnplacedItems",
                columns: new[] { "Id", "LoadingPlanId", "ItemId", "Quantity", "Reason", "CreatedBy", "UpdatedBy", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { UnplacedId1, PlanId1, ItemId3, 1, 2, UserId, UserId, now },
                    { UnplacedId2, PlanId1, ItemId2, 1, 1, UserId, UserId, now },
                    { UnplacedId3, PlanId2, ItemId3, 1, 2, UserId, UserId, now }
                });

            migrationBuilder.InsertData(
                table: "LoadingPlanWarnings",
                columns: new[]
                {
                    "Id", "LoadingPlanId", "Code", "Message", "RelatedItemId", "RelatedPlacementId",
                    "CreatedBy", "UpdatedBy", "UpdatedAtUtc"
                },
                values: new object[,]
                {
                    { WarningId1, PlanId1, "W-BALANCE-001", "Center load is close to right side threshold.", ItemId3, PlacementId5, UserId, UserId, now },
                    { WarningId2, PlanId2, "W-AXLE-002", "Main axle load ratio is near maximum.", ItemId3, PlacementId9, UserId, UserId, now },
                    { WarningId3, PlanId2, "W-STACK-001", "Non-stackable item placed close to upper layer boundary.", ItemId1, PlacementId10, UserId, UserId, now }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                $"DELETE FROM [LoadingPlanWarnings] WHERE [Id] IN ('{WarningId1}', '{WarningId2}', '{WarningId3}')");

            migrationBuilder.Sql(
                $"DELETE FROM [LoadingPlanUnplacedItems] WHERE [Id] IN ('{UnplacedId1}', '{UnplacedId2}', '{UnplacedId3}')");

            migrationBuilder.Sql(
                $"DELETE FROM [LoadingPlanPlacements] WHERE [Id] IN ('{PlacementId1}', '{PlacementId2}', '{PlacementId3}', '{PlacementId4}', '{PlacementId5}', '{PlacementId6}', '{PlacementId7}', '{PlacementId8}', '{PlacementId9}', '{PlacementId10}')");

            migrationBuilder.Sql(
                $"DELETE FROM [LoadingPlans] WHERE [Id] IN ('{PlanId1}', '{PlanId2}')");

            migrationBuilder.Sql(
                $"DELETE FROM [Items] WHERE [Id] IN ('{ItemId1}', '{ItemId2}', '{ItemId3}')");

            migrationBuilder.Sql(
                $"DELETE FROM [Vehicles] WHERE [Id] = '{VehicleId}'");

            migrationBuilder.Sql(
                $"DELETE FROM [Companies] WHERE [Id] = '{CompanyId}'");
        }
    }
}
