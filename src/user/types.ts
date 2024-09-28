export type UserModel = {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
};

export type UserDTO = Omit<UserModel, "password">;
export type CreateUserDTO = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export type LoginDTO = {
    email: string;
    password: string;
};
