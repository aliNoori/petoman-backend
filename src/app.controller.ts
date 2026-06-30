import {Controller, Get, Param, Post, UseGuards} from '@nestjs/common';
import { AppService } from './app.service';
import {MessageService} from "./socket/message/message.service";
import {TenantMembershipGuard} from "./shared/auth/guards/tenant-membership.guard";
import {JwtAuthGuard} from "./shared/auth/guards/jwt-auth.guard";
import {CapabilityGuard} from "./shared/auth/guards/capability.guard";
import {TenantGuard} from "./shared/auth/guards/tenant.guard";
import {Capabilities} from "./shared/auth/decorators/capabilities.decorator";
import {Permissions} from "./shared/auth/decorators/permissions.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
              private readonly messageService:MessageService) {}

  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Get('/me')
  getTenantProfile() {
    return { ok: true };
  }

  @UseGuards(
      JwtAuthGuard,
      TenantMembershipGuard,
      TenantGuard,
      CapabilityGuard,
  )
  @Capabilities('PRODUCT_MANAGEMENT')
  @Permissions('product.create')
  @Post('/products')
  createProduct() {
    return { created: true };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date()
    };
  }
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('/messages/pending/:userId')
  getPendingMessages(@Param('userId') id: string) {
    return this.messageService.getPendingMessages(id);
  }

}
