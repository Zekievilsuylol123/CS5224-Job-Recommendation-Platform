// src/routes/resume.ts
import express from "express";
import multer from "multer";
import { extract_resume_info, ProfileSchema } from "../resume/llm_analyzer.js";
import { scoreCompass } from "../scoreCompass.js";
import { isAllowedResumeMime } from "../resume/analyzer.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /resume/analyze
router.post("/resume/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }
    if (!isAllowedResumeMime(req.file.mimetype)) {
      return res.status(415).json({ error: "Unsupported file type" });
    }

    // call LLM_analyzer
    const outputText = await extract_resume_info(req.file);

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(outputText);
    } catch {
      return res.status(502).json({ error: "LLM returned non-JSON output", raw: outputText });
    }

    const profileNode = parsedJson?.profile ?? parsedJson;
    const safe = ProfileSchema.safeParse(profileNode);
    if (!safe.success) {
      return res.status(422).json({ error: "Invalid LLM output", issues: safe.error.issues });
    }

    const profile = safe.data;
    const score = scoreCompass({ user: profile, job: undefined });

    const tips: string[] = [];
    if (!profile.skills?.length) tips.push("Add a dedicated Skills section.");
    if (!profile.yearsExperience) tips.push("Call out years of experience.");
    if (!(profile as any).expectedSalarySGD) tips.push("Include expected salary.");

    return res.json({ profile, score, tips });
  } catch (err: any) {
    console.error("LLM analyze error:", err);
    res.status(500).json({ error: err.message || "Analyze failed" });
  }
});

export default router;
