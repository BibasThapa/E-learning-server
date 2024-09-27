import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route"
import orderRouter from "./routes/order.route";
import notificationRouter from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route"
import layoutRouter from "./routes/layout.route"
dotenv.config();

// Initialize express app
export const app = express();

// Middleware setup
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Configure CORS

app.use(cors({
    origin: ['http://localhost:3000'],
    credentials:true,
}));

// Routes
app.use('/api/v1', userRouter , orderRouter, notificationRouter, analyticsRouter, layoutRouter);
app.use('/api/v1', courseRouter)


// Test API route
app.get("/test", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});

// Unknown route handler
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});
app.use(ErrorMiddleware);
