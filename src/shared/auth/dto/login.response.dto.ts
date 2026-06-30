export class LoginResponseDto {
    accessToken: string;

    user: {
        id: string;
        fullName: string;
        email: string;
        avatar?: string;
        phoneNumber?: string;
        isVerified: boolean;
    };
}
