import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserAddress } from "./address.entity";
import { CreateAddressDto, UpdateAddressDto } from "./dto/create-address.dto";

@Injectable()
export class UserAddressService {
    private addressRepo: Repository<UserAddress>;

    constructor(@InjectDataSource() private dataSource: DataSource) {
        this.addressRepo = this.dataSource.getRepository(UserAddress);
    }

    /**
     * Get all addresses for a specific user
     */
    async findAll(userId: string) {
        return this.addressRepo.find({
            where: { userId },
            order: { isDefault: 'DESC', createdAt: 'DESC' }
        });
    }

    /**
     * Get a single address by ID (ensuring it belongs to the user)
     */
    async findOne(id: string, userId: string) {
        const address = await this.addressRepo.findOne({
            where: { id, userId }
        });
        if (!address) {
            throw new NotFoundException('Address not found');
        }
        return address;
    }

    /**
     * Create a new address for the user
     */
    async create(userId: string, dto: CreateAddressDto) {
        // If the new address is set as default, remove default status from others
        if (dto.isDefault) {
            await this.addressRepo.update({ userId }, { isDefault: false });
        }

        const newAddress = this.addressRepo.create({
            ...dto,
            userId,
        });

        // --- پردازش داده‌های نقشه و پر کردن فیلدهای Entity ---
        if (dto.fullAddress && typeof dto.fullAddress === 'object') {
            const mapData = dto.fullAddress;

            // 1. پر کردن مختصات (Location)
            if (mapData.lat && mapData.lon) {
                newAddress.location = {
                    lat: parseFloat(mapData.lat),
                    lng: parseFloat(mapData.lon)
                };
            }

            // 2. پر کردن نام نمایشی
            if (mapData.display_name) {
                newAddress.displayName = mapData.display_name;
            }

            if (!dto.province) {
                newAddress.province = this.extractProvince(mapData);
            }
            // اگر هنوز هم province خالی بود، برای جلوگیری از خطای دیتابیس، مقدار پیش‌فرض بگذار
            if (!newAddress.province) {
                newAddress.province = 'ناشناس'; // یا هر مقدار پیش‌فرض دیگری
            }

            if (!dto.city) {
                newAddress.city = this.extractCity(mapData);
            }

            // 3. پر کردن متادیتای OpenStreetMap
            if (mapData.place_id) newAddress.placeId = mapData.place_id;
            if (mapData.osm_type) newAddress.osmType = mapData.osm_type;
            if (mapData.osm_id) newAddress.osmId = mapData.osm_id;
            if (mapData.boundingbox) newAddress.boundingBox = mapData.boundingbox;
            if (mapData.class) newAddress.mapClass = mapData.class;
            if (mapData.type) newAddress.mapType = mapData.type;
            if (mapData.place_rank) newAddress.placeRank = mapData.place_rank;
            if (mapData.importance) newAddress.importance = mapData.importance;

            // 4. استخراج جزئیات آدرس از آبجکت address
            if (mapData.address) {
                const addr = mapData.address;

                // اگر آدرس به صورت آبجکت فرستاده شده، فیلدها را جداگانه پر کن
                if (addr.road) newAddress.street = addr.road;
                if (addr.neighbourhood) newAddress.neighborhood = addr.neighbourhood;
                if (addr.suburb) newAddress.suburb = addr.suburb;
                if (addr.city) newAddress.city = addr.city; // اولویت با فیلد address.city است
                if (addr.district) newAddress.district = addr.district;
                if (addr.county) newAddress.county = addr.county;
                if (addr.house_number) newAddress.buildingNo = addr.house_number;

                // ذخیره کل آبجکت آدرس برای حفظ ساختار کامل
                newAddress.detailedAddress = addr;
            }
        }

        return this.addressRepo.save(newAddress);
    }

    /**
     * Update an existing address
     */
    async update(id: string, userId: string, dto: UpdateAddressDto) {
        const address = await this.findOne(id, userId);

        // Handle default status change
        if (dto.isDefault && !address.isDefault) {
            await this.addressRepo.update({ userId }, { isDefault: false });
        }

        // اگر fullAddress آپدیت شده، پردازش آن را انجام دهیم
        if (dto.fullAddress && typeof dto.fullAddress === 'object') {
            const mapData = dto.fullAddress;

            if (mapData.lat && mapData.lon) {
                address.location = {
                    lat: parseFloat(mapData.lat),
                    lng: parseFloat(mapData.lon)
                };
            }
            if (mapData.display_name) address.displayName = mapData.display_name;
            if (mapData.place_id) address.placeId = mapData.place_id;
            if (mapData.osm_type) address.osmType = mapData.osm_type;
            if (mapData.osm_id) address.osmId = mapData.osm_id;
            if (mapData.boundingbox) address.boundingBox = mapData.boundingbox;

            if (mapData.address) {
                const addr = mapData.address;
                if (addr.road) address.street = addr.road;
                if (addr.neighbourhood) address.neighborhood = addr.neighbourhood;
                if (addr.suburb) address.suburb = addr.suburb;
                if (addr.city) address.city = addr.city;
                if (addr.district) address.district = addr.district;
                if (addr.county) address.county = addr.county;
                if (addr.house_number) address.buildingNo = addr.house_number;
                address.detailedAddress = addr;
            }
        }

        Object.assign(address, dto);
        return this.addressRepo.save(address);
    }

    /**
     * Delete an address
     */
    async remove(id: string, userId: string) {
        const address = await this.findOne(id, userId);
        await this.addressRepo.remove(address);
        return { message: 'Address deleted successfully' };
    }

    /**
     * Set a specific address as the default one
     */
    async setDefault(id: string, userId: string) {
        await this.addressRepo.update({ userId }, { isDefault: false });
        const address = await this.findOne(id, userId);
        address.isDefault = true;
        return this.addressRepo.save(address);
    }

    private extractProvince(mapData: any): string {
        // اولویت با فیلد province در آدرس است
        if (mapData.address?.province) return mapData.address.province;
        // گاهی اوقات state نام دارد
        if (mapData.address?.state) return mapData.address.state;
        // اگر نبود، استان را از display_name یا city استخراج نکنیم، چون ممکن است غلط باشد
        // بهتر است خالی بماند یا مقدار پیش‌فرض
        return '';
    }
    private extractCity(mapData: any): string {
        // اولویت با فیلد province در آدرس است
        if (mapData.address?.city) return mapData.address.city;
        if (mapData.address?.town) return mapData.address.town;
        // بهتر است خالی بماند یا مقدار پیش‌فرض
        return '';
    }
}