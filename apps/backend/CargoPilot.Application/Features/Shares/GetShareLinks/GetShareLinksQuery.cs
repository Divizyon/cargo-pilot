using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Shares.CreateShareLink;
using MediatR;

namespace CargoPilot.Application.Features.Shares.GetShareLinks;

public sealed record GetShareLinksQuery : IRequest<Result<IReadOnlyList<ShareLinkDto>>>;
