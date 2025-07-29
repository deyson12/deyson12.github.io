import { Product } from "./product";

export interface ProductCart {
    product: Product;
    quantity: number;
    selectedOptions?: { [key: string]: any };
}
