export function openWarningCount(closing: {
  readonly unreceivedPurchaseCount: number;
  readonly productionDraftCount: number;
  readonly draftSalesCheckpointCount: number;
  readonly missingCostProductCount: number;
  readonly negativeStockProductCount: number;
}): number {
  return (
    closing.unreceivedPurchaseCount +
    closing.productionDraftCount +
    closing.draftSalesCheckpointCount +
    closing.missingCostProductCount +
    closing.negativeStockProductCount
  );
}
