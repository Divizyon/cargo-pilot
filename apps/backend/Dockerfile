FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy full backend tree so solution/csproj discovery works for monorepo layouts.
COPY . .

# Build and publish the first API project found under backend tree.
RUN pwsh -NoLogo -NoProfile -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$project = Get-ChildItem -Path . -Recurse -Filter *.csproj | Select-Object -First 1;" ^
  "if (-not $project) { throw 'No .csproj file found under apps/backend.' };" ^
  "dotnet restore $project.FullName;" ^
  "dotnet publish $project.FullName -c Release -o /app/publish /p:UseAppHost=false"

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

RUN pwsh -NoLogo -NoProfile -Command ^
  "$dll = Get-ChildItem -Path /app -Filter *.dll | Where-Object { $_.Name -notlike 'Microsoft.*' -and $_.Name -notlike 'System.*' } | Select-Object -First 1;" ^
  "if (-not $dll) { throw 'No application .dll found in /app after publish.' };" ^
  "Set-Content -Path /entrypoint.ps1 -Value ('dotnet /app/' + $dll.Name)"

ENTRYPOINT ["pwsh", "-NoLogo", "-NoProfile", "-File", "/entrypoint.ps1"]
