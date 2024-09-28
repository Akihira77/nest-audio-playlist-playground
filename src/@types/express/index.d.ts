import { Request } from "express";

declare global {
    namespace Express {
        export interface Request extends Request {
            user: {
                userId: string;
                name: string;
            };
        }
    }
}
