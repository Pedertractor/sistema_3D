/** Cálculos de consumo e tempo de impressão de um item. */
export interface ItemPrintParams {
  gramsPerUnit: number;
  printMinutesPerUnit: number;
  unitsPerPrint: number;
}

export function calculatePrintJob(item: ItemPrintParams, quantity: number) {
  const unitsPerPrint = Math.max(1, item.unitsPerPrint);
  const prints = Math.ceil(quantity / unitsPerPrint);
  const grams = item.gramsPerUnit * quantity;
  // Cada impressão (mesa) leva o tempo de uma mesa cheia
  const minutes = prints * unitsPerPrint * item.printMinutesPerUnit;
  return { prints, grams, minutes };
}
