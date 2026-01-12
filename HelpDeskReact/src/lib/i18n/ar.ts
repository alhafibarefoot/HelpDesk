/**
 * Arabic Localization Dictionary
 * Complete translations for the HelpDesk system
 */

export const ar = {
    // Common
    common: {
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        add: 'إضافة',
        search: 'بحث',
        filter: 'تصفية',
        close: 'إغلاق',
        back: 'رجوع',
        next: 'التالي',
        previous: 'السابق',
        submit: 'إرسال',
        confirm: 'تأكيد',
        loading: 'جاري التحميل...',
        success: 'نجح',
        error: 'خطأ',
        warning: 'تحذير',
        info: 'معلومات',
        yes: 'نعم',
        no: 'لا',
        optional: 'اختياري',
        required: 'مطلوب',
        all: 'الكل',
        none: 'لا شيء',
        select: 'اختر',
        upload: 'رفع',
        download: 'تحميل',
        view: 'عرض',
        print: 'طباعة',
        export: 'تصدير',
        import: 'استيراد'
    },

    // Workflow Editor
    workflow: {
        title: 'محرر سير العمل',
        newWorkflow: 'سير عمل جديد',
        saveWorkflow: 'حفظ المخطط',
        autoLayout: 'ترتيب تلقائي',
        addNode: 'إضافة خطوة',
        deleteNode: 'حذف الخطوة',
        properties: 'الخصائص',
        summary: 'الملخص',
        validation: {
            needsStart: 'يجب أن يكون هناك نقطة بداية واحدة فقط',
            needsEnd: 'يجب أن يكون هناك نقطة نهاية واحدة على الأقل',
            invalidConnection: 'اتصال غير صالح',
            duplicateNode: 'خطوة مكررة'
        },
        saved: 'تم حفظ المخطط بنجاح!',
        saveFailed: 'فشل الحفظ'
    },

    // Node Types
    nodes: {
        start: {
            label: 'البداية',
            description: 'نقطة بداية سير العمل'
        },
        end: {
            label: 'النهاية',
            description: 'نقطة نهاية سير العمل',
            outcomes: {
                completed: 'مكتمل',
                rejected: 'مرفوض',
                cancelled: 'ملغي',
                redirected: 'محول',
                on_hold: 'معلق',
                expired: 'منتهي'
            }
        },
        form: {
            label: 'نموذج',
            description: 'إدخال بيانات من المستخدم',
            fields: 'حقول',
            validation: 'التحقق من الصحة'
        },
        approval: {
            label: 'موافقة',
            description: 'خطوة موافقة',
            role: 'الدور المسؤول',
            sla: 'وقت الإنجاز'
        },
        action: {
            label: 'إجراء',
            description: 'خطوة تنفيذية',
            role: 'المنفذ',
            sla: 'وقت الإنجاز'
        },
        gateway: {
            label: 'بوابة',
            description: 'تفريع المسارات',
            and: 'يجب إكمال جميع المسارات',
            or: 'يكفي إكمال أي مسار'
        },
        join: {
            label: 'تجميع',
            description: 'دمج المسارات المتوازية'
        },
        subworkflow: {
            label: 'سير فرعي',
            description: 'استدعاء سير عمل آخر',
            serviceKey: 'مفتاح الخدمة'
        }
    },

    // Properties Panel
    properties: {
        title: 'خصائص الخطوة',
        label: 'العنوان / التسمية',
        role: 'الدور المسؤول',
        sla: {
            title: 'وقت الإنجاز (SLA)',
            hours: 'بالساعات',
            warning: 'تنبيه عند (%)',
            escalation: 'التصعيد بعد (ساعات)',
            businessHours: 'احتساب ساعات العمل فقط (8 صباحاً - 5 مساءً)',
            description: 'المدة المتوقعة لإنجاز هذه الخطوة',
            warningDescription: 'إرسال تنبيه عند الوصول لهذه النسبة من الوقت',
            escalationDescription: 'تصعيد تلقائي للمدير إذا تجاوز هذا الوقت'
        },
        errorHandling: {
            title: 'معالجة الأخطاء',
            retryEnabled: 'إعادة المحاولة عند الفشل',
            maxRetries: 'عدد المحاولات',
            retryDelay: 'التأخير (ثانية)',
            fallbackEnabled: 'مسار بديل عند الفشل',
            notifyOnError: 'إشعار المسؤول عند الخطأ'
        },
        outcome: {
            type: 'نوع النهاية',
            reason: 'السبب (اختياري)',
            reasonPlaceholder: 'مثال: لم يستوفِ الشروط'
        }
    },

    // Workflow Summary
    summary: {
        title: 'ملخص سير العمل',
        steps: 'الخطوات',
        approvals: 'موافقات',
        actions: 'إجراءات',
        forms: 'نماذج',
        gateways: 'بوابات',
        totalSteps: 'إجمالي الخطوات',
        performance: 'الأداء',
        estimatedTime: 'الوقت المتوقع',
        averageSLA: 'متوسط SLA',
        endStates: 'نقاط النهاية',
        complexity: {
            title: 'التعقيد',
            simple: 'بسيط',
            medium: 'متوسط',
            complex: 'معقد',
            veryComplex: 'معقد جداً',
            score: 'نقاط التعقيد'
        },
        features: 'الميزات',
        integrations: {
            subworkflows: 'سير عمل فرعي',
            parallelPaths: 'مسارات متوازية',
            conditionalPaths: 'شروط ديناميكية',
            forms: 'نماذج إدخال',
            simple: 'سير عمل بسيط'
        },
        warnings: {
            noSteps: 'لم يتم إضافة خطوات بعد',
            noEndState: 'يجب إضافة نقطة نهاية واحدة على الأقل'
        }
    },

    // Error Messages
    errors: {
        network_error: 'خطأ في الاتصال بالشبكة',
        api_timeout: 'انتهت مهلة الاتصال',
        validation_error: 'خطأ في التحقق من البيانات',
        integration_error: 'خطأ في الاتصال بالنظام الخارجي',
        system_error: 'خطأ في النظام',
        permission_error: 'لا توجد صلاحيات كافية',
        data_error: 'خطأ في البيانات',
        unknown_error: 'خطأ غير معروف',
        saveFailed: 'فشل الحفظ',
        loadFailed: 'فشل التحميل',
        deleteFailed: 'فشل الحذف'
    },

    // Timeline
    timeline: {
        title: 'سجل الأحداث',
        events: {
            created: 'تم إنشاء الطلب',
            status_changed: 'تغيير الحالة',
            approved: 'تمت الموافقة',
            rejected: 'تم الرفض',
            commented: 'تعليق جديد',
            attachment_added: 'إضافة مرفق',
            escalated: 'تصعيد',
            sla_warning: 'تحذير SLA',
            sla_overdue: 'تجاوز SLA',
            error_occurred: 'حدث خطأ',
            error_resolved: 'تم حل الخطأ',
            step_completed: 'اكتملت الخطوة',
            workflow_completed: 'اكتمل سير العمل'
        },
        timeAgo: {
            now: 'الآن',
            minutesAgo: 'منذ {count} دقيقة',
            hoursAgo: 'منذ {count} ساعة',
            daysAgo: 'منذ {count} يوم'
        }
    },

    // Comments
    comments: {
        title: 'التعليقات',
        count: '{count} تعليق',
        noComments: 'لا توجد تعليقات بعد',
        placeholder: 'اكتب تعليقك هنا... (استخدم @ لذكر شخص)',
        internal: 'داخلي',
        public: 'عام',
        send: 'إرسال',
        sending: 'جاري الإرسال...',
        attachFile: 'إرفاق ملف',
        deleteConfirm: 'هل أنت متأكد من حذف هذا التعليق؟'
    },

    // Roles
    roles: {
        employee: 'موظف',
        manager: 'مدير',
        supervisor: 'مشرف',
        hr: 'HR',
        finance: 'مالية',
        admin: 'مسؤول',
        seniorManager: 'مدير أول',
        director: 'مدير عام'
    },

    // Time Formats
    time: {
        hours: '{count} ساعة',
        days: '{count} يوم',
        daysAndHours: '{days} يوم و {hours} ساعة',
        minutes: '{count} دقيقة',
        seconds: '{count} ثانية',
        notSpecified: 'غير محدد'
    },

    // File Sizes
    fileSize: {
        bytes: '{count} بايت',
        kb: '{count} كيلوبايت',
        mb: '{count} ميجابايت',
        gb: '{count} جيجابايت'
    },

    // Escalation
    escalation: {
        title: 'التصعيد',
        level: 'المستوى {level}',
        urgency: {
            low: 'منخفض',
            medium: 'متوسط',
            high: 'عالي',
            critical: 'حرج'
        },
        messages: {
            warning: 'تنبيه: الطلب "{title}" متأخر {hours} ساعة',
            overdue: 'عاجل: الطلب "{title}" متأخر {hours} ساعة. يتطلب تدخل فوري!',
            critical: 'حرج جداً: الطلب "{title}" متأخر {hours} ساعة. تصعيد طارئ!'
        },
        escalated: 'تم تصعيد الطلب من {from} إلى {to}',
        actionRequired: 'يرجى المراجعة والإجراء الفوري'
    },

    // Retry
    retry: {
        attempt: 'المحاولة {current} من {max}',
        retrying: 'جاري إعادة المحاولة...',
        failed: 'فشلت جميع المحاولات',
        success: 'نجحت المحاولة'
    }
};

// Type for translation keys
export type TranslationKey = typeof ar;

// Helper function to get translation
export function t(key: string, params?: Record<string, any>): string {
    const keys = key.split('.');
    let value: any = ar;

    for (const k of keys) {
        value = value?.[k];
        if (value === undefined) return key;
    }

    if (typeof value !== 'string') return key;

    // Replace parameters
    if (params) {
        return value.replace(/\{(\w+)\}/g, (_, key) => params[key] || '');
    }

    return value;
}

export default ar;
