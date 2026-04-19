import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkCreateItems } from '@/lib/api/useItems';
import {
  downloadImportTemplate,
  parseExcelFile,
  validateRows,
  type ImportRowError,
} from '@/lib/utils/import-utils';

type Phase = 'idle' | 'parsing' | 'validating' | 'uploading' | 'done' | 'error';

interface Progress {
  processed: number;
  total: number;
}

export function ProductImport() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Progress>({ processed: 0, total: 0 });
  const [errors, setErrors] = useState<ImportRowError[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const bulkCreate = useBulkCreateItems();

  const reset = () => {
    setPhase('idle');
    setProgress({ processed: 0, total: 0 });
    setErrors([]);
    setValidCount(0);
    setSuccessCount(0);
    setFatalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    reset();
    try {
      setPhase('parsing');
      const rawRows = await parseExcelFile(file);
      if (rawRows.length === 0) {
        setFatalError(t('import.product.emptyFile'));
        setPhase('error');
        return;
      }

      setPhase('validating');
      setProgress({ processed: 0, total: rawRows.length });
      const { valid, errors: validationErrors } = await validateRows(rawRows, (processed, total) =>
        setProgress({ processed, total }),
      );
      setErrors(validationErrors);
      setValidCount(valid.length);

      if (valid.length === 0) {
        setPhase('done');
        return;
      }

      setPhase('uploading');
      const result = await bulkCreate.mutateAsync(valid);
      setSuccessCount(result.created);
      setPhase('done');
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  const isBusy = phase === 'parsing' || phase === 'validating' || phase === 'uploading';

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t('import.product.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('import.product.description')}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadImportTemplate()}
            disabled={isBusy}
          >
            {t('import.product.downloadTemplate')}
          </Button>
          <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
            {isBusy ? t('import.product.processing') : t('import.product.selectFile')}
          </Button>
          {phase !== 'idle' && !isBusy && (
            <Button type="button" variant="ghost" onClick={reset}>
              {t('import.product.reset')}
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {isBusy && (
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="space-y-1"
          >
            <div className="flex justify-between text-sm">
              <span>{t(`import.product.phase.${phase}`)}</span>
              <span>
                {progress.processed} / {progress.total} ({percent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t('import.product.summary', {
              success: successCount,
              validated: validCount,
              failed: errors.length,
            })}
          </div>
        )}

        {phase === 'error' && fatalError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {fatalError}
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t('import.product.errorCount', { count: errors.length })}
            </p>
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('import.product.column.row')}</th>
                    <th className="px-3 py-2 font-medium">{t('import.product.column.field')}</th>
                    <th className="px-3 py-2 font-medium">{t('import.product.column.message')}</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err, i) => (
                    <tr key={`${err.row}-${err.field ?? ''}-${i}`} className="border-t">
                      <td className="px-3 py-2">{err.row}</td>
                      <td className="px-3 py-2 text-muted-foreground">{err.field ?? '-'}</td>
                      <td className="px-3 py-2">{t(err.message, err.message)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
