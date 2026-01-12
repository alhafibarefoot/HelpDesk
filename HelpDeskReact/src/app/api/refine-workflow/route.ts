import { NextRequest, NextResponse } from 'next/server';
import { refineWorkflowWithAI } from '@/lib/ai-workflow-refiner';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode, command, currentWorkflow, currentForm, serviceName, image } = body;

        if ((!command || typeof command !== 'string') && !image) {
            return NextResponse.json(
                { error: 'Command or Image is required' },
                { status: 400 }
            );
        }

        const result = await refineWorkflowWithAI({
            mode: mode || 'create',
            command: command || 'Analyze the attached image and generate/update the workflow.',
            image,
            currentWorkflow,
            currentForm,
            serviceName,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Refine Workflow API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to refine workflow' },
            { status: 500 }
        );
    }
}
