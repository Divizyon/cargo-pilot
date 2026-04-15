FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy full backend tree so solution/csproj discovery works for monorepo layouts.
COPY . .

# Build and publish the first API project found under backend tree.
RUN set -e; \
    project=$(find . -name "*.csproj" | head -1); \
    if [ -z "$project" ]; then echo "ERROR: No .csproj file found under apps/backend."; exit 1; fi; \
    dotnet restore "$project"; \
    dotnet publish "$project" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Entrypoint: uygulama DLL'ini bul ve çalıştır.
RUN set -e; \
    dll=$(find /app -maxdepth 1 -name "*.dll" ! -name "Microsoft.*" ! -name "System.*" | head -1); \
    if [ -z "$dll" ]; then echo "ERROR: No application .dll found in /app after publish."; exit 1; fi; \
    printf '#!/bin/sh\nexec dotnet %s "$@"\n' "$dll" > /entrypoint.sh; \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
