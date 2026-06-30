import {Injectable} from '@nestjs/common';
import {DataSource, EntityManager} from 'typeorm';
import {Tenant, TenantType} from '../core/entities/tenant.entity';
import {TenantCapability} from '../core/entities/tenant-capability.entity';
import {Capability} from '../core/entities/capability.entity';
import {Role} from '../core/entities/role.entity';
import {TenantUser} from '../core/entities/tenant-user.entity';
import {TenantAccess} from '../core/entities/tenant-access.entity';
import {TENANT_TYPE_CAPABILITIES} from '../core/config/tenant-type-capabilities.config';
import {randomInt} from 'crypto';
import {QueryFailedError} from 'typeorm';
import {ActivitiesLogService} from "../shared/activities/activities-log.service";
import {ActivityAction, ActivityEntityType} from "../shared/activities/activity-log.entity";
import {User} from "../shared/user/entities/user.entity";
import { getTenantTypeLabel} from "../common/helper/helpers";

@Injectable()
export class TenantProvisioningService {
    constructor(
        private dataSource: DataSource,
        private activitiesService:ActivitiesLogService
    ) {}

    async provisionTenant(adminId: string,user:User, ownerUserId: string, name: string, type: TenantType,manager?: EntityManager) {
        const typePrefix = type.charAt(0);
        return this.provisionWithRetry(adminId,user, ownerUserId, name, type, typePrefix,manager);
    }

    private async provisionWithRetry(adminId: string,user:User, ownerUserId: string, name: string, type: TenantType, typePrefix: string,manager?: EntityManager, retries = 3) {
        try {
            // اگر manager پاس داده نشده، یک تراکنش داخلی ایجاد کن
            // در غیر این صورت، در تراکنش فراخواننده عمل می‌کند
            if (manager) {
                return await this.executeProvisioning(adminId, user, ownerUserId, name, type, typePrefix, manager);
            } else {
                return await this.dataSource.transaction(async (txnManager) => {
                    return await this.executeProvisioning(adminId, user, ownerUserId, name, type, typePrefix, txnManager);
                });
            }
        } catch (error) {
            if (retries > 0 && error instanceof QueryFailedError && error.message.includes('duplicate key')) {
                // در صورت تکراری بودن، دوباره تلاش کن
                return this.provisionWithRetry(adminId, user, ownerUserId, name, type, typePrefix, manager, retries - 1);
            }
            throw error;
        }
    }

    // متد کمکی برای انجام عملیات اصلی (با استفاده از manager دریافتی)
    private async executeProvisioning(
        adminId: string,
        user: User,
        ownerUserId: string,
        name: string,
        type: TenantType,
        typePrefix: string,
        manager: EntityManager
    ) {
        // 1️⃣ Create tenant
        const tenant = manager.create(Tenant, {
            name,
            type,
            ownerUserId,
            status: 'active',
        });
        const savedTenant = await manager.save(tenant);

        // 2️⃣ Assign capabilities
        const capabilityNames = TENANT_TYPE_CAPABILITIES[type] || [];
        if (capabilityNames.length > 0) {
            const capabilities = await manager.find(Capability, {
                where: capabilityNames.map((name) => ({ name })),
                select: ['id']
            } as any);
            const tenantCapabilities = capabilities.map((capability) =>
                manager.create(TenantCapability, {
                    tenantId: savedTenant.id,
                    capabilityId: capability.id,
                })
            );
            await manager.insert(TenantCapability, tenantCapabilities);
        }

        // 3️⃣ Load OWNER role
        const ownerRole = await manager.findOne(Role, {
            where: { name: 'OWNER' },
            select: ['id']
        } as any);

        if (!ownerRole) {
            throw new Error('OWNER role not found. Did you seed roles?');
        }

        // 4️⃣ Attach creator as OWNER
        let shopId = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            const randomPart = generateRandomCode();
            shopId = `${typePrefix}-${randomPart}`;
            try {
                const tenantUser = manager.create(TenantUser, {
                    tenantId: savedTenant.id,
                    userId: ownerUserId,
                    roleId: ownerRole.id,
                    shopId: shopId,
                    status: 'active',
                });
                await manager.save(tenantUser);
                isUnique = true;
            } catch (error) {
                if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
                    attempts++;
                    continue;
                }
                throw error;
            }
        }

        if (!isUnique) {
            throw new Error('Failed to generate a unique Shop ID after multiple attempts.');
        }

        // فرض کنید این شناسه مدیر کل سیستم است
        const SUPER_ADMIN_ID = adminId;

        // 5️⃣ Grant Access to Super Admin
        if (ownerUserId !== SUPER_ADMIN_ID) {
            const tenantAccess = manager.create(TenantAccess, {
                managerId: SUPER_ADMIN_ID,
                tenantId: savedTenant.id,
                accessLevel: 'FULL_ACCESS',
                isActive: true,
            });
            await manager.save(tenantAccess);
        }

        const typeLabel = getTenantTypeLabel(savedTenant.type);

        // ثبت لاگ فعالیت (این بخش معمولاً خارج از تراکنش دیتابیس اصلی است یا نیاز به سرویس جدا دارد)
        // اگر activitiesService از همان دیتابیس استفاده می‌کند، بهتر است آن هم با manager کار کند.
        // اما برای سادگی فعلا همان سرویس را صدا می‌زنیم.
        await this.activitiesService.createLog({
            userId: user.id,
            actorName: savedTenant.ownerName,
            entityType: ActivityEntityType.TENANT,
            entityId: savedTenant.id,
            action: ActivityAction.CREATE,
            title: `${typeLabel} جدید ثبت شد`,
            description: `فروشگاه ${savedTenant.ownerName} توسط ${user.fullName} ایجاد شد.`,
            metadata: { city: savedTenant.city, type: savedTenant.type },
            ipAddress: 'user.ip'
        });

        return savedTenant;
    }

}

function generateRandomCode(): string {
    return randomInt(10000000, 99999999).toString();
}