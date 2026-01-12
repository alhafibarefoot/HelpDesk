'use server'

import { revalidatePath } from "next/cache";
import { processWorkflowAction, saveServiceWorkflow, getStartNode, getWorkflowDefinition, calculateStepDeadline } from "@/lib/workflow-engine";
import { WorkflowDefinition, FormSchema, ServiceLifecycleStatus, ActionType } from "@/types";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { createNotification, notifyWorkflowAction, NotificationType } from "@/lib/notifications";
import { resolveStepAssignee } from "@/lib/workflow-resolver";

export async function submitRequest(formData: any) {
  const supabase = await createClient();

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("يجب تسجيل الدخول لتقديم طلب");
  }

  // 2. Validate Service ID
  const serviceId = formData.serviceId;
  if (!serviceId) {
    throw new Error("معرف الخدمة مفقود");
  }

  // 2.5 Fetch Service Schema for Snapshot
  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .select('form_schema')
    .eq('id', serviceId)
    .single();

  if (serviceError || !serviceData) {
    throw new Error("الخدمة غير موجودة");
  }

  // 3. Generate Request Number (Simple Logic)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const requestNumber = `REQ-${dateStr}-${randomNum}`;

  // 4. Extract form fields and remove 'files' to avoid serialization issues
  const { serviceId: _sid, files: _files, ...formValues } = formData;

  try {
    // 5. Insert Request
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .insert({
        request_number: requestNumber,
        service_id: serviceId,
        requester_id: user.id,
        status: 'جديد',
        priority: formValues.priority || 'متوسط',
        form_schema_snapshot: serviceData.form_schema // Save Snapshot
      })
      .select()
      .single();

    if (requestError) {
      console.error("Request insert error:", requestError);
      return { success: false, message: `فشل إنشاء الطلب: ${requestError.message}` };
    }

    console.log("DEBUG: Request Created Successfully", request);
    if (!request) console.error("DEBUG: Request is null/undefined!");
    if (request && !request.id) console.error("DEBUG: Request ID is missing!", JSON.stringify(request));


    // 5.5 Initialize Workflow (Set Step to Start Node)
    // 5.5 Initialize Workflow (Auto-advance from Start Node)
    try {
      const adminSupabase = await createAdminClient();

      const { data: service } = await adminSupabase.from('services').select('key').eq('id', serviceId).single();
      if (service) {
        const wfDef = await getWorkflowDefinition(service.key, adminSupabase);
        const startNode = await getStartNode(service.key, wfDef || undefined, adminSupabase);

        if (startNode) {
          // 1. Set initial pointer (Start)
          // await supabase.from('requests').update({ current_step_id: startNode.id }).eq('id', request.id);

          // 2. Auto-advance (Treat Start as immediately completed)
          const nextResult = await processWorkflowAction(
            request.id,
            service.key,
            startNode.id,
            'complete',
            formValues,
            adminSupabase
          );

          // 3. Persist Next Steps (Active Steps) - USING ADMIN CLIENT
          if (nextResult.activeStepsToCreate && nextResult.activeStepsToCreate.length > 0) {
            const newStepsPayload = nextResult.activeStepsToCreate.map(s => ({
              request_id: request.id,
              step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID Placeholder
              step_key: s.stepKey, // NEW Key
              status: 'active'
            }));
            const { error: stepsError } = await adminSupabase.from('request_active_steps').insert(newStepsPayload);
            if (stepsError) console.error("Admin Steps Insert Error:", stepsError);
          }

          // 4. Create Tasks - USING ADMIN CLIENT
          if (nextResult.activeStepsToCreate && nextResult.activeStepsToCreate.length > 0) {
            const tasksToCreate: any[] = [];
            for (const s of nextResult.activeStepsToCreate) {
              if (!s.assignedRole) continue;

              let finalRole: string | null = s.assignedRole;
              let finalUser: string | null = null;

              // Resolve Assignee (Manager Chain Support)
              if (s.assignedRole) {
                try {
                  const resolution = await resolveStepAssignee(
                    request.id,
                    s.assignedRole,
                    user.id,
                    adminSupabase
                  );

                  if (resolution.assigneeId) {
                    finalUser = resolution.assigneeId;
                    finalRole = null; // Bound to user
                  } else {
                    finalRole = resolution.assigneeRole; // Keep role if generic
                  }

                } catch (resolverError: any) {
                  console.error(`[SubmitRequest] Resolver Failed: ${resolverError.message}`);
                  // CRITICAL: Fail the submission or task creation?
                  // We must FAIL to avoid stuck requests.
                  // Since we are inside a try/catch for workflow init, this will be caught below.
                  throw new Error(`تعذر تحديد المسؤول عن الخطوة التالية: ${resolverError.message}`);
                }
              }

              tasksToCreate.push({
                request_id: request.id,
                step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID Placeholder
                step_key: s.stepKey, // NEW Key
                assigned_to_role: finalRole,
                assigned_to_user: finalUser,
                status: 'pending'
              });
            }
            if (tasksToCreate.length > 0) {
              const { error: tasksError } = await adminSupabase.from('workflow_tasks').insert(tasksToCreate);
              if (tasksError) console.error("Admin Tasks Insert Error:", tasksError);
              else {
                // Notify Assignees
                for (const task of tasksToCreate) {
                  if (task.assigned_to_user) {
                    await notifyWorkflowAction(
                      task.assigned_to_user,
                      request.id,
                      'assigned',
                      requestNumber
                    );
                  }
                }
              }
            }
          }

          // 5. Update Request Status & Pointer - USING ADMIN CLIENT
          const { error: updateError } = await adminSupabase.from('requests').update({
            current_step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID Placeholder
            current_step_key: nextResult.nextStepKey, // NEW Key
            status: nextResult.nextStatus,
            step_deadline: await calculateStepDeadline(service.key, nextResult.nextStepKey, adminSupabase).then(d => d?.toISOString()).catch(() => null)
          }).eq('id', request.id);

          if (updateError) {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'debug_errors.log');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] Update Error for ${request.id}: ${JSON.stringify(updateError)}\nNextResult: ${JSON.stringify(nextResult)}\n---\n`);
            console.error("Update Request Error:", updateError);
          } else {
            // Success Log
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'debug_errors.log');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] Success! Request ${request.id} moved to ${nextResult.nextStatus}\n`);
          }

        }
      }
    } catch (wfErr: any) {
      console.error("Workflow Init Error:", wfErr);
      try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'debug_errors.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] WF Error for ${request.id}: ${wfErr.message} \nStack: ${wfErr.stack}\n---\n`);
      } catch (logErr) {
        console.error("Failed to write log", logErr);
      }
      // Fail safely, request exists but maybe stuck in 'New'
    }

    // 6. Insert Form Values (Legacy/Dual-write)
    const { error: formError } = await supabase
      .from('request_form_values')
      .insert({
        request_id: request.id,
        form_data: formValues
      });

    if (formError) {
      console.error("Form values insert error:", formError);
      // We might want to rollback the request here ideally, but for now just error.
      // throw new Error("فشل حفظ بيانات النموذج");
    }

    revalidatePath('/dashboard/user/requests');

    // Notify Requester
    await createNotification({
      userId: user.id,
      type: 'request_created',
      title: 'تم استلام الطلب',
      message: `تم استلام طلبك رقم ${requestNumber} بنجاح`,
      entityId: request.id,
      link: `/dashboard/user/requests/${request.id}`
    });

    // Log Creation Event to Timeline
    await supabase.from('request_events').insert({
      request_id: request.id,
      event_type: 'status_changed',
      new_status: 'جديد',
      performed_by: user.id,
      meta: { note: 'تم تقديم الطلب' }
    });

    return { success: true, message: "تم تقديم الطلب بنجاح", requestId: request.id };

  } catch (error: any) {
    console.error("Submit Request Error:", error);
    // Return friendly error for user, but keep log on server
    return {
      success: false,
      message: "حدث خطأ تقني غير متوقع، يرجى المحاولة لاحقًا."
    };
  }
}

