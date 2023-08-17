import express from "express";

import { dataBaseMigration } from "../migration/migration.js";

const router = express.Router();

router.post("/", dataBaseMigration);

export default router;
