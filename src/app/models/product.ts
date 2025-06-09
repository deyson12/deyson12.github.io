import { Seller } from "./selller";

export interface Product {
    id: number;
    name: string;
    shortDescription: string;
    stars: number;
    image: string;
    price: number;
    originalPrice: number | null;
    sales: number;
    note?: string;
    featured?: boolean;
    description?: string;
    category?: string;
    tags?: string;
    rating?: number;
    reviews?: number;
    stock?: number;
    images?: string[];
    seller: string;
}
