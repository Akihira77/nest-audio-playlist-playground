import { Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PG_CONNECTION } from "../constants.js";
import * as schema from "../drizzle/schema.js";
import { hashString } from "../util/bcrypt.js";
import { UserDTO, UserModel, CreateUserDTO } from "./types.js";

export interface IUserService {
    findAll(): Promise<UserDTO[]>;
    findUserByIdExcPassword(id: string): Promise<UserDTO | undefined>;
    findRawUserById(id: string): Promise<UserModel | undefined>;
    findRawUserByEmail(email: string): Promise<UserModel | undefined>;
    create(u: CreateUserDTO): Promise<UserDTO | undefined>;
    updateName(id: string, name: string): Promise<UserDTO | undefined>;
    changePassword(
        id: string,
        newPassword: string,
    ): Promise<UserDTO | undefined>;
    delete(userId: string): Promise<boolean>;
}
export const SUserService = Symbol("IUserService");

export class UserService implements IUserService {
    constructor(
        @Inject(PG_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    public async delete(userId: string): Promise<boolean> {
        try {
            const res = await this.db
                .delete(schema.users)
                .where(eq(schema.users.id, userId));

            return res.rowCount > 0;
        } catch (error) {
            console.error(`${this.delete.name} error`, error);
            return false;
        }
    }

    public async findAll(): Promise<UserDTO[]> {
        try {
            return this.db.query.users.findMany({
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return [];
        }
    }

    public async findUserByIdExcPassword(
        id: string,
    ): Promise<UserDTO | undefined> {
        try {
            const result = await this.db.query.users.findFirst({
                where: eq(schema.users.id, id),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            });

            return result;
        } catch (error) {
            console.error(`${this.findUserByIdExcPassword.name} error`, error);
            return undefined;
        }
    }

    public async findRawUserById(id: string): Promise<UserModel | undefined> {
        try {
            const result = await this.db.query.users.findFirst({
                where: eq(schema.users.id, id),
            });

            return result;
        } catch (error) {
            console.error(`${this.findRawUserById.name} error`, error);
            return undefined;
        }
    }

    public async findRawUserByEmail(
        email: string,
    ): Promise<UserModel | undefined> {
        try {
            const result = await this.db.query.users.findFirst({
                where: eq(schema.users.email, email),
            });

            return result;
        } catch (error) {
            console.error(`${this.findRawUserByEmail.name} error`, error);
            return undefined;
        }
    }

    public async create(u: CreateUserDTO): Promise<UserDTO | undefined> {
        try {
            const hashedPassword = await hashString(u.password);

            const res = await this.db
                .insert(schema.users)
                .values({
                    name: u.name,
                    email: u.email,
                    password: hashedPassword,
                })
                .returning({
                    id: schema.users.id,
                    name: schema.users.name,
                    email: schema.users.email,
                    createdAt: schema.users.createdAt,
                });

            return res[0];
        } catch (error) {
            console.error(`${this.create.name} error`, error);
            return undefined;
        }
    }

    public async updateName(
        id: string,
        name: string,
    ): Promise<UserDTO | undefined> {
        try {
            const res = await this.db
                .update(schema.users)
                .set({
                    name: name,
                })
                .where(eq(schema.users.id, id))
                .returning({
                    id: schema.users.id,
                    name: schema.users.name,
                    email: schema.users.email,
                    createdAt: schema.users.createdAt,
                });

            return res[0];
        } catch (error) {
            console.error(`${this.updateName.name} error`, error);
            return undefined;
        }
    }

    public async changePassword(
        id: string,
        newPassword: string,
    ): Promise<UserDTO | undefined> {
        try {
            const hashedPassword = await hashString(newPassword);
            const res = await this.db
                .update(schema.users)
                .set({
                    password: hashedPassword,
                })
                .where(eq(schema.users.id, id))
                .returning({
                    id: schema.users.id,
                    name: schema.users.name,
                    email: schema.users.email,
                    createdAt: schema.users.createdAt,
                });

            return res[0];
        } catch (error) {
            console.error(`${this.changePassword.name} error`, error);
            return undefined;
        }
    }
}
