// src/modules/pets/pets.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet} from "../entities/pet.entity";
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
    constructor(
        @InjectRepository(Pet)
        private petsRepository: Repository<Pet>,
    ) {}

    async create(createPetDto: CreatePetDto, userId: string) {
        const newPet = this.petsRepository.create({
            ...createPetDto,
            ownerId: userId, // صاحب حیوان کاربری است که درخواست داده است
        });
        return await this.petsRepository.save(newPet);
    }

    async findAll(userId: string) {
        // فقط حیوانات متعلق به کاربر را برمی‌گرداند
        return await this.petsRepository.find({
            where: { ownerId: userId },
            relations: ['appointments'], // اگر نیاز به لیست نوبت‌ها هم دارید
        });
    }

    async findOne(id: string, userId: string) {
        const pet = await this.petsRepository.findOne({
            where: { id, ownerId: userId }, // بررسی مالکیت
            relations: ['appointments'],
        });

        if (!pet) {
            throw new NotFoundException('حیوان مورد نظر یافت نشد یا متعلق به شما نیست.');
        }
        return pet;
    }

    async update(id: string, updatePetDto: UpdatePetDto, userId: string) {
        const pet = await this.findOne(id, userId); // بررسی وجود و مالکیت
        await this.petsRepository.update(id, updatePetDto);
        return this.findOne(id, userId); // بازگرداندن اطلاعات به‌روز شده
    }

    async remove(id: string, userId: string) {
        const pet = await this.findOne(id, userId); // بررسی وجود و مالکیت
        await this.petsRepository.remove(pet);
        return { message: 'حیوان با موفقیت حذف شد.' };
    }
}