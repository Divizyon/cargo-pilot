using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Security;

internal sealed class BCryptPasswordHasher : IPasswordHasher {
    public string HashPassword(string password) {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string hashedPassword) {
        return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
    }
}
