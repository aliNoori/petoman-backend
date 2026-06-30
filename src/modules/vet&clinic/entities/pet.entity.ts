import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from "../../../shared/user/entities/user.entity";
import { ApiProperty } from '@nestjs/swagger';
import { Appointment } from "./appointment.entity";

export enum PetType {
    DOG = 'DOG',
    CAT = 'CAT',
    BIRD = 'BIRD',
    OTHER = 'OTHER',
}

@Entity('pets')
export class Pet {
    @ApiProperty({ example: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.pets)
    @JoinColumn({ name: 'ownerId' })
    owner: User;

    @Column()
    ownerId: string;

    @OneToMany(() => Appointment, (appointment) => appointment.pet)
    appointments: Appointment[];

    @ApiProperty({ example: 'Puppy' })
    @Column()
    name: string;

    @ApiProperty({ enum: PetType })
    @Column({ type: 'enum', enum: PetType })
    type: PetType;

    @ApiProperty({ example: 'شیتزو', required: false })
    @Column({ nullable: true })
    breed: string;

    @ApiProperty({ example: 2, required: false })
    @Column({ type: 'decimal', nullable: true }) // استفاده از decimal برای سن دقیق‌تر اگر لازم باشد، در غیر این صورت number کافی است
    age: number;

    @ApiProperty({ example: 'نر', required: false })
    @Column({ nullable: true })
    gender: string;

    @ApiProperty({ example: 5.5, required: false })
    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    weight: number;

    @ApiProperty({ example: 'مشکی', required: false })
    @Column({ nullable: true })
    color: string;

    @ApiProperty({ example: '123456789', required: false })
    @Column({ nullable: true })
    microchip: string;

    @ApiProperty({ example: false, required: false })
    @Column({ type: 'boolean', default: false })
    isNeutered: boolean;

    @ApiProperty({ example: 'حساسیت به...', required: false })
    @Column({ type: 'text', nullable: true })
    medicalHistory: string;

    @ApiProperty({ example: 'توضیحات تکمیلی', required: false })
    @Column({ type: 'text', nullable: true })
    description: string;

    @ApiProperty({ example: 'http://...', required: false })
    @Column({ nullable: true })
    logo: string;
}