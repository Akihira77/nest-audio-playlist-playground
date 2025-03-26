import { Injectable } from "@nestjs/common";
import { hashString } from "../util/bcrypt.js";
import { RegisterDto, User } from "./types.js";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

export interface IUserService {
    findAll(): Promise<User[]>;
    findUserByIdExcPassword(id: number): Promise<User | null>;
    findRawUserById(id: number): Promise<User | null>;
    findRawUserByEmail(email: string): Promise<User | null>;
    create(u: RegisterDto): Promise<User | null>;
    updateName(id: number, name: string): Promise<User | null>;
    changePassword(id: number, newPassword: string): Promise<User | null>;
    delete(userId: number): Promise<boolean>;
}
export const SUserService = Symbol("IUserService");

@Injectable()
export class UserService implements IUserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    public async delete(userId: number): Promise<boolean> {
        try {
            const res = await this.userRepository.delete(userId);
            return res.affected > 0;
        } catch (error) {
            console.error(`${this.delete.name} error`, error);
            return false;
        }
    }

    public async findAll(): Promise<User[]> {
        try {
            return await this.userRepository.find({
                select: ["id", "name", "email", "createdAt"],
            });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return [];
        }
    }

    public async findUserByIdExcPassword(id: number): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { id },
                select: ["id", "name", "email", "createdAt"],
            });
        } catch (error) {
            console.error(`${this.findUserByIdExcPassword.name} error`, error);
            return undefined;
        }
    }

    public async findRawUserById(id: number): Promise<User | undefined> {
        try {
            return await this.userRepository.findOne({ where: { id } });
        } catch (error) {
            console.error(`${this.findRawUserById.name} error`, error);
            return undefined;
        }
    }

    public async findRawUserByEmail(email: string): Promise<User | undefined> {
        try {
            return await this.userRepository.findOne({ where: { email } });
        } catch (error) {
            console.error(`${this.findRawUserByEmail.name} error`, error);
            return undefined;
        }
    }

    public async create(u: RegisterDto): Promise<User | undefined> {
        try {
            const hashedPassword = await hashString(u.password);
            const newUser = this.userRepository.create({
                name: u.name,
                email: u.email,
                password: hashedPassword,
            });

            const savedUser = await this.userRepository.save(newUser);

            return {
                id: savedUser.id,
                name: savedUser.name,
                email: savedUser.email,
                createdAt: savedUser.createdAt,
            } as User;
        } catch (error) {
            console.error(`${this.create.name} error`, error);
            return undefined;
        }
    }

    public async updateName(
        id: number,
        name: string,
    ): Promise<User | undefined> {
        try {
            await this.userRepository.update(id, { name });

            return await this.userRepository.findOne({
                where: { id },
                select: ["id", "name", "email", "createdAt"],
            });
        } catch (error) {
            console.error(`${this.updateName.name} error`, error);
            return undefined;
        }
    }

    public async changePassword(
        id: number,
        newPassword: string,
    ): Promise<User | undefined> {
        try {
            const hashedPassword = await hashString(newPassword);
            await this.userRepository.update(id, { password: hashedPassword });

            return await this.userRepository.findOne({
                where: { id },
                select: ["id", "name", "email", "createdAt"],
            });
        } catch (error) {
            console.error(`${this.changePassword.name} error`, error);
            return undefined;
        }
    }
}
