import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import {Server, Socket} from 'socket.io';
import {MessageService} from "./message/message.service";
import {JwtService} from "@nestjs/jwt";
import {UserService} from "../shared/user/user.service";
import {ConsultationsService} from "./consultation/consultations.service";
import {ClinicCapacityService} from "../modules/vet&clinic/clinic-capacity.service";
import {OnEvent} from "@nestjs/event-emitter";
import {QueueStatus} from "../modules/vet&clinic/appointment/entities/appointment-queue.entity";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {NotificationType} from "../shared/notification/notification.entity";

@WebSocketGateway()
export class ChatGateway {
    @WebSocketServer()
    server: Server;
    // Map to track connected users: userId → socketId
    private connectedUsers = new Map<string, string>(); // userId → socketId
    // اضافه کردن یک پراپرتی منحصر به فرد برای هر نمونه از کلاس
    private readonly instanceId = Math.random().toString(36).substring(7);
    constructor(private readonly messageService: MessageService,
                private readonly consultationService:ConsultationsService,
                private readonly jwtService: JwtService,
                private readonly userService: UserService,
                private readonly clinicCapacityService: ClinicCapacityService) {
    }
    private async isUserBlocked(userId: string): Promise<boolean|null> {
        try {
            const user = await this.userService.findById(userId);
            // فرض بر این است که در مدل User فیلدی به نام isBlocked وجود دارد
            return user && user.isBlocked;
        } catch (error) {
            console.error('Error checking user block status:', error);
            return false;
        }
    }

