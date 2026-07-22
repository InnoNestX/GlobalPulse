import type { Env } from "./env";
import { handleRequest } from "./http";
import { runDueSchedules } from "./scheduler";
import { runAutopilotRadar } from "./autopilot";
import { saveLastCronState } from "./diagnostics";
import { AppStateDurableObject } from "./app-state-do";

export { AppStateDurableObject };

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      const now = new Date(controller.scheduledTime);
      try {
        const result = await runDueSchedules(env, now);
        const autopilot = await runAutopilotRadar(env, now).catch((error) => {
          console.warn("Autopilot radar failed", error);
          return { checked: 0, triggered: 0, skipped: 0, triggers: [] };
        });
        await saveLastCronState(env, {
          at: now.toISOString(),
          checked: result.checked,
          executed: result.executed,
          skipped: result.skipped,
          ok: true,
          message: `checked=${result.checked} executed=${result.executed} skipped=${result.skipped}; autopilot triggered=${autopilot.triggered}`,
        });
      } catch (error) {
        await saveLastCronState(env, {
          at: now.toISOString(),
          checked: 0,
          executed: 0,
          skipped: 0,
          ok: false,
          message: error instanceof Error ? error.message : "Cron run failed",
        });
        throw error;
      }
    })());
  },
};
