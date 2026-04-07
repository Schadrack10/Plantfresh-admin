export type Role = 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';

export interface AuthenticatedUser {
  uid?: string;
  email?: string;
  role?: Role;
  tenantId?: string;
  userId?: string;
}

export interface Tenant {
  Id?: string;
  Name: string;
  Subdomain: string;
  CustomDomain?: string;
  OwnerId: string;
  CreatedAt: Date;
  TemplateId: string;
}

export interface User {
  Id?: string;
  Email: string;
  TenantId: string;
  Role: Role;
  CreatedAt: Date;
}

export interface Theme {
  PrimaryColor: string;
  SecondaryColor: string;
  FontFamily: string;
  BackgroundColor?: string;
  TextColor?: string;
}

export interface Section {
  Id: string;
  Type: string;
  Content: Record<string, unknown>;
  Order: number;
}

export interface Page {
  Id: string;
  Title: string;
  Slug: string;
  Sections: Section[];
}

export interface Site {
  TenantId: string;
  Theme: Theme;
  Pages: Page[];
  Published: boolean;
  UpdatedAt: Date;
  CreatedAt: Date;
}

export interface Template {
  Id?: string;
  Name: string;
  Description: string;
  PreviewImage?: string;
  Theme: Theme;
  Pages: Page[];
  CreatedAt: Date;
  Editable: false;
}

export interface CreateTemplateData {
  Name: string;
  Description: string;
  PreviewImage?: string;
  Theme: Theme;
  Pages: Page[];
}

export interface Asset {
  Id?: string;
  TenantId: string;
  FileUrl: string;
  Type: 'image' | 'pdf' | 'document';
  CreatedAt: Date;
  UploadedBy: string;
}

export interface CreateTenantData {
  Name: string;
  Subdomain: string;
  OwnerId: string;
  TemplateId: string;
}

export interface CreateUserData {
  Email: string;
  TenantId: string;
  Role: Role;
}

export interface UpdateSiteData {
  Theme?: Partial<Theme>;
  Pages?: Page[];
  Published?: boolean;
}

export interface CreatePageData {
  Title: string;
  Slug: string;
  Sections?: Section[];
}

export interface CreateSectionData {
  Type: string;
  Content: Record<string, unknown>;
  Order: number;
}

export interface SectionTemplate {
  Id?: string;
  TenantId: string;
  Name: string;
  Description: string;
  Type: string;
  Content: Record<string, unknown>;
  CreatedAt: Date;
  CreatedBy: string;
}

export interface CreateSectionTemplateData {
  TenantId: string;
  Name: string;
  Description: string;
  Type: string;
  Content: Record<string, unknown>;
  CreatedBy: string;
}
