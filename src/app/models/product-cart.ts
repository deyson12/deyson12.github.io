import { Product } from "./product";

export interface ProductCart {
    id: number;
    product: Product;
    quantity: number;
}
