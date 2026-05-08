// Sales order / dashboard model
export interface SalesOrder {
  vbeln: string;    // Sales order number
  erdat: string;    // Creation date
  auart: string;    // Order type
  docType: string;  // Inquiry / Sales Order
  netwr: string;    // Net value
  waerk: string;    // Currency
}
