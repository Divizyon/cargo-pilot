namespace CargoPilot.Application.Features.Items.BulkImportItems;

public sealed record BulkImportResultDto(
    int TotalRows,
    int SuccessCount,
    int ErrorCount,
    IReadOnlyList<RowErrorDto> Errors);

public sealed record RowErrorDto(
    int RowIndex,
    string? Sku,
    string ErrorMessage);
