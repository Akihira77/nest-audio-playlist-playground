import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Res,
    UseGuards,
} from "@nestjs/common";
import { IUserService, SUserService } from "./user.service.js";
import { Response } from "express";
import { RegisterDto, LoginDto } from "./types.js";
import { matchingString } from "../util/bcrypt.js";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "./auth.guard.js";
import { User } from "../util/decorator.js";
import { CacheService } from "../cache/cache.service.js";

@Controller("users")
export class UserController {
    constructor(
        @Inject(SUserService) private readonly userSvc: IUserService,
        private readonly jwtService: JwtService,
        private readonly cacheService: CacheService,
    ) {}

    @Get("")
    public async findAll(@Res() res: Response): Promise<Response> {
        try {
            let users = await this.cacheService.get("users");
            if (users == null) {
                users = await this.userSvc.findAll();
                await this.cacheService.set("users", users);
            }

            return res.status(HttpStatus.OK).json({ users });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("id/:id")
    public async findUserById(
        @Param("id", ParseIntPipe) id: number,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let user = await this.cacheService.get(`user_${id}`);
            if (user == null) {
                user = await this.userSvc.findUserByIdExcPassword(id);

                if (user == null) {
                    return res
                        .status(HttpStatus.NOT_FOUND)
                        .send("User not found");
                }

                await this.cacheService.set(`user_${id}`, user, 0);
            }

            return res.status(HttpStatus.OK).json({ user });
        } catch (error) {
            console.error(`${this.findUserById.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Post("register")
    public async register(
        @Body() data: RegisterDto,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            if (data.password !== data.confirmPassword) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Unmatching password and confirmPassword");
            }
            const user = await this.userSvc.create(data);

            if (!user) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error creating account");
            }

            await this.cacheService.set(`user_${user.id}`, user, 0);
            return res.status(HttpStatus.CREATED).json({ user: user });
        } catch (error) {
            console.error(`${this.register.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Get("my-info")
    public async getMyInfo(
        @User() currentUser: { userId: number; name: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let user = await this.cacheService.get(
                `user_${currentUser.userId}`,
            );
            if (user == null) {
                user = await this.userSvc.findUserByIdExcPassword(
                    currentUser.userId,
                );

                if (!user) {
                    return res
                        .status(HttpStatus.NOT_FOUND)
                        .send("User not found");
                }

                await this.cacheService.set(
                    `user_${currentUser.userId}`,
                    user,
                    0,
                );
            }

            return res.status(HttpStatus.OK).json({ user });
        } catch (error) {
            console.error(`${this.getMyInfo.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Post("login")
    public async login(
        @Body() data: LoginDto,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const u = await this.userSvc.findRawUserByEmail(data.email);
            if (!u) {
                return res.status(HttpStatus.NOT_FOUND).send("User not found");
            }

            if (!(await matchingString(data.password, u.password))) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Invalid credentials");
            }

            u.password = "";
            const token = await this.jwtService.signAsync(
                {
                    userId: u.id,
                    name: u.name,
                },
                {
                    secret: process.env.JWT_SECRET,
                    expiresIn: "1h",
                    issuer: "Nest Audio Playlist Playground",
                    algorithm: "HS256",
                },
            );

            res.cookie("token", token);
            return res.status(HttpStatus.OK).json({ user: u, token: token });
        } catch (error) {
            console.error(`${this.login.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Put("")
    public async updateName(
        @User() currentUser: { userId: number; name: string },
        @Body() data: { name: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const user = await this.userSvc.updateName(
                currentUser.userId,
                data.name,
            );

            if (user == null) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating account");
            }

            await this.cacheService.set(`user_${user.id}`, user, 0);
            return res.status(HttpStatus.OK).json({ user: user });
        } catch (error) {
            console.error(`${this.updateName.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Put("change-password")
    public async changePassword(
        @User() currentUser: { userId: number; name: string },
        @Body() data: { password: string; confirmPassword: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            if (data.password !== data.confirmPassword) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Unmatching password and confirmPassword");
            }

            let user = await this.userSvc.findRawUserById(currentUser.userId);
            if (user == null) {
                return res.status(HttpStatus.NOT_FOUND).send("User not found");
            }

            if (!(await matchingString(data.password, user.password))) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Invalid credentials");
            }

            user = await this.userSvc.changePassword(
                currentUser.userId,
                data.password,
            );

            if (!user) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating account");
            }

            await this.cacheService.set(`user_${user.id}`, user, 0);
            return res.status(HttpStatus.OK).json({ user: user });
        } catch (error) {
            console.error(`${this.changePassword.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Delete("")
    public async deleteMyAccount(
        @User() currentUser: { userId: number; name: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.userSvc.delete(currentUser.userId);
            if (!result) {
                return res.status(HttpStatus.NOT_FOUND).send("User not found");
            }

            await this.cacheService.delete(`user_${currentUser.userId}`);
            return res.sendStatus(HttpStatus.NO_CONTENT);
        } catch (error) {
            console.error(`${this.deleteMyAccount.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }
}
