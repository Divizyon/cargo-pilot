export function getGreetingByHour(hour: number): string {
  if (hour >= 6 && hour <= 11) return 'Günaydın';
  if (hour >= 12 && hour <= 17) return 'İyi günler';
  return 'İyi akşamlar';
}
