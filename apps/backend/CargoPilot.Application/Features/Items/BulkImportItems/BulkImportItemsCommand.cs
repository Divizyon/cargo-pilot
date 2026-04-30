using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.BulkImportItems;

public sealed record BulkImportItemsCommand(
    Stream FileStream,
    bool UpdateExisting = false
) : IRequest<Result<BulkImportResultDto>>;
