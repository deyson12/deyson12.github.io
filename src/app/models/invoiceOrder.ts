export interface InvoiceOrder {
    date: string;
    orderId: string;
    subtotal: number;
    orderProducts: {
        id: string;
        name: string;
        quantity: number;
        unitPrice: number;
    }[];
 }   