export interface InquiryItem {
  inquiryNumber: string;
  date: string;
  amount: string;
  status: string;
}

export interface LodItem {
  deliveryNumber: string;
  deliveryDate: string;
  deliveryType: string;
  refSalesOrder: string;
}

export interface PaymentItem {
  docNumber: string;
  date: string;
  amount: string;
  status: string;
}

export interface FinanceOverview {
  totalInvoiceAmount: string;
  totalPaid: string;
  totalOutstanding: string;
  totalCredit: string;
}
