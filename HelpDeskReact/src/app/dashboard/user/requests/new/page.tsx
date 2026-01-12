import { createClient, createAdminClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import NewRequestWizard from "@/app/dashboard/user/requests/new/NewRequestWizard";

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ clone_from?: string; service?: string }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    // 0. Redirect Legacy Service Links
    if (params.service) {
        redirect(`/dashboard/services/${params.service}`);
    }

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // 2. Fetch Active Services
    const { data: services, error } = await supabase
        .from('services')
        .select('id, name, key, description, form_schema')
        .eq('is_active', true)
    if (error) {
        console.error("Error fetching services:", JSON.stringify(error, null, 2));
    }

    // 3. Pass Clone ID (Client-side fetch)
    const cloneFromId = params.clone_from || undefined;

    return (
        <div className="container mx-auto max-w-5xl py-8">
            <NewRequestWizard
                services={services || []}
                currentUser={{ id: user.id, email: user.email }}
                initialCloneId={cloneFromId}
            />
        </div>
    );
}
