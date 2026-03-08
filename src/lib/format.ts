export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const riskBadgeClass = (level: string) => {
  const l = level.toLowerCase();
  if (l === 'critical') return 'badge-critical';
  if (l === 'high') return 'badge-high';
  if (l === 'medium') return 'badge-medium';
  return 'badge-low';
};

export const riskTextClass = (level: string) => {
  const l = level.toLowerCase();
  if (l === 'critical' || l === 'high') return 'text-red-brand';
  if (l === 'medium') return 'text-amber-brand';
  return 'text-green-brand';
};
