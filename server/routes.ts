
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

  // Seed the database
  await seedDatabase();

  return httpServer;
}

// Seed function to create initial grandparents if empty
async function seedDatabase() {
  const existing = await storage.getFamilyMembers();
  if (existing.length === 0) {
    // Create Grandparents
    const grandpa = await storage.createFamilyMember({
      name: "Grandpa John",
      phoneNumber: "555-0100",
      isDeceased: false,
    });
    
    const grandma = await storage.createFamilyMember({
      name: "Grandma Mary",
      phoneNumber: "555-0101",
      isDeceased: false,
    });

    // Create Children
    await storage.createFamilyMember({
      name: "Uncle Bob",
      parentId: grandpa.id,
      phoneNumber: "555-0102",
      isDeceased: false,
    });

    await storage.createFamilyMember({
      name: "Aunt Alice",
      parentId: grandma.id,
      phoneNumber: "555-0103",
      isDeceased: true, // Example deceased
    });
  }
}
