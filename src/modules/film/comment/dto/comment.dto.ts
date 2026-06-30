import { IsString, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    author: string;

    @IsString()
    text: string;

    @IsString()
    postTitle: string;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;
}

export class UpdateCommentStatusDto {
    @IsEnum(['pending', 'approved', 'rejected'])
    status: 'pending' | 'approved' | 'rejected';
}