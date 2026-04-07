import { collection, doc, getDoc, getDocs, query, orderBy, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Template, CreateTemplateData } from '../../types';

export class TemplateService {
  private templatesRef = collection(db, 'Templates');

  async getTemplate(templateId: string): Promise<Template | null> {
    const docSnap = await getDoc(doc(this.templatesRef, templateId));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), Id: docSnap.id } as Template;
  }

  async getAllTemplates(): Promise<Template[]> {
    const q = query(this.templatesRef, orderBy('CreatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => ({ ...docItem.data(), Id: docItem.id } as Template));
  }

  async getDefaultTemplate(): Promise<Template | null> {
    return this.getTemplate('defaultTemplate');
  }

  async getTemplateByName(name: string): Promise<Template | null> {
    const q = query(this.templatesRef, where('Name', '==', name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docItem = snapshot.docs[0];
    return { ...docItem.data(), Id: docItem.id } as Template;
  }

  async createTemplate(data: CreateTemplateData): Promise<string> {
    const newTemplateRef = doc(this.templatesRef);
    await setDoc(newTemplateRef, {
      ...data,
      CreatedAt: new Date(),
      Editable: false,
    });
    return newTemplateRef.id;
  }

  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<void> {
    await updateDoc(doc(this.templatesRef, templateId), {
      ...updates,
    });
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await deleteDoc(doc(this.templatesRef, templateId));
  }
}

export const templateService = new TemplateService();