// Phase 9: Update to support Parallel Workflows
export async function updateRequestStatus(requestId: string, status: string, comment?: string, stepId?: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("يجب تسجيل الدخول");
  }

  // Get User Role
  const { data: userProfile } = await adminSupabase.from('users').select('role').eq('id', user.id).single();
  const userRole = userProfile?.role;

  // 2. Fetch Request (Using Admin Client to bypass RLS)
  const { data: request, error: reqError } = await adminSupabase
    .from('requests')
    .select('*, service:services(key)')
    .eq('id', requestId)
    .single();

  if (reqError || !request) {
    throw new Error("الطلب غير موجود");
  }

  // 2.1 Verify Permissions (Manual Check since we bypassed RLS)
  const query = adminSupabase
    .from('workflow_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId)
    .eq('status', 'pending');

  // Conditionally add OR filter if roles/ids exist
  if (userRole) {
    query.or(`assigned_to_user.eq.${user.id},assigned_to_role.eq.${userRole}`);
  } else {
    query.eq('assigned_to_user', user.id);
  }

  const { count: pendingTaskCount } = await query;

  const isRequester = request.requester_id === user.id;
  const isAssigned = (request.assigned_to_user === user.id) || (request.assigned_role === userRole) || ((pendingTaskCount || 0) > 0);
  const isAdmin = ['admin', 'helpdesk_admin'].includes(userRole || '');

  if (!isRequester && !isAssigned && !isAdmin) {
    throw new Error("ليس لديك صلاحية لتعديل هذا الطلب");
  }

  const serviceKey = request.service?.key;
  if (!serviceKey) throw new Error("بيانات الخدمة غير مكتملة");

  console.log(`Processing action for request ${requestId}: ${status}`);

  // 3. Determine Action & Current Step
  let action: 'approve' | 'reject' | 'complete' = 'approve';
  if (status === 'مرفوض') action = 'reject';
  else if (status === 'مكتمل') action = 'complete';

  // Determine action
  // Determine action
  // Use provided stepId or fallback to legacy current_step_id or NEW current_step_key
  let currentStepKey = stepId || request.current_step_key || request.current_step_id;

  // FALLBACK: If step key is missing (data corruption or legacy), try to find it from active tasks or default to start
  if (!currentStepKey) {
    console.warn(`Request ${requestId} has no current_step_key. Attempting to resolve...`);

    // 1. Try to find from active tasks
    const { data: activeTask } = await supabase.from('workflow_tasks')
      .select('step_key')
      .eq('request_id', requestId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }) // Get latest
      .limit(1)
      .single();

    if (activeTask && activeTask.step_key) {
      currentStepKey = activeTask.step_key;
      console.log(`Resolved step key from task: ${currentStepKey}`);
    } else {
      // 2. Try to find from request_active_steps (Parallel Engine Source of Truth)
      const { data: activeStep } = await supabase.from('request_active_steps')
        .select('step_key')
        .eq('request_id', requestId)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (activeStep && activeStep.step_key) {
        currentStepKey = activeStep.step_key;
        console.log(`Resolved step key from active_steps: ${currentStepKey}`);
      } else {
        // 3. Last Resort: Force 'start' if we are stuck. This restarts the flow but unblocks the request.
        console.warn(`Critical: Request ${requestId} has NO active task or step. Defaulting to 'start' to unblock.`);
        currentStepKey = 'start';
      }
    }
  }

  if (!currentStepKey) throw new Error("Could not determine current step key - Data may be corrupted for this request.");

  try {
    // 4. Run Workflow Engine (Phase 9: Parallel support)
    // FORCE CLOSE OVERRIDE: If action is 'complete', we assume Administrative Force Close, skipping workflow edges.
    let result: any;

    if (action === 'complete') {
      console.log("Admin Force Close requested.");
      result = {
        nextStepKey: currentStepKey, // Stay or irrelevant
        nextStatus: 'cancelled by Admin',
        activeStepsToCreate: [],
        stepsToComplete: [currentStepKey] // Just close current
      };
      // Also we might want to close ALL active steps if we are forcing close
      // But for now, closing the current one is minimum.
      // Actually, for Force Close, we should probably fetch ALL active steps and close them.
    } else {
      result = await processWorkflowAction(
        requestId,
        serviceKey,
        currentStepKey,
        action,
        request.form_data
      );
    }

    console.log("Workflow Result:", result);

    // 4.5 Calculate Deadlines (Phase 3)
    let deadline: Date | null = null;
    try {
      deadline = await calculateStepDeadline(serviceKey, result.nextStepKey);
    } catch (e) {
      console.error("SLA Calculation failed", e);
    }

    // ---------------------------------------------------------
    // PHASE 9: PARALLEL STATE UPDATES
    // ---------------------------------------------------------

    // USE ADMIN CLIENT for secure hierarchy traversal (RLS bypass) - AND Force Close
    // Moved up to ensure we can close tasks even if not assigned to us
    const adminSupabase = await createAdminClient();

    // ---------------------------------------------------------
    // PHASE 9: PARALLEL STATE UPDATES
    // ---------------------------------------------------------

    // ---------------------------------------------------------
    // PHASE 9: PARALLEL STATE UPDATES
    // ---------------------------------------------------------

    if (action === 'complete') {
      // NUCLEAR FORCE CLOSE: Update EVERYTHING by request_id
      console.log(`Executing Nuclear Force Close for Request ${requestId}`);

      // 1. Close ALL active steps
      await adminSupabase.from('request_active_steps')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .eq('status', 'active');

      // 2. Close ALL pending tasks
      await adminSupabase.from('workflow_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .eq('status', 'pending');

    } else {
      // STANDARD WORKFLOW TRANSITION

      // 1. Mark 'currentStepKey' as completed in active_steps
      let stepsToComplete = result.stepsToComplete && result.stepsToComplete.length > 0
        ? result.stepsToComplete
        : [currentStepKey];

      await adminSupabase.from('request_active_steps')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .in('step_key', stepsToComplete);

      // 2. Insert NEW active steps
      if (result.activeStepsToCreate && result.activeStepsToCreate.length > 0) {
        const newStepsPayload = result.activeStepsToCreate.map((s: any) => ({
          request_id: requestId,
          step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID
          step_key: s.stepKey,
          status: 'active'
        }));
        await adminSupabase.from('request_active_steps').insert(newStepsPayload);
      }

      // 3. Close TASKS for completed steps
      await adminSupabase.from('workflow_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
        .in('step_key', stepsToComplete) // Close tasks by KEY
        .eq('status', 'pending');
    }

    // 4. Create NEW TASKS for new active steps
    // 4. Create NEW TASKS for new active steps
    if (result.activeStepsToCreate && result.activeStepsToCreate.length > 0) {

      const tasksToCreate: any[] = [];

      for (const s of result.activeStepsToCreate) {
        if (!s.assignedRole) continue;

        let finalRole: string | null = s.assignedRole;
        let finalUser: string | null = null;

        // --- Logic: Resolve Assignee (Manager Chain) ---
        if (s.assignedRole) {
          try {
            // Determine Requester ID (needed for chain)
            const requesterId = request.requester_id;

            const resolution = await resolveStepAssignee(
              requestId,
              s.assignedRole,
              requesterId,
              adminSupabase
            );

            if (resolution.assigneeId) {
              finalUser = resolution.assigneeId;
              finalRole = null;
            } else {
              finalRole = resolution.assigneeRole;
            }

          } catch (rErr: any) {
            console.error(`[UpdateRequest] Resolver Error: ${rErr.message}`);
            // Capture error state?
            // For now, we THROW to prevent transition.
            throw new Error(`خطأ في تعيين المسؤول: ${rErr.message}`);
          }
        }
        // -------------------------------------

        tasksToCreate.push({
          request_id: requestId,
          step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID
          step_key: s.stepKey,
          assigned_to_role: finalRole,
          assigned_to_user: finalUser,
          status: 'pending'
        });
      }

      if (tasksToCreate.length > 0) {
        const { error: tasksInsertError } = await adminSupabase.from('workflow_tasks').insert(tasksToCreate);
        if (!tasksInsertError) {
          // Notify New Assignees
          for (const task of tasksToCreate) {
            if (task.assigned_to_user) {
              await notifyWorkflowAction(
                task.assigned_to_user,
                requestId,
                'assigned',
                request.request_number || 'الطلب'
              );
            }
          }
        }
      }
    }

    // ---------------------------------------------------------

    // 5. Update Request in DB (Legacy / Main Pointer)
    console.log(`[updateRequestStatus] Final Update - RequestID: ${requestId}, NextStatus: ${result.nextStatus}`);

    const { data: updatedRows, error: updateError } = await adminSupabase
      .from('requests')
      .update({
        status: result.nextStatus,
        current_step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID
        current_step_key: result.nextStepKey, // NEW Pointer
        // updated_at removed due to schema mismatch
        step_deadline: deadline ? deadline.toISOString() : null, // Set deadline
        sla_status: 'on_time' // Reset status on new step
      })
      .eq('id', requestId)
      .select('id'); // Select to verify update happened

    if (updateError) {
      console.error("[updateRequestStatus] Final Update ERROR:", updateError);
      throw updateError;
    }
    const count = updatedRows?.length;
    console.log(`[updateRequestStatus] Final Update Success. Rows modified: ${count}`);

    // Notify Requester about Status Change
    if (count && count > 0) {
      let actionType: 'approved' | 'rejected' | 'completed' | null = null;
      if (action === 'approve') actionType = 'approved';
      else if (action === 'reject') actionType = 'rejected';
      else if (action === 'complete' || result.nextStatus === 'مكتمل') actionType = 'completed';

      if (actionType) {
        await notifyWorkflowAction(
          request.requester_id,
          requestId,
          actionType,
          request.request_number || 'الطلب'
        );
      }
    }


    // 6. Audit Log
    try {
      let actionType: ActionType = 'تحديث';
      if (action === 'approve') actionType = 'اعتماد';
      if (action === 'reject') actionType = 'رفض';
      if (action === 'complete') actionType = 'إغلاق';

      await supabase.from('request_actions').insert({
        request_id: requestId,
        actor_id: user.id,
        action_type: actionType,
        from_step_key: currentStepKey,
        to_step_key: result.nextStepKey,
        // Legacy fallback
        from_step_id: '00000000-0000-0000-0000-000000000000',
        to_step_id: '00000000-0000-0000-0000-000000000000',
        comment: comment
      });

      // 6.5 New Rich Audit Log
      await supabase.from('request_events').insert({
        request_id: requestId,
        step_id: '00000000-0000-0000-0000-000000000000', // Legacy UUID
        event_type: 'status_change',
        performed_by: user.id,
        payload: {
          action: action,
          from_status: request.status,
          to_status: result.nextStatus,
          comment: comment,
          parallel_branches: result.activeStepsToCreate.map((s: any) => s.stepId)
        }
      });
    } catch (logError) {
      console.error("Error logging action", logError)
    }

    return { success: true, message: "تم تحديث حالة الطلب بنجاح" };

  } catch (error: any) {
    console.error("Workflow Error:", error);
    return { success: false, message: `فشل معالجة الطلب: ${error.message}` };
  }
}

export async function updateRequestFormData(requestId: string, formData: any) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('requests')
    .update({
      form_data: formData
      // updated_at removed due to schema mismatch
    })
    .eq('id', requestId);

  if (error) {
    console.error("Update Form Data Error:", error);
    return { success: false, message: "فشل تحديث بيانات النموذج" };
  }

  // Also update legacy table if needed, or rely on requests.form_data
  await supabase
    .from('request_form_values')
    .update({ form_data: formData })
    .eq('request_id', requestId);

  revalidatePath(`/dashboard/admin/requests/${requestId}`);

  // Log Event
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('request_events').insert({
      request_id: requestId,
      event_type: 'field_update',
      performed_by: user.id,
      payload: {
        message: "تم تحديث بيانات النموذج"
      }
    });
  }

  return { success: true, message: "تم حفظ التغييرات بنجاح" };
}

