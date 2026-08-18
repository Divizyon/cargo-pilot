ARG DOTNET_SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:8.0
ARG DOTNET_ASPNET_IMAGE=mcr.microsoft.com/dotnet/aspnet:8.0
FROM ${DOTNET_SDK_IMAGE} AS build
WORKDIR /src

# Copy full backend tree so solution/csproj discovery works for monorepo layouts.
COPY . .

# ASP.NET Core Web API projesini (Sdk="Microsoft.NET.Sdk.Web") bul ve yayınla.
# Çoklu proje (Domain/Application/Infrastructure class library'leri) olduğundan
# "ilk bulunan csproj" yaklaşımı yanlış projeyi (örn. Domain) hedefler.
#
# Ölçüm ve test projeleri elenir: CargoPilot.Engine.Bench de Sdk="...Web"
# kullanıyor (kendi HTTP ölçüm sunucusu için) ve alfabetik sırada WebAPI'den
# önce geldiği için `head -1` onu seçiyordu. İmaj API yerine bench'i paketliyor,
# container da bench koşusunu bitirip yeniden başlatma döngüsüne giriyordu.
#
# Eleme sonrası birden fazla aday kalırsa hata verilir; sessizce birini seçmek
# bu hatanın ta kendisiydi.
RUN set -e; \
    candidates=$(find . -type f -name '*.csproj' -exec grep -l 'Microsoft\.NET\.Sdk\.Web' {} + \
        | grep -v -E '\.(Tests|Bench)/' || true); \
    count=$(printf '%s' "$candidates" | grep -c . || true); \
    if [ "$count" -eq 0 ]; then \
        echo "ERROR: Sdk='Microsoft.NET.Sdk.Web' olan yayınlanabilir csproj bulunamadı apps/backend altında."; \
        exit 1; \
    fi; \
    if [ "$count" -gt 1 ]; then \
        echo "ERROR: Birden fazla Web projesi bulundu; hangisinin yayınlanacağı belirsiz:"; \
        printf '%s\n' "$candidates"; \
        exit 1; \
    fi; \
    project="$candidates"; \
    echo "Web API projesi: $project"; \
    dotnet restore "$project"; \
    dotnet publish "$project" -c Release -o /app/publish /p:UseAppHost=false; \
    basename "$project" .csproj > /app/publish/.entry-dll

FROM ${DOTNET_ASPNET_IMAGE} AS final
WORKDIR /app

# Health check için curl (aspnet:8.0 Debian Bookworm tabanlı, curl yüklü değil)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Entrypoint: publish sırasında yazılan proje adından tam DLL yolunu üret.
RUN set -e; \
    name=$(cat /app/.entry-dll); \
    rm /app/.entry-dll; \
    dll="/app/${name}.dll"; \
    if [ ! -f "$dll" ]; then echo "ERROR: DLL bulunamadı: $dll"; ls /app; exit 1; fi; \
    printf '#!/bin/sh\nexec dotnet %s "$@"\n' "$dll" > /entrypoint.sh; \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
