// Financial / invoice model
export interface FinancialItem {
  invoiceNumber: string;
  billingDate: string;
  dueDate: string;
  aging: string;      // Days overdue or due
  amount: string;
  currency: string;
  type?: string;
}
