ARG DOTNET_SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:8.0
ARG DOTNET_ASPNET_IMAGE=mcr.microsoft.com/dotnet/aspnet:8.0
FROM ${DOTNET_SDK_IMAGE} AS build
WORKDIR /src

# --- Restore katmanı -------------------------------------------------------
# Yalnızca NuGet restore grafiğini etkileyen dosyalar kopyalanır. Kaynak (.cs)
# değişiklikleri bu katmanı geçersiz kılmaz, dolayısıyla restore cache'den gelir.
# Directory.Build.props tüm projelere PackageReference eklediği için restore
# grafiğinin parçasıdır ve kaynaktan ÖNCE kopyalanmak zorundadır.
# CargoPilot.Engine.Bench bilinçli olarak kopyalanmaz: imaj yalnız WebAPI'yi
# yayınlar, Bench hiç derlenmez; kopyalamak boşuna cache geçersizleştirirdi.
COPY global.json Directory.Build.props CargoPilot.slnx ./
COPY CargoPilot.Domain/CargoPilot.Domain.csproj CargoPilot.Domain/
COPY CargoPilot.Application/CargoPilot.Application.csproj CargoPilot.Application/
COPY CargoPilot.Infrastructure/CargoPilot.Infrastructure.csproj CargoPilot.Infrastructure/
COPY CargoPilot.WebAPI/CargoPilot.WebAPI.csproj CargoPilot.WebAPI/

# ASP.NET Core Web API projesini (Sdk="Microsoft.NET.Sdk.Web") bul ve restore et.
# Çoklu proje (Domain/Application/Infrastructure class library'leri) olduğundan
# "ilk bulunan csproj" yaklaşımı yanlış projeyi (örn. Domain) hedefler.
#
# Ölçüm ve test projeleri elenir: CargoPilot.Engine.Bench de Sdk="...Web"
# kullanıyor (kendi HTTP ölçüm sunucusu için); ileride restore katmanına bir
# Web projesi daha eklenirse `head -1` yanlış projeyi seçebilir. Eleme sonrası
# birden fazla aday kalırsa hata verilir; sessizce birini seçmek bir kez imajı
# bozdu (imaj API yerine bench'i paketledi, container yeniden başlatma
# döngüsüne girdi).
# Bulunan yol publish adımında yeniden kullanılmak üzere diske yazılır.
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
    echo "$project" > /web-project.path; \
    dotnet restore "$project"

# --- Publish katmanı -------------------------------------------------------
# Kaynak ağacı restore'dan sonra kopyalanır; restore yeniden koşmasın diye
# publish --no-restore ile çalışır (eksik paket varsa build sessizce geçmez,
# assets file hatası verir).
COPY . .

RUN set -e; \
    project=$(cat /web-project.path); \
    dotnet publish "$project" -c Release -o /app/publish --no-restore /p:UseAppHost=false; \
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
