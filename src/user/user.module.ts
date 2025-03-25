import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UserController } from "./user.controller.js";
import { SUserService, UserService } from "./user.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./types.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET,
            signOptions: {
                expiresIn: "1h",
            },
        }),
    ],
    controllers: [UserController],
    providers: [
        {
            provide: SUserService,
            useClass: UserService,
        },
    ],
    exports: [
        {
            provide: SUserService,
            useClass: UserService,
        },
    ],
})
export class UserModule {}
