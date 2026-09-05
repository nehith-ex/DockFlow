import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createProcurementRequest, listProcurementRequests, procurementRowToRecord, serializeProcurementRun } from "./db";
import { defaultScenario, runDecisionEngine } from "../shared/dockflow";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  decision: router({
    run: publicProcedure
      .input(z.object({
        request: z.object({
          cargo: z.string(),
          quantity: z.number(),
          origin: z.string(),
          destination: z.string(),
          arrivalWindow: z.string(),
          vesselClass: z.string(),
          maxDraft: z.number(),
          minDwt: z.number(),
          cargoSensitivity: z.enum(["standard", "fragile", "hazardous"]),
        }),
        scenario: z.object({ freight: z.number(), congestion: z.number(), fuel: z.number(), demand: z.number() }).default(defaultScenario),
        strategy: z.enum(["cost", "delivery", "risk", "balanced"]).default("balanced"),
      }))
      .mutation(({ input }) => {
        const result = runDecisionEngine(input.request, input.scenario, input.strategy);
        if (!result.validation.valid) throw new TRPCError({ code: "BAD_REQUEST", message: Object.values(result.validation.errors)[0] ?? "Invalid procurement request" });
        return result;
      }),
  }),
  procurement: router({
    create: publicProcedure
      .input(z.object({
        request: z.object({
          cargo: z.string(),
          quantity: z.number(),
          origin: z.string(),
          destination: z.string(),
          arrivalWindow: z.string(),
          vesselClass: z.string(),
          maxDraft: z.number(),
          minDwt: z.number(),
          cargoSensitivity: z.enum(["standard", "fragile", "hazardous"]),
        }),
        scenario: z.object({ freight: z.number(), congestion: z.number(), fuel: z.number(), demand: z.number() }).default(defaultScenario),
        strategy: z.enum(["cost", "delivery", "risk", "balanced"]).default("balanced"),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = runDecisionEngine(input.request, input.scenario, input.strategy);
        if (!result.validation.valid) throw new TRPCError({ code: "BAD_REQUEST", message: Object.values(result.validation.errors)[0] ?? "Invalid procurement request" });
        const serialized = serializeProcurementRun(input.request, result);
        await createProcurementRequest({
          ownerOpenId: ctx.user?.openId ?? "demo-user",
          status: "complete",
          ...serialized,
        });
        return result;
      }),
    history: publicProcedure.query(async ({ ctx }) => {
      const rows = await listProcurementRequests(ctx.user?.openId ?? "demo-user");
      return rows.map(procurementRowToRecord);
    }),
  }),
});

export type AppRouter = typeof appRouter;
