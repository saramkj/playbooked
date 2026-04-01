import { type Prisma } from "@prisma/client";
import express from "express";
import { prisma } from "../lib/prisma.js";
import { parseTemplateChecklistItems } from "../lib/playbooks.js";
import { requireAuth } from "../middlewares/auth.js";

const templatesRouter = express.Router();

function serializeTemplate(template: {
  id: string;
  name: string;
  templateType: string;
  version: number;
  checklistItemsJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    template_id: template.id,
    name: template.name,
    template_type: template.templateType,
    version: template.version,
    checklist_items: parseTemplateChecklistItems(template.checklistItemsJson),
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}

templatesRouter.use(requireAuth);

templatesRouter.get("/", async (_req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ name: "asc" }, { version: "asc" }],
    });

    res.status(200).json({
      data: templates.map(serializeTemplate),
    });
  } catch (error) {
    next(error);
  }
});

export { templatesRouter };