export async function reassignRequest(requestId: string, newUserId: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // 1. Get current user (Actor)
  const { data: { user: actor } } = await supabase.auth.getUser();
  if (!actor) throw new Error("Unauthorized");

  // 2. Find Pending Tasks
  const { data: tasks, error: fetchError } = await adminSupabase
    .from('workflow_tasks')
    .select('id, step_key')
    .eq('request_id', requestId)
    .eq('status', 'pending');

  if (fetchError) {
    console.error("Error fetching tasks:", fetchError);
    return { success: false, message: "خطأ في جلب المهام" };
  }

  let targetTaskIds: string[] = [];

  if (!tasks || tasks.length === 0) {
    // FALLBACK: If request is active but has no tasks (e.g. stalled workflow), create a generic task
    // Check if request is not completed/rejected
    const { data: req } = await adminSupabase.from('requests').select('status, current_step_key').eq('id', requestId).single();

    // Allow 'pending' logic for requests that are not in final states
    if (req && !['مكتمل', 'مرفوض', 'mlghi', 'cancelled'].includes(req.status || '')) {
      console.log("Reassign: No pending tasks found, creating force-task for:", requestId);

      // Insert new task for this user
      const { data: newTask, error: insertError } = await adminSupabase.from('workflow_tasks').insert({
        request_id: requestId,
        step_key: req.current_step_key || 'unknown',
        assigned_to_user: newUserId,
        status: 'pending',
        step_id: '00000000-0000-0000-0000-000000000000'
      }).select('id').single();

      if (insertError) {
        return { success: false, message: "فشل إنشاء مهمة للمستخدم الجديد: " + insertError.message };
      }
      // If we created a task, we are done
      targetTaskIds = []; // No updates needed on existing tasks (since none existed)

      // Also update request table fallback to ensure visibility
      await adminSupabase.from('requests').update({ assigned_to_user: newUserId, updated_at: new Date().toISOString() }).eq('id', requestId);
    } else {
      return { success: false, message: "لا يوجد مهام نشطة لهذا الطلب (قد يكون مكتملاً أو ملغياً)" };
    }
  } else {
    targetTaskIds = tasks.map(t => t.id);
  }

  // 3. Update Tasks (if any existed previously)
  if (targetTaskIds.length > 0) {
    const { error: updateError } = await adminSupabase
      .from('workflow_tasks')
      .update({
        assigned_to_user: newUserId,
        assigned_to_role: null, // Clear role to enforce user assignment
        // updated_at column does not exist in this table schema
      })
      .in('id', targetTaskIds);

    if (updateError) {
      console.error("Reassign Error:", updateError);
      return { success: false, message: "فشل تحديث المسؤول: " + (updateError.message || JSON.stringify(updateError)) };
    }
  }

  // 4. Log Event
  await supabase.from('request_events').insert({
    request_id: requestId,
    event_type: 'reassigned',
    performed_by: actor.id,
    payload: {
      new_assignee_id: newUserId,
      message: "تم تحويل الطلب يدوياً بواسطة المسؤول"
    }
  });

  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/user/requests'); // Update user lists too

  return { success: true, message: "تم تحويل الطلب بنجاح" };
}

