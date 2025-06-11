import { Product } from "./product";

export interface Banner {
    id: string;
    product: Product;
    startDate: string;
    endDate: string;
    createAt?: string;
    subtext: string | null;
    type?: string | null;
    endTimerDate: string | null;
    priority: number;
    
}
