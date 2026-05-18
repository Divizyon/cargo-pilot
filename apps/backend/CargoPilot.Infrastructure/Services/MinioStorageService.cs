using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace CargoPilot.Infrastructure.Services;

internal sealed partial class MinioStorageService : IStorageService
{
    private readonly IMinioClient _client;
    private readonly string _bucketName;
    private readonly string _publicEndpoint;
    private readonly bool _useSSL;
    private readonly bool _hasCustomPublicEndpoint;
    private readonly ILogger<MinioStorageService> _logger;

    public MinioStorageService(IMinioClient client, IOptions<MinioSettings> options, ILogger<MinioStorageService> logger)
    {
        _client = client;
        _bucketName = options.Value.BucketName;
        _hasCustomPublicEndpoint = !string.IsNullOrEmpty(options.Value.PublicEndpoint);
        _publicEndpoint = _hasCustomPublicEndpoint ? options.Value.PublicEndpoint! : options.Value.Endpoint;
        _useSSL = options.Value.UseSSL;
        _logger = logger;
    }

    public async Task<string> UploadAsync(
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        await EnsureBucketExistsAsync(cancellationToken);

        var putArgs = new PutObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectKey)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType);

        await _client.PutObjectAsync(putArgs, cancellationToken);

        var hasScheme = _publicEndpoint.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                        _publicEndpoint.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        var scheme = _useSSL ? "https" : "http";
        var baseUrl = hasScheme ? _publicEndpoint : $"{scheme}://{_publicEndpoint}";

        // PublicEndpoint set edilmişse nginx zaten bucket'ı route eder, tekrar ekleme.
        return _hasCustomPublicEndpoint
            ? $"{baseUrl}/{objectKey}"
            : $"{baseUrl}/{_bucketName}/{objectKey}";
    }

    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var removeArgs = new RemoveObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectKey);

        await _client.RemoveObjectAsync(removeArgs, cancellationToken);
    }

    private async Task EnsureBucketExistsAsync(CancellationToken cancellationToken)
    {
        var existsArgs = new BucketExistsArgs().WithBucket(_bucketName);
        var exists = await _client.BucketExistsAsync(existsArgs, cancellationToken);
        if (!exists)
        {
            LogBucketCreating(_bucketName);
            var makeArgs = new MakeBucketArgs().WithBucket(_bucketName);
            await _client.MakeBucketAsync(makeArgs, cancellationToken);
        }

        var policy = $$"""
            {
              "Version": "2012-10-17",
              "Statement": [{
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": ["arn:aws:s3:::{{_bucketName}}/*"]
              }]
            }
            """;

        var policyArgs = new SetPolicyArgs()
            .WithBucket(_bucketName)
            .WithPolicy(policy);

        await _client.SetPolicyAsync(policyArgs, cancellationToken);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "MinIO bucket '{Bucket}' oluşturuluyor.")]
    private partial void LogBucketCreating(string bucket);
}
