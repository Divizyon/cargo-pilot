using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using ClosedXML.Excel;
using MediatR;

namespace CargoPilot.Application.Features.Items.BulkImportItems;

public sealed class BulkImportItemsCommandHandler
    : IRequestHandler<BulkImportItemsCommand, Result<BulkImportResultDto>>
{
    private readonly IItemRepository _itemRepository;

    // Kolon başlıklarını alan adlarına eşler (büyük/küçük harf duyarsız)
    private static readonly Dictionary<string, string> ColumnMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "sku", "SKU" },
            { "ürün adı", "Name" }, { "urun adi", "Name" }, { "name", "Name" },
            { "ürün tipi", "ProductType" }, { "urun tipi", "ProductType" },
            { "product type", "ProductType" }, { "producttype", "ProductType" },
            { "en", "Width" }, { "width", "Width" },
            { "boy", "Length" }, { "length", "Length" },
            { "yükseklik", "Height" }, { "yukseklik", "Height" }, { "height", "Height" },
            { "ağırlık", "Weight" }, { "agirlik", "Weight" }, { "weight", "Weight" },
            { "hassasiyet türü", "FragilityType" }, { "hassasiyet turu", "FragilityType" },
            { "fragility", "FragilityType" }, { "fragilitytype", "FragilityType" },
            { "istiflenebilir", "IsStackable" }, { "stackable", "IsStackable" },
            { "is stackable", "IsStackable" }, { "isstackable", "IsStackable" },
            { "barkod", "Barcode" }, { "barcode", "Barcode" },
            { "kategori", "Category" }, { "category", "Category" },
            { "çap", "Diameter" }, { "cap", "Diameter" }, { "diameter", "Diameter" },
            { "max istif sayısı", "MaxStackCount" }, { "max istif sayisi", "MaxStackCount" },
            { "max stack count", "MaxStackCount" }, { "maxstackcount", "MaxStackCount" },
            { "max ağırlık üstünde", "MaxWeightOnTop" }, { "max agirlik ustunde", "MaxWeightOnTop" },
            { "max weight on top", "MaxWeightOnTop" }, { "maxweightontop", "MaxWeightOnTop" },
            { "izin verilen rotasyonlar", "AllowedRotations" },
            { "allowed rotations", "AllowedRotations" }, { "allowedrotations", "AllowedRotations" },
            // AC5: "Boyut Birimi" ve "Ağırlık Birimi" kolonları eklenerek değerler
            //      UnitConverter ile cm/kg'a dönüştürülmelidir. Şu an değerler ham kaydedilmektedir.
            { "resim url", "ImageUrl" }, { "image url", "ImageUrl" }, { "imageurl", "ImageUrl" },
            { "istif grubu", "StackGroup" }, { "stack group", "StackGroup" }, { "stackgroup", "StackGroup" },
            { "özel notlar", "SpecialNotes" }, { "ozel notlar", "SpecialNotes" },
            { "special notes", "SpecialNotes" }, { "specialnotes", "SpecialNotes" },
        };

    private static readonly HashSet<string> RequiredColumns =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "SKU", "Name", "ProductType", "Width", "Length", "Height",
            "Weight", "FragilityType", "IsStackable",
        };

    public BulkImportItemsCommandHandler(IItemRepository itemRepository)
    {
        _itemRepository = itemRepository;
    }

    public async Task<Result<BulkImportResultDto>> Handle(
        BulkImportItemsCommand request,
        CancellationToken cancellationToken)
    {
        using var workbook = new XLWorkbook(request.FileStream);
        var worksheet = workbook.Worksheets.First();

        var columnIndex = BuildColumnIndex(worksheet);

        var missingColumns = RequiredColumns
            .Where(c => !columnIndex.ContainsKey(c))
            .ToList();

        if (missingColumns.Count > 0)
        {
            return Result<BulkImportResultDto>.Failure(new Error(
                ErrorType.Validation,
                "BulkImport.MissingColumns",
                $"Zorunlu kolonlar eksik: {string.Join(", ", missingColumns)}"));
        }

        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;
        var dataRows = lastRow - 1; // başlık satırı hariç

        var errors = new List<RowErrorDto>();
        var itemsToAdd = new List<Item>();

        // Tüm SKU'ları tek sorguda çek — N+1'den kaçın
        var rawSkus = Enumerable.Range(2, dataRows)
            .Select(r => GetCell(worksheet, r, columnIndex, "SKU")?.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!)
            .ToList();

        var existingItemsBySku = await _itemRepository.GetItemsBySkusAsync(rawSkus, cancellationToken);

        // Dosya içindeki tekrar eden SKU'ları takip et
        var seenSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var rowNumber = 2; rowNumber <= lastRow; rowNumber++)
        {
            var rowErrors = new List<string>();

            var sku = GetCell(worksheet, rowNumber, columnIndex, "SKU")?.Trim();
            var name = GetCell(worksheet, rowNumber, columnIndex, "Name")?.Trim();
            var productType = GetCell(worksheet, rowNumber, columnIndex, "ProductType")?.Trim();

            if (string.IsNullOrWhiteSpace(sku))
                rowErrors.Add("SKU alanı zorunludur");
            if (string.IsNullOrWhiteSpace(name))
                rowErrors.Add("Ürün Adı zorunludur");
            if (string.IsNullOrWhiteSpace(productType))
                rowErrors.Add("Ürün Tipi zorunludur");

            var width = ParseDecimal(worksheet, rowNumber, columnIndex, "Width", rowErrors, "En");
            var height = ParseDecimal(worksheet, rowNumber, columnIndex, "Height", rowErrors, "Yükseklik");
            var length = ParseDecimal(worksheet, rowNumber, columnIndex, "Length", rowErrors, "Boy");
            var weight = ParseDecimal(worksheet, rowNumber, columnIndex, "Weight", rowErrors, "Ağırlık");

            if (width <= 0 && rowErrors.All(e => !e.Contains("En")))
                rowErrors.Add("En değeri 0'dan büyük olmalıdır");
            if (height <= 0 && rowErrors.All(e => !e.Contains("Yükseklik")))
                rowErrors.Add("Yükseklik değeri 0'dan büyük olmalıdır");
            if (length <= 0 && rowErrors.All(e => !e.Contains("Boy")))
                rowErrors.Add("Boy değeri 0'dan büyük olmalıdır");
            if (weight <= 0 && rowErrors.All(e => !e.Contains("Ağırlık")))
                rowErrors.Add("Ağırlık değeri 0'dan büyük olmalıdır");

            var fragilityType = ParseEnum<FragilityType>(
                worksheet, rowNumber, columnIndex, "FragilityType", rowErrors, "Hassasiyet Türü");
            var isStackable = ParseBool(
                worksheet, rowNumber, columnIndex, "IsStackable", rowErrors, "İstiflenebilir");

            var diameter = ParseOptionalDecimal(worksheet, rowNumber, columnIndex, "Diameter", rowErrors, "Çap");
            var maxStackCount = ParseOptionalInt(worksheet, rowNumber, columnIndex, "MaxStackCount") ?? 0;
            var maxWeightOnTop = ParseOptionalDecimal(worksheet, rowNumber, columnIndex, "MaxWeightOnTop", rowErrors, "Max Ağırlık Üstünde") ?? 0m;
            var allowedRotations = ParseOptionalEnum<AllowedRotations>(worksheet, rowNumber, columnIndex, "AllowedRotations", rowErrors, "İzin Verilen Rotasyonlar")
                ?? AllowedRotations.All;
            var category = ParseOptionalEnum<ItemCategory>(worksheet, rowNumber, columnIndex, "Category", rowErrors, "Kategori")
                ?? ItemCategory.Package;

            var barcode = NullIfEmpty(GetCell(worksheet, rowNumber, columnIndex, "Barcode"));
            var imageUrl = NullIfEmpty(GetCell(worksheet, rowNumber, columnIndex, "ImageUrl"));
            var stackGroup = NullIfEmpty(GetCell(worksheet, rowNumber, columnIndex, "StackGroup"));
            var specialNotes = NullIfEmpty(GetCell(worksheet, rowNumber, columnIndex, "SpecialNotes"));

            // İstiflenebilir kuralları
            if (isStackable && maxStackCount <= 0)
                rowErrors.Add("İstiflenebilir ürünlerde Max İstif Sayısı 0'dan büyük olmalıdır");
            if (!isStackable && maxStackCount != 0)
                rowErrors.Add("İstiflenemez ürünlerde Max İstif Sayısı 0 olmalıdır");
            if (isStackable && maxWeightOnTop <= 0)
                rowErrors.Add("İstiflenebilir ürünlerde Max Ağırlık Üstünde 0'dan büyük olmalıdır");
            if (!isStackable && maxWeightOnTop != 0)
                rowErrors.Add("İstiflenemez ürünlerde Max Ağırlık Üstünde 0 olmalıdır");

            if (rowErrors.Count > 0)
            {
                errors.Add(new RowErrorDto(rowNumber, sku,
                    $"Satır {rowNumber}: {string.Join("; ", rowErrors)}"));
                continue;
            }

            if (!string.IsNullOrWhiteSpace(sku) && seenSkus.Contains(sku))
            {
                errors.Add(new RowErrorDto(rowNumber, sku,
                    $"Satır {rowNumber}: SKU '{sku}' bu dosyada daha önce işlendi, atlandı"));
                continue;
            }

            if (!string.IsNullOrWhiteSpace(sku) && existingItemsBySku.TryGetValue(sku, out var existingItem))
            {
                if (!request.UpdateExisting)
                {
                    errors.Add(new RowErrorDto(rowNumber, sku,
                        $"Satır {rowNumber}: SKU '{sku}' zaten mevcut, atlandı"));
                    continue;
                }

                existingItem.Update(
                    sku: sku!,
                    barcode: barcode,
                    name: name!,
                    productType: productType!,
                    category: category,
                    width: width,
                    height: height,
                    length: length,
                    diameter: diameter,
                    weight: weight,
                    fragilityType: fragilityType,
                    isStackable: isStackable,
                    maxStackCount: maxStackCount,
                    maxWeightOnTop: maxWeightOnTop,
                    allowedRotations: allowedRotations,
                    imageUrl: imageUrl,
                    stackGroup: stackGroup,
                    specialNotes: specialNotes);
                _itemRepository.Update(existingItem);
                seenSkus.Add(sku!);
                continue;
            }

            itemsToAdd.Add(new Item(
                id: Guid.NewGuid(),
                sku: sku!,
                name: name!,
                productType: productType!,
                category: category,
                width: width,
                height: height,
                length: length,
                weight: weight,
                fragilityType: fragilityType,
                isStackable: isStackable,
                maxStackCount: maxStackCount,
                maxWeightOnTop: maxWeightOnTop,
                allowedRotations: allowedRotations,
                barcode: barcode,
                diameter: diameter,
                imageUrl: imageUrl,
                stackGroup: stackGroup,
                specialNotes: specialNotes));
            seenSkus.Add(sku!);
        }

        if (itemsToAdd.Count > 0)
            _itemRepository.AddRange(itemsToAdd);

        await _itemRepository.SaveChangesAsync(cancellationToken);

        var successCount = itemsToAdd.Count
            + existingItemsBySku.Keys.Count(seenSkus.Contains);

        return Result<BulkImportResultDto>.Success(new BulkImportResultDto(
            TotalRows: dataRows,
            SuccessCount: successCount,
            ErrorCount: errors.Count,
            Errors: errors));
    }

    private static Dictionary<string, int> BuildColumnIndex(IXLWorksheet worksheet)
    {
        var index = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var lastCol = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;

        for (var col = 1; col <= lastCol; col++)
        {
            var header = worksheet.Cell(1, col).GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(header)) continue;
            if (ColumnMap.TryGetValue(header, out var fieldName))
                index.TryAdd(fieldName, col);
        }

        return index;
    }

    private static string? GetCell(
        IXLWorksheet ws, int row, Dictionary<string, int> idx, string field)
    {
        if (!idx.TryGetValue(field, out var col)) return null;
        var value = ws.Cell(row, col).GetString();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static decimal ParseDecimal(
        IXLWorksheet ws, int row, Dictionary<string, int> idx,
        string field, List<string> errors, string displayName)
    {
        var raw = GetCell(ws, row, idx, field);
        if (raw is null) return 0;
        if (!decimal.TryParse(raw, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var value))
        {
            errors.Add($"{displayName} geçerli bir sayı değil: '{raw}'");
            return 0;
        }
        return value;
    }

    private static decimal? ParseOptionalDecimal(
        IXLWorksheet ws, int row, Dictionary<string, int> idx,
        string field, List<string> errors, string displayName)
    {
        var raw = GetCell(ws, row, idx, field);
        if (raw is null) return null;
        if (!decimal.TryParse(raw, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var value))
        {
            errors.Add($"{displayName} geçerli bir sayı değil: '{raw}'");
            return null;
        }
        return value;
    }

    private static int? ParseOptionalInt(
        IXLWorksheet ws, int row, Dictionary<string, int> idx, string field)
    {
        var raw = GetCell(ws, row, idx, field);
        if (raw is null) return null;
        return int.TryParse(raw, out var value) ? value : null;
    }

    private static bool ParseBool(
        IXLWorksheet ws, int row, Dictionary<string, int> idx,
        string field, List<string> errors, string displayName)
    {
        var raw = GetCell(ws, row, idx, field)?.ToLowerInvariant().Trim();
        return raw switch
        {
            "evet" or "true" or "1" or "yes" => true,
            "hayır" or "hayir" or "false" or "0" or "no" => false,
            null => false,
            _ => ReportAndReturnFalse(errors, displayName, raw),
        };
    }

    private static bool ReportAndReturnFalse(List<string> errors, string displayName, string raw)
    {
        errors.Add($"{displayName} geçersiz değer: '{raw}' (evet/hayır/true/false bekleniyor)");
        return false;
    }

    private static T ParseEnum<T>(
        IXLWorksheet ws, int row, Dictionary<string, int> idx,
        string field, List<string> errors, string displayName) where T : struct, Enum
    {
        var raw = GetCell(ws, row, idx, field);
        if (raw is null) { errors.Add($"{displayName} zorunludur"); return default; }
        if (Enum.TryParse<T>(raw, ignoreCase: true, out var value)) return value;
        if (int.TryParse(raw, out var intVal) && Enum.IsDefined(typeof(T), intVal))
            return (T)(object)intVal;
        errors.Add($"{displayName} geçersiz değer: '{raw}'");
        return default;
    }

    private static T? ParseOptionalEnum<T>(
        IXLWorksheet ws, int row, Dictionary<string, int> idx,
        string field, List<string> errors, string displayName) where T : struct, Enum
    {
        var raw = GetCell(ws, row, idx, field);
        if (raw is null) return null;
        if (Enum.TryParse<T>(raw, ignoreCase: true, out var value)) return value;
        if (int.TryParse(raw, out var intVal) && Enum.IsDefined(typeof(T), intVal))
            return (T)(object)intVal;
        errors.Add($"{displayName} geçersiz değer: '{raw}'");
        return null;
    }
}
