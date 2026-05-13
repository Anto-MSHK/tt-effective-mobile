/**
 * Проверяет, что на сегодняшнюю дату человеку исполнилось не менее 18 лет.
 * Сравнение по календарной дате (год/месяц/день), без учёта времени суток.
 */
export function isAtLeast18YearsOld(dateOfBirth: Date, referenceDate: Date = new Date()): boolean {
  const refY = referenceDate.getUTCFullYear();
  const refM = referenceDate.getUTCMonth();
  const refD = referenceDate.getUTCDate();
  const birthY = dateOfBirth.getUTCFullYear();
  const birthM = dateOfBirth.getUTCMonth();
  const birthD = dateOfBirth.getUTCDate();

  let age = refY - birthY;
  if (refM < birthM || (refM === birthM && refD < birthD)) {
    age -= 1;
  }
  return age >= 18;
}
