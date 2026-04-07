import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tenant, Template } from "@/types";
import { tenantService } from "@/services/firebase/tenantService";
import { templateService } from "@/services/firebase/templateService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import AppContext from "../context/AppContext";
import { useContext } from "react";

export default function Tenants() {
  const navigate = useNavigate();
  const { globalState } = useContext(AppContext);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentUser = globalState?.AuthenticatedUser || {};
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const currentUserId = currentUser?.uid || currentUser?.email || currentUser?.userId || "";
  const currentTenantId = currentUser?.tenantId;

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [templateList, tenantList] = await Promise.all([
          templateService.getAllTemplates(),
          tenantService.getAllTenants(),
        ]);
        setTemplates(templateList);

        const visibleTenants = isSuperAdmin
          ? tenantList
          : tenantList.filter((tenant) =>
              tenant.OwnerId === currentUserId || tenant.Id === currentTenantId
            );

        setTenants(visibleTenants);
        if (templateList.length && !selectedTemplateId) {
          setSelectedTemplateId(templateList[0].Id || "");
        }
      } catch (error) {
        console.error(error);
        toast({ title: "Load failed", description: "Unable to load tenants or templates.", variant: "destructive" });
      }
    };

    loadInitialData();
  }, [selectedTemplateId, toast, isSuperAdmin, currentUserId, currentTenantId]);

  const handleCreateTenant = async () => {
    if (!tenantName || !subdomain || !selectedTemplateId) {
      toast({ title: "Missing fields", description: "Please fill all tenant fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const ownerId = currentUserId || "admin";
      const tenantId = await tenantService.createTenant({
        Name: tenantName,
        Subdomain: subdomain.toLowerCase().trim(),
        OwnerId: ownerId,
        TemplateId: selectedTemplateId,
      });
      toast({ title: "Tenant created", description: `Tenant ${tenantName} has been created.` });
      setTenantName("");
      setSubdomain("");
      setSelectedTemplateId(templates[0]?.Id || "");
      setTenants(await tenantService.getAllTenants());
      navigate(`/builder/${tenantId}`);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Create failed", description: error?.message || "Unable to create tenant.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const templateList = templates;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-sm text-slate-600">Create and manage tenant storefronts, select a starter template, and open the site builder.</p>
        </div>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Create new tenant</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Tenant name</Label>
            <Input id="tenant-name" value={tenantName} onChange={(event) => setTenantName(event.target.value)} placeholder="Example: Green House" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-subdomain">Subdomain</Label>
            <Input id="tenant-subdomain" value={subdomain} onChange={(event) => setSubdomain(event.target.value)} placeholder="Example: greenhouse" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-template">Starter template</Label>
            <select
              id="tenant-template"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              {templateList.map((template) => (
                <option key={template.Id} value={template.Id}>{template.Name}</option>
              ))}
            </select>
          </div>
        </CardContent>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleCreateTenant} disabled={loading}>
            {loading ? "Creating…" : "Create tenant"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {tenants.map((tenant) => (
          <Card key={tenant.Id} className="overflow-hidden">
            <CardHeader>
              <CardTitle>{tenant.Name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-600">Subdomain: <span className="font-medium">{tenant.Subdomain}</span></div>
              <div className="text-sm text-slate-600">Template: <span className="font-medium">{tenant.TemplateId}</span></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => navigate(`/builder/${tenant.Id}`)}>
                  Open builder
                </Button>
                <Button variant="outline" onClick={() => window.open(`https://${tenant.Subdomain}.plantfresh.app`, "_blank")}>Preview</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
