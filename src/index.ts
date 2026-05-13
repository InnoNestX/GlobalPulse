import type { Env } from "./env";
import { handleRequest } from "./http";
import { runDueSchedules } from "./scheduler";
import { AppStateDurableObject } from "./app-state-do";

export { AppStateDurableObject };

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDueSchedules(env, new Date(controller.scheduledTime)));
  },
};
