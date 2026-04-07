import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tenant, CreateTenantData, Site, Template } from '../../types';
import { templateService } from './templateService';

export class TenantService {
  private tenantsRef = collection(db, 'Tenants');
  private sitesRef = collection(db, 'Sites');

  async createTenant(data: CreateTenantData): Promise<string> {
    const existing = await getDocs(query(this.tenantsRef, where('Subdomain', '==', data.Subdomain)));
    if (!existing.empty) {
      throw new Error('Subdomain already taken');
    }

    const template = await templateService.getTemplate(data.TemplateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const tenantRef = doc(this.tenantsRef);
    const tenantId = tenantRef.id;

    const tenantData: Tenant = {
      Name: data.Name,
      Subdomain: data.Subdomain,
      OwnerId: data.OwnerId,
      CreatedAt: new Date(),
      TemplateId: data.TemplateId
    };

    await setDoc(tenantRef, tenantData);

    const siteData: Site = {
      TenantId: tenantId,
      Theme: template.Theme,
      Pages: template.Pages,
      Published: false,
      UpdatedAt: new Date(),
      CreatedAt: new Date()
    };

    await setDoc(doc(this.sitesRef, tenantId), siteData);
    return tenantId;
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const docSnap = await getDoc(doc(this.tenantsRef, tenantId));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), Id: docSnap.id } as Tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const q = query(this.tenantsRef, where('Subdomain', '==', subdomain));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const document = snapshot.docs[0];
    return { ...document.data(), Id: document.id } as Tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    const snapshot = await getDocs(this.tenantsRef);
    return snapshot.docs.map((docItem) => ({ ...docItem.data(), Id: docItem.id } as Tenant));
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
    await updateDoc(doc(this.tenantsRef, tenantId), { ...updates });
  }

  async checkSubdomainAvailable(subdomain: string): Promise<boolean> {
    const snapshot = await getDocs(query(this.tenantsRef, where('Subdomain', '==', subdomain)));
    return snapshot.empty;
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const snapshot = await getDocs(query(this.tenantsRef, where('OwnerId', '==', userId)));
    return snapshot.docs.map((docItem) => ({ ...docItem.data(), Id: docItem.id } as Tenant));
  }
}

export const tenantService = new TenantService();
