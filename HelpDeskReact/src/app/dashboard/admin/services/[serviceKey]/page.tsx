import { UnifiedServiceEditor } from "@/components/admin/unified-service-editor";
import { createClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { getWorkflowDefinition } from "@/lib/workflow-engine";

interface PageProps {
    params: Promise<{
        serviceKey: string;
    }>;
}

export const dynamic = "force-dynamic";

export default async function ServiceEditorPage({ params }: PageProps) {
    const { serviceKey } = await params;
    const decodedKey = decodeURIComponent(serviceKey);

    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userProfile?.role !== 'admin' && userProfile?.role !== 'helpdesk_admin') {
        redirect('/dashboard');
    }

    // 2. Fetch Service
    const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('key', decodedKey)
        .single();

    if (error || !service) {
        console.error("Service not found:", decodedKey, error);
        notFound();
    }

    // 3. Fetch Workflow
    // We use getWorkflowDefinition helper which abstracts the storage logic
    const workflow = await getWorkflowDefinition(service.key);

    return (
        <UnifiedServiceEditor
            service={service}
            initialWorkflow={workflow}
        />
    );
}
