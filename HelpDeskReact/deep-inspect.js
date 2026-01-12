
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepInspect() {
    console.log('--- Deep Inspection ---');

    // 1. Check Total Permissions Count
    const { count, error: countError } = await supabase
        .from('step_field_permissions')
        .select('*', { count: 'exact', head: true });

    console.log(`Total rows in 'step_field_permissions': ${count ?? 0}`);
    if (countError) console.error('Count Error:', countError);

    // 2. Get Current Delivery Workflow ID
    const { data: service } = await supabase.from('services').select('id').eq('key', 'delivery-request').single();

    if (service) {
        const { data: wf } = await supabase
            .from('workflows')
            .select('id, name, created_at')
            .eq('service_id', service.id)
            .single();

        if (wf) {
            console.log(`Current Delivery Workflow ID: ${wf.id}`);
            console.log(`Created At: ${wf.created_at}`);

            // 3. Check permissions specific to this ID
            const { data: perms } = await supabase
                .from('step_field_permissions')
                .select('step_id, field_key, visible, editable')
                .eq('workflow_id', wf.id);

            console.log(`Permissions found for this ID: ${perms?.length ?? 0}`);
            if (perms && perms.length > 0) {
                console.table(perms.slice(0, 5)); // Show first 5
            }
        } else {
            console.log('No workflow found for delivery service.');
        }
    } else {
        console.log('Delivery service not found.');
    }
}

deepInspect();
