import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private bucket: Bucket;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.get('FIREBASE_PROJECT_ID'),
          privateKey: this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
          clientEmail: this.config.get('FIREBASE_CLIENT_EMAIL'),
        }),
      });
    }
    this.bucket = admin.storage().bucket(this.config.get('FIREBASE_STORAGE_BUCKET'));
  }

  async upload(file: Express.Multer.File, path: string): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const destination = `${path}.${ext}`;
    const fileRef = this.bucket.file(destination);
    const token = uuidv4();

    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    return `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
  }
}
