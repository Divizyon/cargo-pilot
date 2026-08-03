using CargoPilot.Domain.Enums;

namespace CargoPilot.WebAPI.Controllers;

public sealed record UpdateCompanyUserRequest(UserType? NewUserType, bool? IsActive);
