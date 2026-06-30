import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CreateCommentDto, UpdateCommentStatusDto} from "./dto/comment.dto";

@Injectable()
export class CommentService {
    constructor(
        @InjectRepository(Comment)
        private readonly commentRepo: Repository<Comment>,
    ) {}

    async findAll(search?: string, status?: string): Promise<Comment[]> {
        const qb = this.commentRepo.createQueryBuilder('comment');

        if (status && status !== 'all') {
            qb.andWhere('comment.status = :status', { status });
        }

        if (search) {
            qb.andWhere(
                '(LOWER(comment.author) LIKE :search OR LOWER(comment.text) LIKE :search OR LOWER(comment.postTitle) LIKE :search)',
                { search: `%${search.toLowerCase()}%` },
            );
        }

        return qb.orderBy('comment.createdAt', 'DESC').getMany();
    }

    async create(dto: CreateCommentDto): Promise<Comment> {
        const comment = this.commentRepo.create(dto);
        return this.commentRepo.save(comment);
    }

    async updateStatus(id: number, dto: UpdateCommentStatusDto): Promise<Comment> {
        const comment = await this.commentRepo.findOne({ where: { id } });
        if (!comment) throw new NotFoundException('Comment not found');

        comment.status = dto.status;
        return this.commentRepo.save(comment);
    }

    async delete(id: number): Promise<void> {
        const result = await this.commentRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('Comment not found');
    }
}