import { createLayout, editLayout, getLayoutByType } from "../controllers/layout.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth"
import express from "express"

const layoutRouter = express.Router();
layoutRouter.post("/create-layout", isAuthenticated, authorizeRoles("admin"), createLayout);
layoutRouter.post("/edit-layout", isAuthenticated, authorizeRoles("admin"), editLayout);
layoutRouter.get("/get-layout/:type",  getLayoutByType);

export default layoutRouter;