import { useCallback, useEffect, useState, useContext } from "react";
import { Template, CreateTemplateData } from "@/types";
import AppContext from "../context/AppContext";
import { templateService } from "@/services/firebase/templateService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type FeatureTemplateSourceConfig = {
  ThemeCustomization?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    backgroundColor?: string;
    text?: { heading?: string };
  };
  HomeCustomization?: {
    featuresSection?: Record<string, unknown>;
    roomsSection?: Record<string, unknown>;
  };
  GeneralSettings?: {
    storeName?: string;
  };
};

type TemplatesPageContext = {
  globalState: {
    StoreConfig?: FeatureTemplateSourceConfig;
  };
};

const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9);

const buildTemplateFromStoreConfig = (
  config: FeatureTemplateSourceConfig,
  name: string,
  description: string,
  previewImage: string
): CreateTemplateData => {
  const theme = {
    PrimaryColor: config.ThemeCustomization?.primaryColor || '#16a34a',
    SecondaryColor: config.ThemeCustomization?.secondaryColor || '#10b981',
    FontFamily: config.ThemeCustomization?.fontFamily || 'Inter, sans-serif',
    BackgroundColor: config.ThemeCustomization?.backgroundColor || '#ffffff',
    TextColor: config.ThemeCustomization?.text?.heading || '#111827',
  };

  const featuresSection = config.HomeCustomization?.featuresSection || {};
  type RoomsSection = { rooms?: Array<Record<string, unknown>> };
  const roomsSection = (config.HomeCustomization?.roomsSection || {}) as RoomsSection;

  const sections: Array<{ Id: string; Type: string; Content: Record<string, unknown>; Order: number }> = [];
  if (featuresSection && Object.keys(featuresSection).length > 0) {
    sections.push({ Id: uid(), Type: 'Features', Content: featuresSection as Record<string, unknown>, Order: 1 });
  }
  if (roomsSection.rooms && Array.isArray(roomsSection.rooms) && roomsSection.rooms.length > 0) {
    sections.push({ Id: uid(), Type: 'Rooms', Content: roomsSection as Record<string, unknown>, Order: sections.length + 1 });
  }

  return {
    Name: name || 'New template',
    Description: description || 'Template generated from current feature settings',
    PreviewImage: previewImage || '',
    Theme: theme,
    Pages: [
      {
        Id: uid(),
        Title: 'Home',
        Slug: 'home',
        Sections: sections,
      },
    ],
  };
};

export default function Templates() {
  const { globalState } = useContext<TemplatesPageContext>(AppContext);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [pageJson, setPageJson] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      const list = await templateService.getAllTemplates();
      setTemplates(list);
    } catch (error: unknown) {
      console.error(error);
      toast({ title: 'Template load failed', description: 'Unable to load templates.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = async () => {
    if (!name || !description) {
      toast({ title: 'Missing fields', description: 'Template name and description are required.', variant: 'destructive' });
      return;
    }

    let pages;
    if (pageJson.trim()) {
      try {
        pages = JSON.parse(pageJson);
        if (!Array.isArray(pages)) throw new Error('Template pages must be a JSON array.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Problem parsing Pages JSON.';
        toast({ title: 'Invalid JSON', description: message, variant: 'destructive' });
        return;
      }
    } else {
      pages = [
        {
          Id: uid(),
          Title: 'Home',
          Slug: 'home',
          Sections: [],
        },
      ];
    }

    setSaving(true);
    try {
      const templateData: CreateTemplateData = {
        Name: name,
        Description: description,
        PreviewImage: previewImage || undefined,
        Theme: {
          PrimaryColor: '#16a34a',
          SecondaryColor: '#10b981',
          FontFamily: 'Inter, sans-serif',
          BackgroundColor: '#ffffff',
          TextColor: '#111827',
        },
        Pages: pages,
      };
      await templateService.createTemplate(templateData);
      toast({ title: 'Template created', description: `${name} is now available for tenants.` });
      setName('');
      setDescription('');
      setPreviewImage('');
      setPageJson('');
      loadTemplates();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to save template.';
      console.error(error);
      toast({ title: 'Create failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFromFeatures = async () => {
    if (!globalState?.StoreConfig) {
      toast({ title: 'No store config', description: 'Open Features first and save the current store settings before generating a template.', variant: 'destructive' });
      return;
    }

    const defaultName = `Template from ${globalState.StoreConfig?.GeneralSettings?.storeName || 'Features'} ${new Date().getFullYear()}`;
    const templateData = buildTemplateFromStoreConfig(globalState.StoreConfig, defaultName, 'Generated from current feature settings', previewImage);
    setPageJson(JSON.stringify(templateData.Pages, null, 2));
    setName(templateData.Name);
    setDescription(templateData.Description);
    toast({ title: 'Template scaffolded', description: 'Review and save the template below.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="text-sm text-slate-600">Create and manage starter templates that tenants can use to launch stores.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input id="template-name" value={name} onChange={e => setName(e.target.value)} placeholder="Green Shop" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Input id="template-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Storefront for eco products" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-preview">Preview image URL</Label>
            <Input id="template-preview" value={previewImage} onChange={e => setPreviewImage(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Button onClick={handleCreateTemplate} disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
          <Button variant="secondary" onClick={handleCreateFromFeatures}>
            Create from current Features config
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-pages">Pages JSON</Label>
          <Textarea id="template-pages" rows={10} value={pageJson} onChange={e => setPageJson(e.target.value)} placeholder='[ { "Id": "home", "Title": "Home", "Slug": "home", "Sections": [] } ]' />
          <p className="text-xs text-slate-500">Optional: paste a JSON array of pages to define section structure for your template.</p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.length > 0 ? templates.map((template) => (
          <Card key={template.Id} className="overflow-hidden">
            <CardHeader>
              <CardTitle>{template.Name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{template.Description}</p>
              <div className="text-sm text-slate-500">Pages: {template.Pages?.length ?? 0}</div>
              {template.PreviewImage && (
                <img src={template.PreviewImage} alt={template.Name} className="w-full rounded-xl border border-slate-200" />
              )}
            </CardContent>
          </Card>
        )) : (
          <Card>
            <CardContent>
              <div className="text-sm text-slate-600">No templates are available yet. Use the form above to create one, or save current features settings and click Create from current Features config.</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
