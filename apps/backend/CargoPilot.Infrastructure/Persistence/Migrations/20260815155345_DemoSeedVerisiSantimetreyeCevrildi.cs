using System.Globalization;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// SeedLoadingPlanDemoData milimetre ve gram olceginde demo verisi yaziyordu:
    /// arac 2450x2700x13600, kapasite 24000000. Standart tek birim olarak
    /// santimetreyi tanimliyor (docs/COORDINATE_STANDARD.md §8), bu yuzden ayni
    /// kayitlar santimetre okundugunda 10 kat buyuk bir arac uretiyordu.
    ///
    /// Uygulanmis migration duzenlenmez; duzeltme ayri bir adim olarak yapilir.
    ///
    /// Her guncelleme, satirin **hala seed degerini tasidigini** dogrulayan bir
    /// kosula baglidir. Demo kaydi elle duzenlenmis olabilir — test veritabaninda
    /// aracin olculeri zaten degistirilmisti — ve kosulsuz bir carpim o veriyi
    /// sessizce bozardi. Kosul ayni zamanda migration'i tekrarlanabilir kilar.
    /// </summary>
    public partial class DemoSeedVerisiSantimetreyeCevrildi : Migration
    {
        private const string VehicleId = "02ac4ae2-c445-44e0-aec8-bf5328febb2d";
        private const string ItemId1 = "a1618f9d-f7f4-4270-bf3f-7392bfbd0b52";
        private const string ItemId2 = "9d3f0ab4-f80b-4ff8-b2ab-0c91f616f434";
        private const string ItemId3 = "ea5ce974-6e7b-48f9-9e6c-c52974f66f54";
        private const string PlanIds =
            "'5b8d17fd-57c7-4f7e-bfa6-bfbf4ce4ff45','27af4d03-5f70-4773-8da5-bcbf2f5f18e4'";

        // scale: mm -> cm icin 0.1 (agirlikta g -> kg icin 0.001); Down bunun tersini alir.
        private static void Apply(
            MigrationBuilder migrationBuilder,
            decimal lengthScale,
            decimal weightScale,
            decimal vehicleWidth,
            decimal vehicleHeight,
            decimal vehicleLength,
            decimal item1Width,
            decimal item2Width,
            decimal item3Width)
        {
            migrationBuilder.Sql(string.Create(CultureInfo.InvariantCulture, $@"
                UPDATE [Vehicles]
                SET [InternalWidth]  = [InternalWidth]  * {lengthScale},
                    [InternalHeight] = [InternalHeight] * {lengthScale},
                    [InternalLength] = [InternalLength] * {lengthScale},
                    [MaxWeightCapacity] = [MaxWeightCapacity] * {weightScale}
                WHERE [Id] = '{VehicleId}'
                  AND [InternalWidth]  = {vehicleWidth}
                  AND [InternalHeight] = {vehicleHeight}
                  AND [InternalLength] = {vehicleLength};"));

            // Urunler ve yerlesimler birlikte olceklenir: yerlesim koordinatlari
            // urun olculeriyle ayni sistemde. Uclu de bozulmamissa dokunulur.
            migrationBuilder.Sql(string.Create(CultureInfo.InvariantCulture, $@"
                IF EXISTS (SELECT 1 FROM [Items] WHERE [Id] = '{ItemId1}' AND [Width] = {item1Width})
                   AND EXISTS (SELECT 1 FROM [Items] WHERE [Id] = '{ItemId2}' AND [Width] = {item2Width})
                   AND EXISTS (SELECT 1 FROM [Items] WHERE [Id] = '{ItemId3}' AND [Width] = {item3Width})
                BEGIN
                    UPDATE [Items]
                    SET [Width]  = [Width]  * {lengthScale},
                        [Height] = [Height] * {lengthScale},
                        [Length] = [Length] * {lengthScale},
                        [Weight] = [Weight] * {weightScale},
                        [MaxWeightOnTop] = [MaxWeightOnTop] * {weightScale}
                    WHERE [Id] IN ('{ItemId1}','{ItemId2}','{ItemId3}');

                    UPDATE [LoadingPlanPlacements]
                    SET [PositionX] = [PositionX] * {lengthScale},
                        [PositionY] = [PositionY] * {lengthScale},
                        [PositionZ] = [PositionZ] * {lengthScale}
                    WHERE [LoadingPlanId] IN ({PlanIds});

                    UPDATE [LoadingPlans]
                    SET [TotalWeight] = [TotalWeight] * {weightScale}
                    WHERE [Id] IN ({PlanIds});
                END;"));
        }

        protected override void Up(MigrationBuilder migrationBuilder)
            => Apply(migrationBuilder, 0.1m, 0.001m,
                vehicleWidth: 2450m, vehicleHeight: 2700m, vehicleLength: 13600m,
                item1Width: 400m, item2Width: 600m, item3Width: 800m);

        protected override void Down(MigrationBuilder migrationBuilder)
            => Apply(migrationBuilder, 10m, 1000m,
                vehicleWidth: 245m, vehicleHeight: 270m, vehicleLength: 1360m,
                item1Width: 40m, item2Width: 60m, item3Width: 80m);
    }
}
