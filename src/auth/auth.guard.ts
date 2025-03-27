import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/types.js";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        let token = "";
        const request = context.switchToHttp().getRequest();
        token = this.extractTokenFromCookie(request);
        if (!token) {
            token = this.extractTokenFromHeader(request);
            if (!token) {
                throw new UnauthorizedException();
            }
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });

            const user = await this.userRepository.findOneBy({
                id: payload.userId,
                deletedAt: null,
            });

            if (user == null) {
                throw new UnauthorizedException();
            }

            request["user"] = payload;
        } catch {
            throw new UnauthorizedException();
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }

    private extractTokenFromCookie(req: Request): string | undefined {
        const jwtCookie = req.cookies["token"];
        if (typeof jwtCookie !== "string") {
            return undefined;
        }

        return jwtCookie;
    }
}
