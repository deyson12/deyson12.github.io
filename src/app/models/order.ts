
import { ProductCart } from "./product-cart";

export interface Order {
  id: string;
  sellerId: string;
  buyerId: string;
  products: ProductCart[];
  status: string;
  address: string;
  paymentType: string;
  changeFrom: number;
  location: [number, number];
}
  