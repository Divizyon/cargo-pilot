namespace CargoPilot.Application.Abstractions;

public interface IStorageService {
    Task<string> UploadAsync(
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);
}
