import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthGuard } from "./auth.guard.js";
import { User } from "../user/types.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: "1h" },
        }),
    ],
    providers: [AuthGuard],
    exports: [AuthGuard],
})
export class AuthModule {}
