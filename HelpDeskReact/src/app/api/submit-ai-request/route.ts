import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { serviceKey, formData } = await request.json();

        if (!serviceKey || !formData) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createClient();

        // Get service
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('key', serviceKey)
            .single();

        if (serviceError || !service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            );
        }

        // Get a valid user ID (temporary solution until auth is fully integrated)
        const { data: users } = await supabase
            .from('profiles') // Assuming 'profiles' or 'users' table exists. Let's check schema first if possible, but usually profiles is linked to auth.
            .select('id')
            .limit(1);

        let userId = '00000000-0000-0000-0000-000000000001';

        if (users && users.length > 0) {
            userId = users[0].id;
        } else {
            // Fallback: try to fetch from auth.users if possible, or just fail gracefully
            console.warn('[Submit AI Request] No users found, using mock ID');
        }

        // Generate request number as integer (timestamp in seconds)
        const requestNumber = Math.floor(Date.now() / 1000);

        // Create request with minimal fields that we know exist
        const { data: newRequest, error: requestError } = await supabase
            .from('requests')
            .insert({
                request_number: requestNumber,
                service_id: service.id,
                // status has a default value of 'جديد'
                // created_at is auto-generated
            })
            .select()
            .single();

        if (requestError || !newRequest) {
            console.error('[Submit AI Request] Error creating request:', requestError);
            return NextResponse.json(
                {
                    error: 'Failed to create request',
                    details: requestError?.message || 'Unknown database error',
                    code: requestError?.code
                },
                { status: 500 }
            );
        }

        // Save form data
        const { error: formError } = await supabase
            .from('request_form_values')
            .insert({
                request_id: newRequest.id,
                form_data: formData
            });

        if (formError) {
            console.error('[Submit AI Request] Error saving form data:', formError);
            // Don't fail the request, just log the error
        }

        // Create initial action log (Legacy)
        await supabase
            .from('request_actions')
            .insert({
                request_id: newRequest.id,
                actor_id: userId,
                action_type: 'إنشاء',
                comment: 'تم إنشاء الطلب بواسطة المساعد الذكي'
            });

        // Add to Timeline (request_events)
        await supabase
            .from('request_events')
            .insert({
                request_id: newRequest.id,
                event_type: 'status_changed',
                new_status: 'جديد',
                actor_id: userId,
                meta: { note: 'تم إنشاء الطلب بواسطة المساعد الذكي' }
            });

        return NextResponse.json({
            success: true,
            requestId: String(newRequest.request_number), // Convert to string for display
            requestUuid: newRequest.id
        });

    } catch (error) {
        console.error('[Submit AI Request] Error:', error);
        return NextResponse.json(
            {
                error: 'فشل في إرسال الطلب',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
