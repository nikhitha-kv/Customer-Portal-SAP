// Sales order / dashboard model
export interface SalesOrderItem {
  matnr: string;    // Material Number
  itemDesc: string; // Item Description (ARKTX)
  qty: string;      // Order Quantity (KWMENG)
  vrkme: string;    // Sales Unit
}

export interface SalesOrder {
  vbeln: string;    // Sales order number
  erdat: string;    // Creation date
  auart: string;    // Order type
  docType: string;  // Inquiry / Sales Order
  netwr: string;    // Net value
  waerk: string;    // Currency
  items: SalesOrderItem[];
}

