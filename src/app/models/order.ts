
import { ProductCart } from "./product-cart";
import { Person } from "./person";
import { Seller } from "./selller";

export interface Order {
  order: string;
  sellerId: string;
  buyer: Person;
  products: ProductCart[];
  status: string;
  address: string;
  paymentType: string;
  changeFrom: number;
}
  