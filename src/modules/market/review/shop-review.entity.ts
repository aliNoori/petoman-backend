import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import {Tenant} from "../../../core/entities/tenant.entity";
import {User} from "../../../shared/user/entities/user.entity";


@Entity('shop_reviews')
export class ShopReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant scope */
    @Column('uuid')
    tenantId: string;

    /** Reviewer */
    @Column('uuid')
    userId: string;

    /** Rating 1 to 5 */
    @Column('int')
    rating: number;

    /** Review comment */
    @Column({ type: 'text', nullable: true })
    comment?: string;

    /** Pros (Advantages) - Stored as simple array in DB */
    @Column({ type: 'simple-array', nullable: true })
    pros?: string[];

    /** Cons (Disadvantages) - Stored as simple array in DB */
    @Column({ type: 'simple-array', nullable: true })
    cons?: string[];

    /** Review reply */
    @Column({ type: 'text', nullable: true })
    reply?: string;

    /** Moderation flag */
    @Column({ default: false })
    isApproved: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Tenant, (tenant) => tenant.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ManyToOne(() => User, (user) => user.shopeReviews)
    @JoinColumn({ name: 'userId' })
    user: User;

}
