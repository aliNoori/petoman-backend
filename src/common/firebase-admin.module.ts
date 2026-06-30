import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '../config/firebase.config';

@Global()
@Module({
    providers: [
        {
            provide: 'FIREBASE_ADMIN',
            useFactory: () => {
                if (!admin.apps.length) {
                    admin.initializeApp({
                        // تبدیل نوع به any و سپس به ServiceAccount برای دور زدن چک‌های تایپ
                        credential: admin.credential.cert(firebaseConfig as any),
                    });
                }
                return admin;
            },
        },
    ],
    exports: ['FIREBASE_ADMIN'],
})
export class FirebaseAdminModule {}