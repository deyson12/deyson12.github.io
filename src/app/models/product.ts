export interface Product {
    id: string;
    name: string;
    shortDescription: string;
    stars: number;
    image: string;
    price: number;
    originalPrice: number | null;
    sales: number;
    note?: string;
    active?: boolean;
    featured?: boolean;
    description?: string;
    category?: string;
    tags?: string;
    rating?: number;
    reviews?: number;
    stock?: number;
    images?: string[];
    seller: string;
    dropshippingUrl: string;
    dropshippingPrice: number;
    revenue: number;
    maxDeliveryTime: string;
}
