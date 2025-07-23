import { InvoiceOrder } from "./invoiceOrder";

export interface Invoice {
    id: string;
    sellerId: string;
    sellerName: string;
    billingMonth: Date;
    details?: InvoiceOrder[];
    orderTotal: number;
    commissionRate: number;
    commissionAmount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}