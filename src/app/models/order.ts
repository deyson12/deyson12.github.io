
import { ProductCart } from "./product-cart";
import { User } from "./user";

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
  deliveryPrice?: number;
  createdAt?: Date;
  seller?: User;
  buyer?: User;
}
  