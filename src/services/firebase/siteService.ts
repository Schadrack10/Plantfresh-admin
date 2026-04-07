import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Site, Theme, Page, Section, UpdateSiteData, CreatePageData, CreateSectionData } from '../../types';

export class SiteService {
  private sitesRef = collection(db, 'Sites');

  async getSite(tenantId: string): Promise<Site | null> {
    const docSnap = await getDoc(doc(this.sitesRef, tenantId));
    if (!docSnap.exists()) return null;
    return docSnap.data() as Site;
  }

  async updateSiteTheme(tenantId: string, theme: Theme): Promise<void> {
    await updateDoc(doc(this.sitesRef, tenantId), {
      Theme: theme,
      UpdatedAt: new Date()
    });
  }

  async updateSite(tenantId: string, updates: UpdateSiteData): Promise<void> {
    await updateDoc(doc(this.sitesRef, tenantId), {
      ...updates,
      UpdatedAt: new Date()
    });
  }

  async publishSite(tenantId: string, published: boolean): Promise<void> {
    await updateDoc(doc(this.sitesRef, tenantId), {
      Published: published,
      UpdatedAt: new Date()
    });
  }

  async addPage(tenantId: string, pageData: CreatePageData): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const newPage: Page = {
      Id: doc(collection(db, 'Sites')).id,
      Title: pageData.Title,
      Slug: pageData.Slug,
      Sections: pageData.Sections || []
    };

    await this.updateSite(tenantId, { Pages: [...site.Pages, newPage] });
  }

  async updatePage(tenantId: string, pageId: string, pageData: Partial<Page>): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const updatedPages = site.Pages.map((page) =>
      page.Id === pageId ? { ...page, ...pageData } : page
    );

    await this.updateSite(tenantId, { Pages: updatedPages });
  }

  async deletePage(tenantId: string, pageId: string): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const updatedPages = site.Pages.filter((page) => page.Id !== pageId);
    await this.updateSite(tenantId, { Pages: updatedPages });
  }

  async reorderPages(tenantId: string, pageOrder: string[]): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const reorderedPages = pageOrder
      .map((pageId) => site.Pages.find((page) => page.Id === pageId))
      .filter(Boolean) as Page[];

    await this.updateSite(tenantId, { Pages: reorderedPages });
  }

  async addSection(tenantId: string, pageId: string, sectionData: CreateSectionData): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const updatedPages = site.Pages.map((page) => {
      if (page.Id !== pageId) return page;
      const newSection: Section = {
        Id: doc(collection(db, 'Sites')).id,
        Type: sectionData.Type,
        Content: sectionData.Content,
        Order: sectionData.Order
      };
      return {
        ...page,
        Sections: [...page.Sections, newSection].sort((a, b) => a.Order - b.Order)
      };
    });

    await this.updateSite(tenantId, { Pages: updatedPages });
  }

  async updateSection(
    tenantId: string,
    pageId: string,
    sectionId: string,
    sectionData: Partial<Section>
  ): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const updatedPages = site.Pages.map((page) => {
      if (page.Id !== pageId) return page;
      return {
        ...page,
        Sections: page.Sections.map((section) =>
          section.Id === sectionId ? { ...section, ...sectionData } : section
        )
      };
    });

    await this.updateSite(tenantId, { Pages: updatedPages });
  }

  async deleteSection(tenantId: string, pageId: string, sectionId: string): Promise<void> {
    const site = await this.getSite(tenantId);
    if (!site) throw new Error('Site not found');

    const updatedPages = site.Pages.map((page) => {
      if (page.Id !== pageId) return page;
      return {
        ...page,
        Sections: page.Sections.filter((section) => section.Id !== sectionId)
      };
    });

    await this.updateSite(tenantId, { Pages: updatedPages });
  }
}

export const siteService = new SiteService();
