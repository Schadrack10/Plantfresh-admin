import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { SectionTemplate, CreateSectionTemplateData } from '../../types';

export class SectionTemplateService {
  private templatesRef = collection(db, 'SectionTemplates');

  async getSectionTemplate(templateId: string): Promise<SectionTemplate | null> {
    const docSnap = await getDoc(doc(this.templatesRef, templateId));
    if (!docSnap.exists()) return null;
    return docSnap.data() as SectionTemplate;
  }

  async getTenantSectionTemplates(tenantId: string): Promise<SectionTemplate[]> {
    const q = query(this.templatesRef, where('TenantId', '==', tenantId));
    const docSnaps = await getDocs(q);
    return docSnaps.docs.map(doc => ({ ...doc.data(), Id: doc.id } as SectionTemplate));
  }

  async createSectionTemplate(data: CreateSectionTemplateData): Promise<string> {
    const templateId = doc(this.templatesRef).id;
    await setDoc(doc(this.templatesRef, templateId), {
      ...data,
      CreatedAt: new Date()
    });
    return templateId;
  }

  async updateSectionTemplate(templateId: string, updates: Partial<SectionTemplate>): Promise<void> {
    await updateDoc(doc(this.templatesRef, templateId), {
      ...updates,
      UpdatedAt: new Date()
    });
  }

  async deleteSectionTemplate(templateId: string): Promise<void> {
    await deleteDoc(doc(this.templatesRef, templateId));
  }
}

export const sectionTemplateService = new SectionTemplateService();