export async function saveWorkflow(serviceKey: string, definition: WorkflowDefinition) {
  // Add backend validation or saving logic here if needed beyond just the engine
  await new Promise((resolve) => setTimeout(resolve, 500));
  await saveServiceWorkflow(serviceKey, definition);
  return { success: true };
}

export async function saveGeneratedService(
  serviceName: string,
  serviceKey: string,
  workflow: WorkflowDefinition,
  form: FormSchema
) {
  const supabase = await createClient();

  try {
    console.log('[Save Service] Starting...', { serviceName, serviceKey });

    // Check if service already exists
    const { data: existingService, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('key', serviceKey)
      .maybeSingle();

    if (fetchError) {
      console.error('[Save Service] Error fetching service:', fetchError);
      throw new Error(`فشل التحقق من الخدمة: ${fetchError.message}`);
    }

    let serviceId;

    if (existingService) {
      console.log('[Save Service] Updating existing service:', existingService.id);

      // Update service details
      const { error: updateError } = await supabase
        .from('services')
        .update({
          name: serviceName,
          description: `خدمة ${serviceName} - تم إنشاؤها بواسطة المساعد الذكي`,
          form_schema: form,
        })
        .eq('id', existingService.id);

      if (updateError) {
        console.error('[Save Service] Update error:', updateError);
        throw new Error(`فشل تحديث الخدمة: ${updateError.message}`);
      }

      serviceId = existingService.id;
    } else {
      console.log('[Save Service] Creating new service');

      // Create new service
      const { data: newService, error: insertError } = await supabase
        .from('services')
        .insert({
          key: serviceKey,
          name: serviceName,
          description: `خدمة ${serviceName} - تم إنشاؤها بواسطة المساعد الذكي`,
          is_active: false,
          status: 'draft',
          default_sla_hours: 24,
          form_schema: form,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Save Service] Insert error:', insertError);
        throw new Error(`فشل إنشاء الخدمة: ${insertError.message}`);
      }

      serviceId = newService.id;
      console.log('[Save Service] Created service with ID:', serviceId);
    }

    // Now save the workflow using service ID directly (no lookup needed)
    console.log('[Save Service] Saving workflow for service ID:', serviceId);

    // Save workflow directly using service ID
    const supabase2 = await createClient();
    const { data: existingWorkflow } = await supabase2
      .from('workflows')
      .select('id')
      .eq('service_id', serviceId)
      .maybeSingle();

    if (existingWorkflow) {
      console.log('[Save Service] Updating existing workflow');
      const { error: updateError } = await supabase2
        .from('workflows')
        .update({ definition: workflow })
        .eq('id', existingWorkflow.id);

      if (updateError) {
        console.error('[Save Service] Workflow update error:', updateError);
        throw new Error(`فشل تحديث سير العمل: ${updateError.message}`);
      }
    } else {
      console.log('[Save Service] Creating new workflow');
      const { error: insertError } = await supabase2
        .from('workflows')
        .insert({
          service_id: serviceId,
          name: `Workflow for ${serviceKey}`,
          definition: workflow,
          is_active: true
        });

      if (insertError) {
        console.error('[Save Service] Workflow insert error:', insertError);
        throw new Error(`فشل إنشاء سير العمل: ${insertError.message}`);
      }
    }

    // Revalidate paths
    revalidatePath('/dashboard/admin/services');
    revalidatePath('/');

    console.log('[Save Service] Success!');
    return { success: true, serviceId: serviceId, message: 'تم حفظ الخدمة بنجاح!' };

  } catch (error) {
    console.error('[Save Generated Service] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    throw new Error(`خطأ في حفظ الخدمة: ${errorMessage}`);
  }
}

export async function getWorkflowTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workflow_templates')
    .select('*')
    .order('usage_count', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  return data;
}

export async function saveWorkflowTemplate(templateData: any) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workflow_templates')
    .insert(templateData)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateServiceDetails(serviceId: string, details: { name: string; description?: string; icon?: string }) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .update(details)
    .eq('id', serviceId);

  if (error) {
    console.error('[updateServiceDetails] Error:', error);
    throw new Error(`Failed to update service details: ${error.message}`);
  }

  revalidatePath('/dashboard/admin/services');
  revalidatePath(`/dashboard/admin/services/${serviceId}`); // invalidating specific service path if we used ID
  // We should also invalidate key path if key was changed, but we aren't changing KEY here.
}

export async function updateServiceFormSchema(serviceKey: string, schema: FormSchema) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .update({ form_schema: schema })
    .eq('key', serviceKey);

  if (error) {
    console.error('[updateServiceFormSchema] Error:', error);
    throw new Error(`Failed to update form schema: ${error.message} (Code: ${error.code})`);
  }

  revalidatePath(`/dashboard/admin/services/${serviceKey}/form`);
  revalidatePath(`/requests/new/${serviceKey}`);
}

