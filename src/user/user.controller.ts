import {
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { IUserService, SUserService } from "./user.service.js";
import { Request, Response } from "express";
import { CreateUserDTO, LoginDTO } from "./types.js";
import { matchingString } from "../util/bcrypt.js";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "./auth.guard.js";

@Controller("users")
export class UserController {
    constructor(
        @Inject(SUserService) private readonly userSvc: IUserService,
        private readonly jwtService: JwtService,
    ) {}

    @Get("")
    public async findAll(@Res() res: Response): Promise<Response> {
        try {
            const users = await this.userSvc.findAll();

            return res.status(HttpStatus.OK).json({ users });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("id/:id")
    public async findUserById(
        @Req() req: Request<{ id: string }, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const user = await this.userSvc.findUserByIdExcPassword(
                req.params.id,
            );
            if (user == null) {
                return res.status(404).send("User not found");
            }

            return res.status(HttpStatus.OK).json({ user });
        } catch (error) {
            console.error(`${this.findUserById.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Post("register")
    public async register(
        @Req() req: Request<never, never, CreateUserDTO, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            if (req.body.password !== req.body.confirmPassword) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Unmatching password and confirmPassword");
            }
            const result = await this.userSvc.create(req.body);

            if (!result) {
                console.log(result);
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error creating account");
            }

            return res.status(201).json({ user: result });
        } catch (error) {
            console.error(`${this.register.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Get("my-info")
    public async getMyInfo(
        @Req() req: Request<never, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const user = await this.userSvc.findUserByIdExcPassword(
                req.user.userId,
            );
            if (!user) {
                return res.status(404).send("User not found");
            }

            return res.status(HttpStatus.OK).json({ user });
        } catch (error) {
            console.error(`${this.getMyInfo.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Post("login")
    public async login(
        @Req() req: Request<never, never, LoginDTO, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const u = await this.userSvc.findRawUserByEmail(req.body.email);
            if (!u) {
                return res.status(404).send("User not found");
            }

            if (!(await matchingString(req.body.password, u.password))) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Invalid credentials");
            }

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
            return res.status(201).json({ user: u, token: token });
        } catch (error) {
            console.error(`${this.login.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Put("")
    public async updateName(
        @Req() req: Request<never, never, { name: string }, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.userSvc.updateName(
                req.user.userId,
                req.body.name,
            );

            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating account");
            }

            return res.status(HttpStatus.OK).json({ user: result });
        } catch (error) {
            console.error(`${this.updateName.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Put("change-password")
    public async changePassword(
        @Req()
        req: Request<
            never,
            never,
            { password: string; confirmPassword: string },
            never
        >,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            if (req.body.password !== req.body.confirmPassword) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Unmatching password and confirmPassword");
            }

            const u = await this.userSvc.findRawUserById(req.user.userId);
            if (!u) {
                return res.status(404).send("User not found");
            }

            if (!(await matchingString(req.body.password, u.password))) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Invalid credentials");
            }

            const result = await this.userSvc.changePassword(
                req.user.userId,
                req.body.password,
            );

            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating account");
            }

            return res.status(HttpStatus.OK).json({ user: result });
        } catch (error) {
            console.error(`${this.changePassword.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Delete("")
    public async deleteMyAccount(
        @Req() req: Request<never, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.userSvc.delete(req.user.userId);
            if (!result) {
                return res.status(HttpStatus.NOT_FOUND).send("User not found");
            }

            return res.sendStatus(HttpStatus.NO_CONTENT);
        } catch (error) {
            console.error(`${this.deleteMyAccount.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }
}
