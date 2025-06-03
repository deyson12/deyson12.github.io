import { Comment } from "./coment";
import { Product } from "./product";

export interface Seller {
  id: string;
  profileImage: string;
  name: string;
  cellphone: string;
  description: string;
  rating: number;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  featuredProducts: Product[];
  products: Product[];
  comments: Comment[];
}