export async function updateServiceStatus(serviceId: string, status: ServiceLifecycleStatus) {
  const supabase = await createClient();
  const is_active = status === 'active';

  const { error } = await supabase
    .from('services')
    .update({ status, is_active })
    .eq('id', serviceId);

  if (error) throw new Error(`Failed to update service status: ${error.message}`);
  revalidatePath('/dashboard/admin/services');
}

export async function archiveService(serviceId: string) {
  const supabase = await createClient();

  // First verify permissions or if service exists? (Optional)

  const { error } = await supabase
    .from('services')
    .update({
      status: 'archived',
      is_active: false,
      // Optionally append (مؤرشف) to name if needed, but status is better filter
    })
    .eq('id', serviceId);

  if (error) {
    console.error("Archive Service Error:", error);
    throw new Error(`فشل أرشفة الخدمة: ${error.message}`);
  }

  revalidatePath('/dashboard/admin/services');
}

export async function restoreService(serviceId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .update({
      status: 'draft', // Restore to draft to be safe
      is_active: false
    })
    .eq('id', serviceId);

  if (error) {
    console.error("Restore Service Error:", error);
    throw new Error(`فشل استعادة الخدمة: ${error.message}`);
  }

  revalidatePath('/dashboard/admin/services');
}

export async function deleteService(serviceId: string) {
  const supabase = await createClient();

  // Check if there are requests for this service (safety check)
  const { count, error: countError } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', serviceId);

  if (countError) {
    throw new Error(`فشل التحقق من ارتباطات الخدمة: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error("لا يمكن حذف هذه الخدمة لوجود طلبات مرتبطة بها. قم بأرشفتها بدلاً من ذلك.");
  }

  // Proceed with delete
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) {
    console.error("Delete Service Error:", error);
    throw new Error(`فشل حذف الخدمة: ${error.message}`);
  }

  revalidatePath('/dashboard/admin/services');
}

export async function withdrawRequest(requestId: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("يجب تسجيل الدخول");
  }

  // 2. Fetch Request to validate ownership and state
  const { data: request, error: reqError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !request) {
    throw new Error("الطلب غير موجود");
  }

  // 3. Validate Ownership
  if (request.requester_id !== user.id) {
    throw new Error("ليس لديك صلاحية لسحب هذا الطلب");
  }

  // 4. Validate State (Business Rule: No actions taken yet)
  // We check if status is 'new' or 'pending' AND if there are no downstream events
  const { count, error: eventsError } = await adminSupabase
    .from('request_events')
    .select('*', { count: 'exact', head: true })
    .eq('request_id', requestId)
    .eq('event_type', 'status_changed')
    .neq('new_status', 'جديد'); // Any status change AFTER creation

  if (eventsError) throw new Error("فشل التحقق من حالة الطلب");

  // If there are status changes beyond creation, we cannot withdraw
  if (count && count > 0) {
    throw new Error("لا يمكن سحب الطلب لأنه قيد المعالجة بالفعل");
  }

  // Also check if current status is final just in case
  if (['m_approved', 'approved', 'completed', 'rejected', 'cancelled'].includes(request.status)) {
    throw new Error("لا يمكن سحب الطلب في حالته الحالية");
  }

  // 5. Build Payload to Cancel
  // We just set status to 'cancelled' (or 'withdrawn')
  const { error: updateError } = await adminSupabase
    .from('requests')
    .update({
      status: 'cancelled'
    })
    .eq('id', requestId);

  if (updateError) {
    throw new Error("فشل تحديث حالة الطلب");
  }

  // 6. Log Event
  await adminSupabase.from('request_events').insert({
    request_id: requestId,
    event_type: 'status_changed',
    new_status: 'cancelled',
    performed_by: user.id,
    meta: { note: 'قام مقدم الطلب بسحبه' }
  });

  revalidatePath(`/dashboard/user/requests/${requestId}`);
  return { success: true, message: "تم سحب الطلب بنجاح" };
}

// -----------------------------------------------------------------------------
// CLONE REQUEST HELPER
// -----------------------------------------------------------------------------
export async function getCloneData(requestId: string) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "يجب تسجيل الدخول" };
  }

  // 2. Fetch Request Metadata (Service ID & Owner only)
  // We avoid selecting 'form_data' here because in some environments/legacy schemas it lives in a separate table.

  const { data: request, error: reqError } = await adminSupabase
    .from('requests')
    .select('service_id, requester_id')
    .eq('id', requestId)
    .single();

  if (reqError) {
    // console.error(`[getCloneData] Request Fetch Error:`, reqError);
  }

  if (reqError || !request) {
    const detail = reqError ? `${reqError.message} (Code: ${reqError.code})` : "Request not found";
    return { success: false, message: `فشل استرجاع الطلب: ${detail}` };
  }


  // 3. Strict Ownership Check
  if (request.requester_id !== user.id) {
    return { success: false, message: "ليس لديك صلاحية لنسخ هذا الطلب" };
  }

  // 4. Fetch Form Data from 'request_form_values' table (Legacy Support)
  // Even if the schema is updated later, this is safe if we fallback properly
  const { data: formDataRecord, error: formError } = await adminSupabase
    .from('request_form_values')
    .select('form_data')
    .eq('request_id', requestId)
    .single();

  if (formError) {
    console.error(`[getCloneData] Form Data Fetch Error:`, formError);
    // If table doesn't exist or row missing, we might want to fail gracefully or warn
    // For now, let's report it if it's a strict error, but if just missing row, maybe empty object?
    // Let's return error to be safe.
    return { success: false, message: `فشل استرجاع بيانات النموذج: ${formError.message}` };
  }

  // 5. Return Data
  return {
    success: true,
    data: {
      service_id: request.service_id,
      form_data: formDataRecord?.form_data || {}
    }
  };
}

export async function uploadFile(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get('file') as File;
  const requestId = formData.get('requestId') as string;

  if (!file) throw new Error("الملف مفقود");

  const fileName = `${requestId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('request-attachments')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('request-attachments')
    .getPublicUrl(fileName);

  return { url: publicUrl, name: file.name };
}
