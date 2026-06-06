import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterSchema, LoginSchema } from "../validators";

const router = Router();
const authService = new AuthService();

router.post("/auth/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await authService.register(data.email, data.password, data.name);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
