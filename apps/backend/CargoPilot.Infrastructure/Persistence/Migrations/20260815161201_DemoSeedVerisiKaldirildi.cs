using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// SeedLoadingPlanDemoData ile eklenen demo veri kaldirilir.
    ///
    /// Kayitlar milimetre ve gram olceginde yazilmisti (arac 2450x2700x13600,
    /// kapasite 24000000). Standart tek birim olarak santimetreyi tanimliyor
    /// (docs/COORDINATE_STANDARD.md §8), dolayisiyla ayni satirlar santimetre
    /// okundugunda 10 kat buyuk bir arac uretiyordu. Veriyi olceklemek yerine
    /// tamamen kaldirmak tercih edildi.
    ///
    /// Sirket ve kullanici kayitlarina DOKUNULMAZ: seed'in acti Company/AppUser
    /// satirlari zaman icinde gercek calisma verisinin sahibi olmus durumda
    /// (orn. ERP taslaklari ve kullanicinin kendi urunleri bunlara bagli).
    /// Orijinal migration'in Down blogu sirketi de siliyordu; burada bilincli
    /// olarak yapilmiyor.
    ///
    /// Silme FK bagimliligina gore cocuktan ebeveyne dogru sirali: plan
    /// alt tablolari -> planlar -> urunler -> arac. SyncLogs plani isaret
    /// ediyorsa silinmez, yalnizca bagi bosaltilir: senkronizasyon gecmisi
    /// demo veriden bagimsiz bir kayittir.
    /// </summary>
    public partial class DemoSeedVerisiKaldirildi : Migration
    {
        private const string VehicleId = "'02ac4ae2-c445-44e0-aec8-bf5328febb2d'";
        private const string ItemIds =
            "'a1618f9d-f7f4-4270-bf3f-7392bfbd0b52'," +
            "'9d3f0ab4-f80b-4ff8-b2ab-0c91f616f434'," +
            "'ea5ce974-6e7b-48f9-9e6c-c52974f66f54'";
        private const string PlanIds =
            "'5b8d17fd-57c7-4f7e-bfa6-bfbf4ce4ff45'," +
            "'27af4d03-5f70-4773-8da5-bcbf2f5f18e4'";

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
                DELETE FROM [LoadingPlanWarnings]      WHERE [LoadingPlanId] IN ({PlanIds});
                DELETE FROM [LoadingPlanUnplacedItems] WHERE [LoadingPlanId] IN ({PlanIds});
                DELETE FROM [LoadingPlanPlacements]    WHERE [LoadingPlanId] IN ({PlanIds});
                DELETE FROM [LoadingPlanInputItems]    WHERE [LoadingPlanId] IN ({PlanIds});
                DELETE FROM [LoadingPlanItemGroups]    WHERE [LoadingPlanId] IN ({PlanIds});
                DELETE FROM [ShareLinks]               WHERE [PlanId] IN ({PlanIds});
                UPDATE [SyncLogs] SET [LoadingPlanId] = NULL WHERE [LoadingPlanId] IN ({PlanIds});
                DELETE FROM [LoadingPlans]             WHERE [Id] IN ({PlanIds});
                DELETE FROM [UserVehicleFavorites]     WHERE [VehicleId] = {VehicleId};
                DELETE FROM [Items]                    WHERE [Id] IN ({ItemIds});
                DELETE FROM [Vehicles]                 WHERE [Id] = {VehicleId};");
        }

        /// <remarks>
        /// Geri alinamaz: silinen demo satirlari yeniden uretilmez. Migration'i
        /// geri almak veriyi geri getirmez, bu yuzden Down bilincli olarak bostur.
        /// </remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Bilincli olarak bos: silinen demo satirlari yeniden uretilmez.
        }
    }
}
