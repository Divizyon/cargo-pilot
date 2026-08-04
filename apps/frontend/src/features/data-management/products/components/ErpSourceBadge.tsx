interface ErpSourceBadgeProps {
  erpProviderName?: string | null;
}

export function ErpSourceBadge({ erpProviderName }: ErpSourceBadgeProps) {
  const provider = erpProviderName?.trim();
  return <span className="text-xs text-muted-foreground">{provider || 'Manuel'}</span>;
}
