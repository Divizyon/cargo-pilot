using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UserSessionTokenHashlendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Duz metin refresh token'lar hash'e cevrilemez (tek yonlu fonksiyon).
            // Kolon dusurulmeden once tum aktif oturumlar gecersiz kilinir; kullanicilar
            // bir kez yeniden login olur. Satirlar silinmez, cihaz gecmisi korunur.
            migrationBuilder.Sql("UPDATE [UserSessions] SET [IsRevoked] = 1 WHERE [IsRevoked] = 0;");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_Token",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "Token",
                table: "UserSessions");

            migrationBuilder.AddColumn<string>(
                name: "TokenHash",
                table: "UserSessions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_TokenHash",
                table: "UserSessions",
                column: "TokenHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserSessions_TokenHash",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "TokenHash",
                table: "UserSessions");

            migrationBuilder.AddColumn<string>(
                name: "Token",
                table: "UserSessions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_Token",
                table: "UserSessions",
                column: "Token");
        }
    }
}
