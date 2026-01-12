import { WorkflowDefinition, FormSchema } from "@/types";

export interface ServiceGenerationResult {
  serviceName: string;
  serviceKey: string;
  description: string;
  workflow: WorkflowDefinition;
  form: FormSchema;
}

export async function generateServiceFromDescription(
  description: string,
  image?: string | null
): Promise<ServiceGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback for development if no key is present
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('GEMINI_API_KEY missing. Using mock data for development.');
      return getMockServiceData(description || 'mock service');
    }
    throw new Error("GEMINI_API_KEY is not configured. Please add it to your .env.local file.");
  }

  const systemInstructions = `You are an expert workflow designer for a service management system. 
Given a service description (and optionally an image of a form or workflow diagram) in Arabic or English, generate a complete service configuration.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations.

Generate a JSON object with this EXACT structure:
{
  "serviceName": "string (Arabic name)",
  "serviceKey": "string (kebab-case English key, e.g., 'leave-request')",
  "description": "string (brief Arabic description)",
  "workflow": {
    "version": "1.0",
    "nodes": [
      { "id": "1", "type": "start", "position": {"x": 250, "y": 50}, "data": {"label": "البداية"} },
      ...
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2" },
      ...
    ]
  },
  "form": {
    "version": "2.0",
    "pages": [
      {
        "id": "page_1",
        "title": "بيانات الطلب",
        "sections": [
          {
            "id": "section_1",
            "columns": 2,
            "fields": [
              {
                "id": "f_reason",
                "key": "reason",
                "label": "السبب",
                "type": "text_multi",
                "required": true,
                "width": "full"
              }
            ]
          }
        ]
      }
    ]
  }
}

Rules:
1. Always start with a "start" node (id: "1")
2. Always end with an "end" node
3. Use "approval" type for approval steps
4. Use "action" type for ALL automated actions or manual tasks.
5. Valid types are ONLY: "start", "end", "approval", "action", "form", "gateway", "join", "subworkflow".
6. Add conditions to edges when description mentions "if", "إذا", "في حال".
7. Common roles: "موظف", "مشرف", "مدير", "HR".
8. Position nodes vertically.
9. Make the form SMART and BEAUTIFUL:
   - Use "width": "1/2" or "1/3" to group related fields.
   - Use "helpText" and "placeholder".
   - field types: "text_single", "text_multi", "number", "decimal", "email", "date", "datetime", "choice_single", "choice_multi", "checkbox", "attachment".
   - For choice types, provide "config": { "options": [...] }.

Return ONLY the JSON object, nothing else.`;

  // Prepare user content parts (Text + Optional Image)
  const parts: any[] = [];

  if (description) {
    parts.push({ text: `Service Description: "${description}"` });
  } else {
    parts.push({ text: "Analyze this image and generate a service structure (form and workflow)." });
  }

  if (image) {
    // Image expected as base64 string (without data:image/png;base64, prefix if possible, but Google API might handle raw base64)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    parts.push({
      inline_data: {
        mime_type: "image/jpeg", // Assuming JPEG/PNG, the API is flexible usually
        data: base64Data
      }
    });
  }

  try {
    console.log('[AI Service Builder] Calling Gemini API...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstructions }]
          },
          contents: [
            {
              role: "user",
              parts: parts
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
      console.error('[AI Service Builder] API Error:', response.status, errorText);
      throw new Error(`Gemini API error (${response.status}): ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    console.log('[AI Service Builder] API Response received');

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('[AI Service Builder] No text in response:', JSON.stringify(data, null, 2));
      throw new Error("No response from Gemini API");
    }

    // Clean up the response (remove markdown code blocks if present)
    // Extract JSON using a regex to find the first '{' and the last '}'
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    let cleanedText = jsonMatch ? jsonMatch[0] : generatedText;

    console.log('[AI Service Builder] Parsing JSON response...');
    const result: ServiceGenerationResult = JSON.parse(cleanedText);

    // Validate the result
    if (!result.serviceName || !result.workflow || !result.form) {
      throw new Error("Invalid response structure from AI");
    }

    console.log('[AI Service Builder] Service generated successfully:', result.serviceName);
    return result;
  } catch (error) {
    console.error("[AI Service Builder] Error:", error);
    throw new Error(
      `Failed to generate service: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function getMockServiceData(description: string): ServiceGenerationResult {
  const isLeave = description.includes('إجازة') || description.includes('leave');
  const isStationery = description.includes('قرطاسية') || description.includes('stationery');
  const timestamp = new Date().getTime();

  let serviceName = "خدمة عامة (تجريبي)";
  let serviceKey = `generic-service-${timestamp}`;

  if (isLeave) {
    serviceName = `طلب إجازة (تجريبي ${timestamp})`;
    serviceKey = `leave-request-${timestamp}`;
  } else if (isStationery) {
    serviceName = `طلب قرطاسية (تجريبي ${timestamp})`;
    serviceKey = `stationery-request-${timestamp}`;
  }

  return {
    serviceName: serviceName,
    serviceKey: serviceKey,
    description: description,
    workflow: {
      version: '1.0',
      nodes: [
        { id: "1", type: "start", position: { x: 250, y: 50 }, data: { label: "البداية" } },
        { id: "2", type: "approval", position: { x: 250, y: 200 }, data: { label: "موافقة المدير", role: "مدير", sla_hours: 24 } },
        { id: "3", type: "end", position: { x: 250, y: 400 }, data: { label: "النهاية" } }
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e2-3", source: "2", target: "3", label: "موافق" }
      ]
    },
    form: {
      version: '2.0',
      pages: [
        {
          id: 'page-1',
          title: 'بيانات الطلب',
          sections: [
            {
              id: 'section-1',
              columns: 2,
              fields: isStationery ? [
                { id: 'f-1', key: "section_1", label: "تفاصيل الطلب", type: "section", width: 'full' },
                { id: 'f-2', key: "items", label: "الأصناف المطلوبة", type: "text_multi", required: true, placeholder: "قلم أزرق، دباسة، ورق A4...", description: "اكتب كل صنف في سطر جديد", width: 'full' },
                { id: 'f-3', key: "quantity", label: "العدد الإجمالي", type: "number", required: true, width: "1/2", placeholder: "مثال: 5" },
                { id: 'f-4', key: "priority", label: "الأهمية", type: "choice_single", required: true, width: "1/2", config: { options: [{ label: "عادي", value: "عادي" }, { label: "مستعجل", value: "مستعجل" }, { label: "طارئ", value: "طارئ" }] } },

                { id: 'f-5', key: "section_2", label: "معلومات التوصيل", type: "section", width: 'full' },
                { id: 'f-6', key: "office_num", label: "رقم المكتب", type: "text_single", required: true, width: "1/3", placeholder: "B-102" },
                { id: 'f-7', key: "phone", label: "رقم التحويلة", type: "text_single", required: false, width: "1/3", placeholder: "1234" },
                { id: 'f-8', key: "date_needed", label: "تاريخ الاحتياج", type: "date", required: true, width: "1/3" }
              ] : [
                { id: 'f-9', key: "section_info", label: "بيانات الإجازة", type: "section", width: 'full' },
                { id: 'f-10', key: "leave_type", label: "نوع الإجازة", type: "choice_single", required: true, width: "1/2", config: { options: [{ label: "سنوية", value: "سنوية" }, { label: "مرضية", value: "مرضية" }, { label: "طارئة", value: "طارئة" }, { label: "بدون راتب", value: "بدون راتب" }] } },
                { id: 'f-11', key: "balance", label: "الرصيد المتبقي", type: "number", required: false, width: "1/2", placeholder: "سيتم حسابه تلقائياً", description: "للاطلاع فقط" },

                { id: 'f-12', key: "start_date", label: "تاريخ البداية", type: "date", required: true, width: "1/2" },
                { id: 'f-13', key: "end_date", label: "تاريخ النهاية", type: "date", required: true, width: "1/2" },

                { id: 'f-14', key: "reason", label: "سبب الإجازة / ملاحظات", type: "text_multi", required: true, placeholder: "يرجى ذكر السبب في حال الإجازة الطارئة...", description: "يظهر للمدير فقط", width: 'full' },

                { id: 'f-15', key: "section_contact", label: "التواصل أثناء الإجازة", type: "section", width: 'full' },
                { id: 'f-16', key: "alt_phone", label: "رقم بديل", type: "text_single", required: true, width: "1/2", placeholder: "05xxxxxxxx" },
                { id: 'f-17', key: "alt_email", label: "إيميل شخصي", type: "email", required: false, width: "1/2", placeholder: "name@gmail.com" }
              ]
            }
          ]
        }
      ]
    }
  };
}
