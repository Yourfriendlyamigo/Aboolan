
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.family.list.path, async (req, res) => {
    const members = await storage.getFamilyMembers();
    res.json(members);
  });

  app.get(api.family.get.path, async (req, res) => {
    const member = await storage.getFamilyMember(Number(req.params.id));
    if (!member) {
      return res.status(404).json({ message: "Family member not found" });
    }
    res.json(member);
  });

  app.post(api.family.create.path, async (req, res) => {
    try {
      const input = api.family.create.input.parse(req.body);
      const member = await storage.createFamilyMember(input);
      res.status(201).json(member);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.family.update.path, async (req, res) => {
    try {
      const input = api.family.update.input.parse(req.body);
      const member = await storage.updateFamilyMember(Number(req.params.id), input);
      if (!member) {
         return res.status(404).json({ message: "Family member not found" });
      }
      res.json(member);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.family.delete.path, async (req, res) => {
    await storage.deleteFamilyMember(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.family.swap.path, async (req, res) => {
    try {
      const input = api.family.swap.input.parse(req.body);
      const result = await storage.swapMembers(input.id1, input.id2);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(400).json({ message: err instanceof Error ? err.message : "Swap failed" });
    }
  });

  return httpServer;
}
