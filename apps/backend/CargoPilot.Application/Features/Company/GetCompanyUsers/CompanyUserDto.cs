namespace CargoPilot.Application.Features.CompanyManagement.GetCompanyUsers;

public sealed record CompanyUserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    bool IsActive);
