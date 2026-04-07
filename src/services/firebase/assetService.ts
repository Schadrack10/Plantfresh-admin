import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Asset } from '../../types';

export class AssetService {
  private assetsRef = collection(db, 'Assets');

  async uploadAsset(tenantId: string, file: File, uploadedBy: string): Promise<Asset> {
    const assetRef = doc(this.assetsRef);
    const assetId = assetRef.id;
    const extension = file.name.split('.').pop() || 'bin';
    const fileName = `${assetId}.${extension}`;
    const storagePath = `Assets/${tenantId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);

    const assetData: Asset = {
      TenantId: tenantId,
      FileUrl: fileUrl,
      Type: this.getAssetType(file.type),
      CreatedAt: new Date(),
      UploadedBy: uploadedBy
    };

    await setDoc(assetRef, assetData);
    return { ...assetData, Id: assetId };
  }

  async listAssets(tenantId: string): Promise<Asset[]> {
    const q = query(this.assetsRef, where('TenantId', '==', tenantId), orderBy('CreatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => ({ ...docItem.data(), Id: docItem.id } as Asset));
  }

  async getAsset(assetId: string): Promise<Asset | null> {
    const docSnap = await getDoc(doc(this.assetsRef, assetId));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), Id: docSnap.id } as Asset;
  }

  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    const pathMatch = asset.FileUrl.match(/\/o\/(.+)$/);
    const path = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
    if (path) {
      await deleteObject(ref(storage, path));
    }
    await deleteDoc(doc(this.assetsRef, assetId));
  }

  private getAssetType(mimeType: string): Asset['Type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
  }
}

export const assetService = new AssetService();