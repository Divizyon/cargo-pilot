using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillItemCompanyId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Personal Company oluştur — CompanyId'si olmayan ve SuperAdmin olmayan her kullanıcı için.
            // UserType: SuperAdmin = 0, CompanyAdmin = 1, CompanyWorker = 2, Individual = 3
            migrationBuilder.Sql(@"
                CREATE TABLE #PersonalCompanyMap (
                    UserId    UNIQUEIDENTIFIER NOT NULL,
                    CompanyId UNIQUEIDENTIFIER NOT NULL,
                    UserEmail NVARCHAR(256)    NOT NULL
                );

                INSERT INTO #PersonalCompanyMap (UserId, CompanyId, UserEmail)
                SELECT Id, NEWID(), Email
                FROM Users
                WHERE CompanyId IS NULL
                  AND IsDeleted = 0
                  AND UserType != 0;

                INSERT INTO Companies (Id, Name, SubscriptionType, MaxUserCount, IsDeleted, IsActive, CreatedAtUtc)
                SELECT
                    CompanyId,
                    N'Personal - ' + UserEmail,
                    0,
                    1,
                    0,
                    1,
                    GETUTCDATE()
                FROM #PersonalCompanyMap;

                UPDATE u
                SET u.CompanyId = m.CompanyId
                FROM Users u
                INNER JOIN #PersonalCompanyMap m ON u.Id = m.UserId;

                DROP TABLE #PersonalCompanyMap;
            ");

            // Step 2: Items.CompanyId'yi CreatedBy kullanıcısının CompanyId'siyle doldur.
            // CreatedBy null olan veya kullanıcının CompanyId'si hâlâ null olan kayıtlar (SuperAdmin) dokunulmaz.
            migrationBuilder.Sql(@"
                UPDATE i
                SET i.CompanyId = u.CompanyId
                FROM Items i
                INNER JOIN Users u ON i.CreatedBy = u.Id
                WHERE i.CompanyId IS NULL
                  AND u.CompanyId IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Bu migration geri alınamaz: hangi Company kayıtlarının bu migration tarafından
            // oluşturulduğunu güvenilir biçimde tespit etmek mümkün değil.
        }
    }
}