    async handleConnection(client: Socket) {
        const token = client.handshake.query?.token as string;

        try {
            const payload = this.jwtService.verify(token);
            console.log('✅ اتصال کاربر با شناسه:', payload.userId);

            // Store userId in client data for later reference
            client.data.userId = payload.userId;
            const userId = payload.userId;

            // --- بررسی مسدود بودن کاربر ---
            const blocked = await this.isUserBlocked(userId);
            if (blocked) {
                console.log(`🚫 کاربر مسدود شده تلاش برای اتصال داشت: ${userId}`);
                client.emit('error', { message: 'حساب کاربری شما مسدود شده است.' });
                client.disconnect();
                return;
            }

            // Register user as connected
            this.connectedUsers.set(userId, client.id);

            // Update user online status in DB
            await this.userService.setOnlineStatus(userId, true);
            console.log(`🟢 کاربر ${userId} آنلاین شد`);
            await this.userService.setTenantOnlineStatus(userId, true);
            // --- ارسال لیست کامل آنلاین‌ها به کاربر تازه وارد ---
            const onlineUsersList = Array.from(this.connectedUsers.keys()).map(uid => ({
                userId: uid,
                isOnline: true
            }));
            client.emit('online-users-list', onlineUsersList);

            // Deliver any pending messages to the newly connected user
            const undeliveredMessages = await this.messageService.getPendingMessages(userId);

            for (const msg of undeliveredMessages) {
                this.server.to(client.id).emit('private-message', {
                    senderId: msg.senderId,
                    text: msg.text,
                });

                await this.messageService.markAsDelivered(msg.id);
            }

            // Notify all clients that this user is online
            this.server.emit('user-online', {userId} as any);

        } catch (err) {
            console.log('❌ توکن نامعتبر:', err.message);
            client.disconnect();
        }
    }
    @SubscribeMessage('private-message')
    async handlePrivateMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { receiverId: string; text: string }
    ) {

        const receiverSocketId = this.connectedUsers.get(payload.receiverId);
        const userId = client.data.userId;
        // Send message directly to receiver if online
        if (receiverSocketId) {

            this.server.to(receiverSocketId).emit('private-message', {
                receiverId: payload.receiverId,//payload.senderId,
                text: payload.text,
            });
            // Save message as delivered
            await this.messageService.save({...payload, senderId: userId, isDelivered: !!receiverSocketId,});

        } else {
            // Inform sender that receiver is offline
            client.emit('error', `کاربر ${payload.receiverId} آنلاین نیست`);

            // Save message as undelivered
            await this.messageService.save({...payload, senderId: userId, isDelivered: !!receiverSocketId,});

        }
    }

    @SubscribeMessage('message-seen')
    async handleSeen(
        @MessageBody() data: { messageId: string },
        @ConnectedSocket() client: Socket
    ) {
        // Mark message as seen in DB
        await this.messageService.markAsSeen(data.messageId);
        console.log(`👁 پیام ${data.messageId} توسط ${client.data.userId} دیده شد`);

        // Fetch original message to notify sender
        const message = await this.messageService.findById(data.messageId);
        if (!message) return; // هندل خطا یا پیام پیدا نشد

        const senderId = message.senderId;
        const senderSocketId = this.connectedUsers.get(senderId);

        if (senderSocketId) {
            // Notify sender that message was seen
            this.server.to(senderSocketId).emit('message-status', {
                messageId: data.messageId,
                status: 'seen',
                seenAt: new Date(),
                seenBy: client.data.userId,
            });
        }
    }

    @SubscribeMessage('check-seen-status')
    async handleCheckSeenStatus(
        @MessageBody() data: { messageIds: string[] },
        @ConnectedSocket() client: Socket
    ) {
        // Retrieve seen statuses for multiple messages
        const statuses = await this.messageService.getSeenStatuses(data.messageIds);

        // Send batch status update to client
        this.server.to(client.id).emit('message-status-batch', statuses);
    }


    sendNotification(userId: string, payload: any) {

        const socketId = this.connectedUsers.get(String(userId));

        if (!socketId) {
            // User is offline → store notification for later
            console.log(`⚠ کاربر ${userId} آنلاین نیست، نوتیف ذخیره شد.`);
            return false;
        }
        // Send notification to online user
        this.server.to(socketId).emit('notification', payload);
        return true;
    }

    // --- اضافات جدید ---
    // --- متد جدید: تایید مشاوره توسط دکتر ---
    @SubscribeMessage('approve-consultation')
    async handleApproveConsultation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string, doctorName: string }
    ) {
        const doctorId = client.data.userId;
        const roomName = `consultation-${data.consultationId}`;

        try {
            // ۱. اتصال به اتاق
            client.join(roomName);
            client.data.currentConsultationId = data.consultationId;

            await this.consultationService.approve(data.consultationId,doctorId)

            // ۲. ارسال رویداد وضعیت (برای تغییر UI از pending به active)
            this.server.to(roomName).emit('approve-consultation', {
                consultationId: data.consultationId,
                status: 'active',
            });

            // ۳. ذخیره پیام سیستمی در دیتابیس (تا در رفرش صفحه باقی بماند)
            const savedMessage = await this.messageService.saveGroupMessage({
                text: 'گفتگو تایید شد. می‌توانید پیام دهید.',
                senderId: 'SYSTEM', // یا یک ID ثابت برای سیستم
                senderName: 'سیستم',
                consultationId: data.consultationId,
                type: 'system', // مطمئن شوید دیتابیس شما این فیلد را دارد
                file: null
            });

            // ۴. ارسال پیام به کلاینت با ID واقعی دیتابیس
            const systemMessage = {
                id: savedMessage.id,
                text: savedMessage.text,
                type: 'system', // یا savedMessage.type
                consultationId: data.consultationId,
                time: new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'})
            };

            this.server.to(roomName).emit('new-message', systemMessage);

        } catch (error) {
            console.error('Error approving consultation:', error);
            client.emit('error', {message: 'خطا در تایید مشاوره'});
        }
    }


    // پیوستن به اتاق مشاوره (Join Room)
    @SubscribeMessage('join-chat')
    async handleJoinChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string; userName: string }
    ) {
        const userId = client.data.userId;
        const roomName = `consultation-${data.consultationId}`;

        // عضویت در اتاق
        client.join(roomName);
        // ذخیره اطلاعات اتاق در دیتای کلاینت برای استفاده در قطع ارتباط
        client.data.currentConsultationId = data.consultationId;

        console.log(`User ${userId} (${data.userName}) joined room ${roomName}`);

        // ۱. دریافت لیست تمام سوکت‌های متصل به این اتاق
        const roomSockets = await this.server.in(roomName).fetchSockets();

        // ۲. استخراج اطلاعات کاربران آنلاین در این اتاق
        const onlineUsersInRoom = roomSockets
            .map(socket => ({
                userId: socket.data.userId,
                userName: socket.data.userName || socket.data.firstName, // مطمئن شوید دیتا پر شده
                consultationId: data.consultationId // اضافه کردن شناسه اتاق برای فیلتر کردن در کلاینت
            }))
        //.filter(user => user.userId !== userId); // خود کاربر را از لیست حذف نکنید اگر لازم دارید، یا بگذارید بماند

        // ۳. ارسال لیست کاربران آنلاین به کاربر تازه وارد
        client.emit('online-users-list', onlineUsersInRoom);

        // ۴. اطلاع دادن به سایرین که کاربر جدید آنلاین شد
        client.to(roomName).emit('user-online', {
            userId,
            userName: data.userName,
            consultationId: data.consultationId, // مهم: ارسال consultationId
            isOnline: true
        });

        client.emit('joined-room-success', {
            consultationId: data.consultationId,
            joinedAt: new Date()
        });

        // --- اضافه جدید: ارسال نوتیفیکیشن به دکتر ---
        // شما باید ID دکتر مربوط به این consultationId را از دیتابیس پیدا کنید
        // فرض می‌کنیم متدی دارید که دکتر را پیدا می‌کند
        // const consultation = await this.consultationService.findById(data.consultationId);
        // const doctorId = consultation.doctorId;

        // ارسال نوتیفیکیشن به دکتر (حتی اگر آفلاین باشد، در دیتابیس ذخیره می‌شود)
        // this.sendNotification(doctorId, {
        //   type: 'NEW_CONSULTATION_REQUEST',
        //   message: `درخواست مشاوره جدید از ${data.userName}`,
        //   consultationId: data.consultationId
        // });
    }

    @SubscribeMessage('send-message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
            consultationId: string;
            text: string;
            senderId: string;
            senderName: string;
            type: string;       // 'text' | 'image' | 'file' | 'prescription'
            file: any;          // null یا آبجکت فایل
            prescription: any;  // undefined یا آبجکت نسخه
        }
    ) {
        const userId = client.data.userId;
        const roomName = `consultation-${data.consultationId}`;
        // ۱. ذخیره در دیتابیس (تمام فیلدها را ذخیره کنید)
        const savedMessage = await this.messageService.saveGroupMessage({
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            consultationId: data.consultationId,
            type: data.type,
            file: data.file,
            // اگر دیتابیس شما فیلد prescription جدا دارد، اینجا ذخیره کنید
            // prescriptionData: data.prescription
        });
        // ۲. ساخت پاسخ طبق استاندارد messageObject
        const messageData = {
            id: savedMessage.id, // ۱. سرور تولید می‌کند

            // ۲. فرستنده: کلاینت با senderId تشخیص می‌دهد، پس فقط senderId کافیست
            // اما طبق استاندارد شما می‌توانیم senderId را بفرستیم
            senderId: savedMessage.senderId,

            // ۳. نوع محتوا
            type: savedMessage.type,

            // ۴. متن
            text: savedMessage.text,

            // ۵. زمان
            time: new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'}),

            // ۶. وضعیت
            status: 'sent',

            // ۷. فایل
            file: savedMessage.file,

            // ۸. نسخه (اگر در دیتابیس ذخیره کرده‌اید اینجا برگردانید)
            prescription: data.prescription
        };
        // ۳. ارسال به اتاق
        this.server.to(roomName).emit('new-message', messageData);
    }

    // --- تغییر یافته: ارسال فایل در اتاق (با ذخیره در دیتابیس) ---
    @SubscribeMessage('send-file')
    async handleSendFile(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string; file: any;senderId:string; senderName: string;type:string }
    ) {
        const userId = client.data.userId;
        const roomName = `consultation-${data.consultationId}`;

        // ۱. ذخیره در دیتابیس
        const savedMessage = await this.messageService.saveGroupMessage({
            text: data.file.type.startsWith('image/') ? '' : `فایل ارسال شد: ${data.file.name}`,
            senderId: data.senderId,
            senderName: data.senderName,
            consultationId: data.consultationId,
            type:data.type,
            file: {
                name: data.file.name,
                size: data.file.size,
                type: data.file.type,
                url: data.file.url
            }
        });

        // ۲. آماده‌سازی و ارسال به کلاینت
        const messageData = {
            id: savedMessage.id,
            text: savedMessage.text,
            senderId: savedMessage.senderId,
            senderName: data.senderName,
            time: new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'}),
            status: 'sent',
            type:savedMessage.type,
            consultationId: data.consultationId,
            file: savedMessage.file
        };

        this.server.to(roomName).emit('new-message', messageData);
    }

    // مدیریت نشانگر تایپ کردن
    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string; userName: string; isTyping: boolean }
    ) {
        const userId = client.data.userId;
        const roomName = `consultation-${data.consultationId}`;
        client.to(roomName).emit('user-typing', {
            userId,
            userName: data.userName,
            isTyping: data.isTyping
        });
    }

    // مدیریت وضعیت خوانده شدن پیام در اتاق
    @SubscribeMessage('mark-as-read')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { messageId: string; consultationId: string; readBy: string }
    ) {
        const roomName = `consultation-${data.consultationId}`;

        await this.messageService.markAsSeen(data.messageId)

        // ارسال رویداد به سایر اعضای اتاق (به جز فرستنده رویداد)
        client.to(roomName).emit('message-read', {
            messageId: data.messageId,
            readBy: data.readBy,
            readTime: new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'})
        });
    }

    // بازنویسی متد قطع ارتباط برای پشتیبانی از خروج از اتاق
    async handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        const consultationId = client.data.currentConsultationId;

        // حذف کاربر از لیست متصلین
        this.connectedUsers.delete(userId);

        // آپدیت وضعیت در دیتابیس
        await this.userService.setOnlineStatus(userId, false);
        console.log(`🔴 کاربر ${userId} آفلاین شد`);
        await this.userService.setTenantOnlineStatus(userId, false);

        // اگر کاربر در اتاقی بود، به بقیه اطلاع دهد
        if (consultationId) {
            const roomName = `consultation-${consultationId}`;
            client.to(roomName).emit('user-online', {
                userId,
                userName: client.data.userName || 'کاربر', // اگر نام را ذخیره کرده باشید
                isOnline: false
            });
        }

        // اطلاع به کل سرور (برای آپدیت لیست در داشبورد و لیست چت‌ها)
        this.server.emit('user-online', {userId, isOnline: false} as any);

        // اطلاع عمومی آفلاین بودن (برای چت خصوصی)
        this.server.emit('user-offline', {userId} as any);
    }

    // در ChatGateway
    @SubscribeMessage('chat_accepted')
    async handleChatAccepted(@ConnectedSocket() client: Socket, @MessageBody() data: { consultationId: string }) {
        const roomName = `consultation-${data.consultationId}`;
        // ارسال پیام به همه در اتاق که چت فعال شد
        this.server.to(roomName).emit('chat-status-changed', {
            status: 'active',
            consultationId: data.consultationId
        });
    }

    // در ChatGateway
    @SubscribeMessage('close-chat')
    async handleChatClosed(@ConnectedSocket() client: Socket, @MessageBody() data: { consultationId: string }) {
        const roomName = `consultation-${data.consultationId}`;

        await this.consultationService.close(data)

        // ارسال پیام به همه در اتاق که چت فعال شد
        this.server.to(roomName).emit('chat-status-changed', {
            status: 'closed',
            consultationId: data.consultationId
        });
    }

    // در ChatGateway
    @SubscribeMessage('send-prescription')
    async handleSendPrescription(@ConnectedSocket() client: Socket, @MessageBody() data: {
        consultationId: string ,prescription:any,senderId:string,senderName:string,type:string,text:string}) {

        const roomName = `consultation-${data.consultationId}`;

        // ۱. ذخیره در دیتابیس
        const savedMessage = await this.messageService.saveGroupMessage({
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            consultationId: data.consultationId,
            type:data.type,
            prescription: {
                medications: data.prescription.medications,
                notes: data.prescription.notes,
            }
        });

        // ۲. آماده‌سازی و ارسال به کلاینت
        const messageData = {
            id: savedMessage.id,
            text: savedMessage.text,
            senderId: savedMessage.senderId,
            senderName: data.senderName,
            time: new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'}),
            status: 'sent',
            type:savedMessage.type,
            consultationId: data.consultationId,
            prescription: savedMessage.prescription
        };

        this.server.to(roomName).emit('new-message', messageData);
    }

    // --- قابلیت جدید: مسدود کردن کاربر ---
    @SubscribeMessage('block-user')
    async handleBlockUser(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userIdToBlocked: string; consultationId: string ,blockReason:string}
    ) {
        const blockerId = client.data.userId; // کسی که درخواست مسدود کردن را داده (معمولا دکتر)

        try {
            // ۱. آپدیت وضعیت کاربر در دیتابیس
            await this.userService.blockUser(data.userIdToBlocked,data.blockReason);

            // ۲. پیدا کردن و قطع ارتباط کاربر مسدود شده
            // استفاده از fetchSockets برای یافتن سوکت در سرور اصلی
            const sockets = await this.server.fetchSockets();

            // جستجو در لیست سوکت‌ها برای پیدا کردن کاربر مورد نظر
            const blockedSocket = sockets.find(s => s.data.userId === data.userIdToBlocked);

            if (blockedSocket) {
                // ارسال پیام خطا به کاربر قبل از قطع شدن
                blockedSocket.emit('error', { message: 'شما توسط ادمین مسدود شدید.' });
                // قطع ارتباط
                blockedSocket.disconnect();
            }

            // ۳. ارسال نوتیفیکیشن به اتاق مشاوره که کاربر مسدود شد
            const roomName = `consultation-${data.consultationId}`;
            this.server.to(roomName).emit('user-blocked', {
                blockedUserId: data.userIdToBlocked,
                blockedBy: blockerId,
                timestamp: new Date()
            });

            console.log(`🚫 کاربر ${data.userIdToBlocked} توسط ${blockerId} مسدود شد.`);
        } catch (error) {
            console.error('Error blocking user:', error);
            client.emit('error', { message: 'خطا در مسدود کردن کاربر' });
        }
    }
    ////////change user status
    // events.gateway.ts
    @SubscribeMessage('change_user_status')
    async handleChangeUserStatus(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { status: 'online' | 'offline', userId?: string }
    ) {
        // ۱. دریافت اطلاعات کاربر از سوکت (معمولاً هنگام connect در data ذخیره کرده‌اید)
        // نکته: در کد قبلی client.data.user پر نمی‌شد، اما client.data.userId پر می‌شد.
        // ما از userId استفاده می‌کنیم و آبجکت کاربر را شبیه‌سازی می‌کنیم یا سرویس را صدا می‌زنیم.
        const userId = client.data.userId;

        if (!userId) return;
        console.log('data.status',data.status)
        // ۲. اگر وضعیت آفلاین شد، کاربر را از لیست آنلاین‌ها حذف کن
        if (data.status === 'offline') {
            console.log('data.status',data.status)
            this.removeUserFromOnlineList(userId);
            // اختیاری: قطع اتصال سوکت (اگر می‌خواهید کاملاً قطع شود)
            // client.disconnect();
        }
        // ۳. اگر وضعیت آنلاین شد (یا تغییر کرد)
        else if (data.status === 'online') {
            // اضافه کردن به لیست یا آپدیت کردن
            // ما یک آبجکت ساده برای کاربر می‌سازیم چون در متد addUserToOnlineList انتظار یک آبجکت داریم
            const user = { id: userId };
            this.addUserToOnlineList(user,client);
        }

        // ۴. پخش کردن تغییر وضعیت به همه کلاینت‌ها تا UI آنها آپدیت شود
        // این باعث می‌شود `socketStore.onlineUsers` در بقیه کاربران آپدیت شود
        this.server.emit('user_status_changed', {
            userId: userId,
            status: data.status
        } as any);
    }

    // --- متدهای کمکی مورد نیاز برای مدیریت وضعیت کاربران ---

    /**
     * حذف کاربر از لیست آنلاین‌ها
     */
    private removeUserFromOnlineList(userId: string) {
        // اگر از Map استفاده می‌کنید (connectedUsers)
        this.connectedUsers.delete(userId);

        // اگر از لیست دیگری استفاده می‌کنید می‌توانید اینجا اضافه کنید
        // مثلا: this.onlineUsers.delete(userId);

        console.log(`User ${userId} removed from online list.`);
    }

    /**
     * اضافه کردن کاربر به لیست آنلاین‌ها
     */
    private addUserToOnlineList(user: any,client) {

        this.connectedUsers.set(user.id, client.id); // یا منطق مربوط به ساختار داده شما

        console.log(`User ${user.id} added to online list.`);
    }

    // --- متد جدید: خروج از اتاق مشاوره ---
    @SubscribeMessage('leave-chat')
    async handleLeaveChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string }
    ) {
        const userId = client.data.userId;
        const roomName = `consultation-${data.consultationId}`;

        // ۱. خروج کاربر از اتاق در Socket.IO
        client.leave(roomName);

        // ۲. پاک کردن اطلاعات اتاق از دیتای کلاینت
        client.data.currentConsultationId = null;

        console.log(`🚪 کاربر ${userId} از اتاق ${roomName} خارج شد.`);

        // ۳. (اختیاری) اطلاع دادن به سایر اعضای اتاق که کاربر رفت
        // اگر می‌خواهید بقیه متوجه شوند کاربر دیگر در اتاق نیست (مثلاً برای تایپ کردن)
        client.to(roomName).emit('user-left-room', {
            userId,
            consultationId: data.consultationId
        });

        client.emit('left-room-success', {
            consultationId: data.consultationId
        });
    }

    // ═══════════════════════════════════════════════════════
    // 🔷 رویدادهای مربوط به سرویس‌های آنی (ظرفیت)
    // ═══════════════════════════════════════════════════════

    setupCapacityEvents() {
        // این متد برای شنود رویدادهای داخلی سرور استفاده می‌شود
        // در صورت نیاز می‌توانید یک EventEmitter داخلی تعریف کنید
    }

    /**
     * متد کمکی: ارسال رویداد به همه کاربران یک دکتر خاص
     */
    private emitToVetClients(vetId: string, eventName: string, data: any) {
        // پیدا کردن تمام سوکت‌های متعلق به این دکتر
        // این متد نیاز به Map دوم برای نگهداری vetId → socketIds دارد
    }

    /**
     * متد کمکی: ارسال رویداد به یک کاربر خاص
     */
    private emitToUser(userId: string, eventName: string, data: any) {
        const socketId = this.connectedUsers.get(String(userId));
        if (socketId) {
            this.server.to(socketId).emit(eventName, data);
        }
    }

     // ══ رویدادهای ارسالی (Emit) به کلاینت ══

    /**
     * اطلاع‌رسانی درخواست فوری جدید به دکتر
     * این متد باید از ClinicCapacityService یا Controller صدا زده شود
     */
    emitNewInstantRequest(vetId: string, appointmentData: any) {
        this.emitToUser(vetId, 'new-instant-request', {
            requestId: appointmentData.id,
            appointment: appointmentData,
            ownerName: appointmentData.ownerName,
            petName: appointmentData.petName,
            serviceType: appointmentData.type,
            timestamp: new Date(),
        });
    }

    /**
     * اطلاع‌رسانی تمدید زمان به کاربر
     */
    emitRequestExtended(userId: string, requestId: string, newMinutes: number) {
        this.emitToUser(userId, 'request-extended', {
            requestId,
            newMinutes,
        });
    }

    /**
     * اطلاع‌رسانی لغو درخواست به دکتر
     */
    emitRequestCancelled(vetId: string, requestId: string) {
        this.emitToUser(vetId, 'request-cancelled', {
            requestId,
        });
    }

    /**
     * اطلاع‌رسانی رسیدن نوبت به کاربر
     */
    emitQueueYourTurn(userId: string, requestId: string, position: number) {
        this.emitToUser(userId, 'queue-your-turn', {
            requestId,
            position,
        });
    }

    /**
     * اطلاع‌رسانی تغییر موقعیت صف به کاربر
     */
    emitQueuePositionChanged(userId: string, requestId: string, position: number, estimatedWait: number) {
        this.emitToUser(userId, 'queue-position-changed', {
            requestId,
            position,
            estimatedWait,
        });
    }

    /**
     * اطلاع‌رسانی منقضی شدن درخواست
     */
    emitRequestTimeout(userId: string, requestId: string) {
        this.emitToUser(userId, 'request-timeout', {
            requestId,
        });
    }

    /**
     * اطلاع‌رسانی تکمیل پرداخت
     */
    emitPaymentCompleted(userId: string, requestId: string, paymentId: string) {
        this.emitToUser(userId, 'payment-completed', {
            requestId,
            paymentId,
        });
    }

    /**
     * اطلاع‌رسانی تغییر وضعیت آنلاین دکتر به همه کاربران
     */
    emitVetStatusChanged(vetId: string, isOnline: boolean) {
        // ارسال به همه کاربرانی که منتظر این دکتر هستند
        // یا می‌تواند در لیست صف‌ها جستجو شود
        this.server.emit('vet-status-changed', {
            vetId,
            isOnline,
        } as any);
    }
    // --- پذیرش درخواست فوری ---
    @SubscribeMessage('accept-instant-request')
    async handleAcceptInstantRequest(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { requestId: string }
    ) {
        const doctorId = client.data.userId;
        try {
            const result = await this.clinicCapacityService.acceptInstantRequest(
                data.requestId,
                doctorId
            );

            // اطلاع به کاربر که درخواستش پذیرفته شد
            this.emitToUser(result.userId, 'instant-request-accepted', {
                requestId: data.requestId,
                consultationId: result.consultationId,
            });

            // اطلاع به بقیه در صف
            if (result.nextInQueue) {
                this.emitQueueYourTurn(
                    result.nextInQueue.userId,
                    result.nextInQueue.orderId,
                    1
                );
            }

            console.log(`✅ درخواست ${data.requestId} توسط دکتر ${doctorId} پذیرفته شد`);
        } catch (error) {
            console.error('خطا در پذیرش درخواست:', error);
            client.emit('error', { message: 'خطا در پذیرش درخواست' });
        }
    }

    // --- رد درخواست فوری ---
    @SubscribeMessage('reject-instant-request')
    async handleRejectInstantRequest(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { requestId: string; reason?: string }
    ) {
        const doctorId = client.data.userId;
        try {
            const result = await this.clinicCapacityService.rejectInstantRequest(
                data.requestId,
                doctorId,
                data.reason
            );

            // اطلاع به کاربر
            this.emitToUser(result.userId, 'instant-request-rejected', {
                requestId: data.requestId,
                reason: data.reason,
            });

            // به‌روزرسانی صف برای بقیه
            if (result.nextInQueue) {
                this.emitQueueYourTurn(
                    result.nextInQueue.userId,
                    result.nextInQueue.orderId,
                    1
                );
            }

            console.log(`❌ درخواست ${data.requestId} توسط دکتر ${doctorId} رد شد`);
        } catch (error) {
            console.error('خطا در رد درخواست:', error);
            client.emit('error', { message: 'خطا در رد درخواست' });
        }
    }

    // --- شنود ایونت داخلی سیستم ---
    @OnEvent('vet.clinic.queue.started')
    async handleQueueStarted(payload: any) {
        const {queueEntry, appointmentId, consultationId, doctorId} = payload;

        console.log(`Queue started event received for appointment ${appointmentId}`);

        await this.clinicCapacityService.sendPushNotificationForConsultationStart(
            queueEntry.userId,
            consultationId,
            appointmentId
        );

        // ۲. ارسال پیام Real-time به کاربر آنلاین (اگر آنلاین باشد)
        const userSocketId = this.connectedUsers.get(queueEntry.userId);
        if (userSocketId) {
            this.server.to(userSocketId).emit('consultation_started', {
                appointmentId,
                consultationId,
                message: 'مشاوره شما شروع شد. لطفاً وارد اتاق شوید.'
            });
        }

        // ۳. اطلاع‌رسانی به سایرین در صف (آپدیت پوزیشن)
        try {
            const remainingQueue = await this.clinicCapacityService.getQueueList(doctorId, {
                appointmentType: queueEntry.appointmentType,
                status: QueueStatus.WAITING
            });

            for (const item of remainingQueue.items) {
                const socketId = this.connectedUsers.get(item.userId);

                if (socketId) {
                    // اگر آنلاین بود: پیام آنی بفرست
                    this.server.to(socketId).emit('queue-position-changed', {
                        position: item.position,
                        estimatedWait: item.estimatedWaitMinutes,
                        message: `موقعیت شما در صف به ${item.position} تغییر کرد.`
                    });
                } else {
                    // اگر آفلاین بود: نوتیفیکیشن Push بفرست (با استفاده از متد کمکی جدید)
                    await this.clinicCapacityService.sendPushNotificationForQueueUpdate(
                        item.userId,
                        item.position,
                        item.orderId
                    );
                }
            }
        } catch (error) {
            console.error('Error updating queue positions for others:', error);
        }

    }

    // --- متد جدید: علامت‌گذاری کل مشاوره به عنوان خوانده شده ---
    @SubscribeMessage('mark-consultation-read')
    async handleMarkConsultationRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string } // userId دیگر نیاز نیست، از client.data می‌گیریم
    ) {
        const userId = client.data.userId; // هویت تأیید شده
        const roomName = `consultation-${data.consultationId}`;

        console.log('🔵 درخواست mark-consultation-read:', { consultationId: data.consultationId, userId });

        try {
            // ۱. آپدیت دیتابیس
            await this.messageService.markConsultationAsRead(userId, data.consultationId);

            // ۲. ارسال رویداد به سایرین در اتاق (به جز فرستنده)
            client.to(roomName).emit('consultation-read', {
                consultationId: data.consultationId,
                readBy: userId,
                timestamp: new Date()
            });

            // ۳. اطلاع به خود کاربر که عملیات موفق بود
            client.emit('consultation-read', {
                consultationId: data.consultationId,
                readBy: userId,
                timestamp: new Date(),
                status: 'success'
            });

            console.log(`✅ مشاوره ${data.consultationId} توسط کاربر ${userId} به عنوان خوانده شده علامت‌گذاری شد.`);

        } catch (error) {
            console.error('❌ Error marking consultation as read:', error);
            client.emit('error', { message: 'خطا در به‌روزرسانی وضعیت خوانده شدن' });
        }
    }

    // --- ایونت جدید: consultation_read ---
    @SubscribeMessage('consultation_read')
    async handleConsultationRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { consultationId: string } // userId دیگر نیاز نیست
    ) {
        const userId = client.data.userId; // هویت تأیید شده
        const roomName = `consultation-${data.consultationId}`;

        console.log('🟢 دریافت ایونت consultation_read:', { consultationId: data.consultationId, userId });

        try {
            // ۱. آپدیت دیتابیس: پیام‌های خوانده نشده را به‌روز کن
            await this.messageService.markConsultationAsRead(userId, data.consultationId);

            // ۲. ارسال رویداد به سایرین در اتاق
            client.to(roomName).emit('consultation_read', {
                consultationId: data.consultationId,
                readBy: userId,
                timestamp: new Date()
            });

            // ۳. (اختیاری) اگر می‌خواهید به خود کاربر هم اعلام کنید که "همه خوانده شد"
            client.emit('consultation_read', {
                consultationId: data.consultationId,
                readBy: userId,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Error handling consultation_read:', error);
            client.emit('error', {message: 'خطا در به‌روزرسانی وضعیت خوانده شدن'});
        }
    }
}