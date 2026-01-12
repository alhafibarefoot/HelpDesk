import { ServiceGenerationResult } from '@/lib/ai-service-builder';
import { WorkflowDefinition, FormSchema } from '@/types';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    workflow?: WorkflowDefinition;
    form?: FormSchema;
    timestamp: Date;
}

export interface RefineWorkflowRequest {
    mode: 'create' | 'refine';
    command: string;
    image?: string | null; // Add image support
    currentWorkflow?: WorkflowDefinition;
    currentForm?: FormSchema;
    serviceName?: string;
    conversationHistory?: { role: string; content: string }[];
}

export interface RefineWorkflowResponse {
    workflow: WorkflowDefinition;
    form: FormSchema;
    serviceName: string;
    serviceKey: string;
    message: string;
}

export async function refineWorkflowWithAI(
    request: RefineWorkflowRequest
): Promise<RefineWorkflowResponse> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const isInitialCreation = request.mode === 'create';

    const systemPrompt = isInitialCreation
        ? `You are an expert workflow designer. Create a complete service workflow from the user's description (and optional image).`
        : `You are a workflow refinement assistant. The user wants to modify an existing workflow.
Current workflow: ${JSON.stringify(request.currentWorkflow, null, 2)}
Current form: ${JSON.stringify(request.currentForm, null, 2)}
Service name: ${request.serviceName}

Modify the workflow according to the user's command. Return the COMPLETE updated workflow.`;

    const userPrompt = isInitialCreation
        ? `Create a service workflow for: "${request.command}"`
        : `User command: "${request.command}"`;

    const fullPrompt = `${systemPrompt}

${userPrompt}

IMPORTANT: Return ONLY valid JSON with this structure:
{
  "serviceName": "string (Arabic)",
  "serviceKey": "string (kebab-case)",
  "workflow": {
    "nodes": [...],
    "edges": [...]
  },
  "form": {
    "version": "2.0",
    "pages": [
      {
        "id": "p1",
        "title": "Page Title",
        "sections": [
          {
            "id": "s1",
            "title": "Section Title",
            "columns": 2,
            "fields": [
               { 
                 "id": "unique_id", 
                 "key": "field_key", 
                 "label": "Arabic Label", 
                 "type": "text_single",
                 "rules": [{"type": "visibility", "ifField": "dependency_key", "operator": "eq", "value": "value"}]
               }
            ]
          }
        ]
      }
    ]
  },
  "message": "string (brief Arabic confirmation of what was done)"
}

Rules:
- Always include start node (id: "1", type: "start")
- Always include at least one end node (type: "end")
- Use "approval" type for approval steps
- Use "action" type for automated actions
- Position nodes vertically (y increases by ~150-200)
- For refinements, keep existing nodes unless explicitly asked to remove them
- Add new nodes with unique IDs
- Update edges to connect properly
Return ONLY valid JSON. 

Checklist for Excellence:
1. FORM STRUCTURE: Must use "version": "2.0", "pages", "sections", and "fields".
2. CONDITIONAL LOGIC (MANDATORY): If a field choice should show/hide other fields, you MUST add "rules" to the dependent fields.
3. RULES FORMAT: "rules": [{"type": "visibility", "ifField": "trigger_field_key", "operator": "eq", "value": "trigger_value"}]
4. OPTION VALUES: In "config.options", always use English "value" (e.g., "laptop") and Arabic "label" (e.g., "لابتوب").
5. TRIGGER MATCHING: The "value" in the "rule" must match the English "value" in the options, NOT the Arabic "label".

One-Shot Example for Logic:
Trigger Field: 
{ 
  "key": "device_type", 
  "type": "choice_single", 
  "label": "نوع الجهاز", 
  "config": { "options": [{"label": "لابتوب", "value": "laptop"}, {"label": "طابعة", "value": "printer"}] } 
}
Dependent Field: 
{ 
  "key": "serial_number", 
  "label": "الرقم التسلسلي", 
  "rules": [{"type": "visibility", "ifField": "device_type", "operator": "eq", "value": "laptop"}] 
}

Return ONLY valid JSON. No conversational text. No markdown format. Just the JSON object.`;

    // Prepare content parts
    const parts: any[] = [{ text: fullPrompt }];

    if (request.image) {
        // Image expected as base64 string
        const base64Data = request.image.includes(',') ? request.image.split(',')[1] : request.image;
        parts.push({
            inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
            }
        });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: parts,
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error("No response from Gemini API");
        }

        // Clean up response
        let cleanedText = generatedText.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/```\n?/g, "");
        }

        const result = JSON.parse(cleanedText);

        // Fallback for flat fields if AI fails to generate pages
        if (result.form && !result.form.pages && (result.form as any).fields) {
            console.log('[Refiner] AI returned flat fields, restructuring to proper format...');
            const flatFields = (result.form as any).fields;
            result.form = {
                version: '2.0',
                pages: [
                    {
                        id: 'page-1',
                        title: 'تفاصيل الطلب',
                        sections: [
                            {
                                id: 'section-1',
                                title: 'البيانات الأساسية',
                                columns: 2,
                                fields: flatFields
                            }
                        ]
                    }
                ]
            };
        } else if (result.form && (!result.form.pages || result.form.pages.length === 0)) {
            // Second fallback: if form exists but is empty/malformed, ensure at least one empty page exists to prevent errors
            console.log('[Refiner] Form is empty or missing pages, initializing default...');
            result.form = {
                version: '2.0',
                pages: result.form.pages || [
                    {
                        id: 'page-1',
                        title: 'بيانات الطلب',
                        sections: []
                    }
                ]
            };
        }

        // Normalize form schema (AI often mixes up 'rules', 'conditions', 'condition', or uses 'show_if')
        if (result.form?.pages) {
            result.form.pages.forEach((page: any) => {
                page.sections?.forEach((section: any) => {
                    section.fields?.forEach((field: any) => {
                        // 1. Convert 'conditions' to 'rules'
                        if (field.conditions && !field.rules) {
                            console.log(`[Refiner] Normalizing 'conditions' to 'rules' for field: ${field.key}`);
                            field.rules = field.conditions.map((c: any) => ({
                                type: 'visibility',
                                ifField: c.field || c.ifField,
                                operator: c.operator === '==' ? 'eq' : c.operator === '!=' ? 'neq' : c.operator,
                                value: c.value
                            }));
                            delete field.conditions;
                        }

                        // 2. Convert 'show_if' or 'condition' to 'rules'
                        const condStr = field.show_if || field.condition;
                        if (condStr && typeof condStr === 'string' && !field.rules) {
                            console.log(`[Refiner] Normalizing string condition to 'rules' for field: ${field.key}`);
                            const match = condStr.match(/(\w+)\s*(=|==|===|!=|!==)\s*['"]?([^'"]+)['"]?/);
                            if (match) {
                                const [_, ifField, operator, value] = match;
                                field.rules = [{
                                    type: 'visibility',
                                    ifField,
                                    operator: operator.includes('!') ? 'neq' : 'eq',
                                    value
                                }];
                            }
                        }

                        // 3. Normalize field type and options
                        if (field.type === 'select') {
                            field.type = 'choice_single';
                        }

                        if (field.options && (!field.config || !field.config.options)) {
                            if (!field.config) field.config = {};
                            field.config.options = field.options;
                        }
                    });
                });
            });
        }

        return {
            workflow: result.workflow,
            form: result.form,
            serviceName: result.serviceName,
            serviceKey: result.serviceKey,
            message: result.message || (isInitialCreation ? 'تم إنشاء المخطط' : 'تم التحديث'),
        };
    } catch (error) {
        console.error("[Refine Workflow] Error:", error);
        throw new Error(
            `Failed to refine workflow: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}
