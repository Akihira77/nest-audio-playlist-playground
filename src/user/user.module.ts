import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DrizzleModule } from "../drizzle/drizzle.module.js";
import { UserController } from "./user.controller.js";
import { SUserService, UserService } from "./user.service.js";

@Module({
    imports: [
        DrizzleModule,
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
