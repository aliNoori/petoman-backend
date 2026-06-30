import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import {Tenant} from "../../core/entities/tenant.entity";
import {User} from "../user/entities/user.entity";
import {Appointment} from "../../modules/vet&clinic/entities/appointment.entity";
import {Order} from "../order/order.entity";


@Entity('tenant_reviews')
export class TenantReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Tenant scope */
    @Column('uuid')
    tenantId: string;

    /** Appointment scope */
    @Column('uuid', {nullable: true})
    appointmentId: string;

    /** Order scope */
    @Column('uuid', {nullable: true})
    orderId: string;

    /** Reviewer */
    @Column('uuid')
    userId: string;

    /** Rating 1 to 5 */
    @Column('int')
    rating: number;

    /** Review comment */
    @Column({type: 'text', nullable: true})
    comment?: string;

    /** Pros (Advantages) - Stored as simple array in DB */
    @Column({type: 'simple-array', nullable: true})
    pros?: string[];

    /** Cons (Disadvantages) - Stored as simple array in DB */
    @Column({type: 'simple-array', nullable: true})
    cons?: string[];

    /** Review reply */
    @Column({type: 'text', nullable: true})
    reply?: string;

    /** Moderation flag */
    @Column({default: false})
    isApproved: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Tenant, (tenant) => tenant.tenantReviews, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'tenantId'})
    tenant: Tenant;

    @ManyToOne(() => Appointment, (appointment) => appointment.review,
        {
            onDelete: 'CASCADE',
            nullable: true
        })
    @JoinColumn({name: 'appointmentId'})
    visit: Appointment;

    @ManyToOne(() => User, (user) => user.tenantReviews)
    @JoinColumn({name: 'userId'})
    user: User;

    @ManyToOne(() => Order, (order) => order.review, {
        onDelete: 'CASCADE',
        nullable: true
    })
    @JoinColumn({ name: 'orderId' })
    order: Order;

}
