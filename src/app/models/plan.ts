export interface Plan {
    id: string;
    name: string;
    price: number;
    durtationDays: number;
    productLimit: number;
    featuredLimit: number;
    prioritySearch: number;
    isDefault: boolean;
}