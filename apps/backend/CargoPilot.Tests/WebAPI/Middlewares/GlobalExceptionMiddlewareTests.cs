using System.Text.Json;
using CargoPilot.WebAPI.Middlewares;
using FluentAssertions;
using Xunit;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace CargoPilot.Tests.WebAPI.Middlewares;

public class GlobalExceptionMiddlewareTests
{
    private readonly Mock<ILogger<GlobalExceptionMiddleware>> _loggerMock = new();

    private GlobalExceptionMiddleware CreateMiddleware() =>
        new(_loggerMock.Object);

    [Fact]
    public async Task InvokeAsync_WhenNoException_CallsNextDelegate()
    {
        var middleware = CreateMiddleware();
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        var nextCalled = false;
        Task Next(HttpContext _)
        {
            nextCalled = true;
            return Task.CompletedTask;
        }

        await middleware.InvokeAsync(httpContext, Next);

        nextCalled.Should().BeTrue();
        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task InvokeAsync_WhenExceptionThrown_Returns500WithErrorEnvelope()
    {
        var middleware = CreateMiddleware();
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        static Task Next(HttpContext _) =>
            Task.FromException(new InvalidOperationException("test hata"));

        await middleware.InvokeAsync(httpContext, Next);

        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        httpContext.Response.ContentType.Should().Contain("application/json");

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var body = await reader.ReadToEndAsync();
        using var json = JsonDocument.Parse(body);
        var root = json.RootElement;

        root.GetProperty("isSuccess").GetBoolean().Should().BeFalse();
        root.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Null);
        root.GetProperty("error").GetProperty("code").GetString().Should().Be("ServerError.Unhandled");
    }

    [Fact]
    public async Task InvokeAsync_WhenExceptionThrown_IncludesTraceIdInResponseBody()
    {
        const string expectedTraceId = "test-trace-0001";

        var middleware = CreateMiddleware();
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        httpContext.TraceIdentifier = expectedTraceId;

        static Task Next(HttpContext _) =>
            Task.FromException(new InvalidOperationException("hata"));

        await middleware.InvokeAsync(httpContext, Next);

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var body = await reader.ReadToEndAsync();
        using var doc = JsonDocument.Parse(body);

        doc.RootElement.GetProperty("traceId").GetString().Should().Be(expectedTraceId);
    }

    [Fact]
    public async Task InvokeAsync_WhenExceptionThrown_LogsErrorWithTraceId()
    {
        _loggerMock.Setup(x => x.IsEnabled(LogLevel.Error)).Returns(true);

        var middleware = CreateMiddleware();
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        httpContext.TraceIdentifier = "trace-log-test";

        var exception = new InvalidOperationException("hata");
        Task Next(HttpContext _) => Task.FromException(exception);

        await middleware.InvokeAsync(httpContext, Next);

        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("trace-log-test")),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
