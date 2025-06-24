import { Plan } from "./plan";
import { User } from "./user";

export interface Subscription {
    id: string;
    user: User;
    plan: Plan;
    startDate: string;
    endDate: string;
    isActive: boolean;
}