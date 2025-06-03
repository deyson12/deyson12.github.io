import { Product } from "./product";

export interface Banner {
    id: number;
    subText: string;
    endDate?: string;
    type?: string;
    product: Product;
}
