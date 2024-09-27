import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import { generateLast12MothsData } from "../utils/analytics.generator"; // Fixed function name
import userModel from "../models/user.models";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import OrderModel from "../models/orderModel";


export const getUsersAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    
    const users = await generateLast12MothsData(userModel); 

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error: any) {
    
    return next(new ErrorHandler(error.message, 500));
  }
});


export const getCoursesAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
      
      const courses = await generateLast12MothsData(CourseModel); 
  
      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      
      return next(new ErrorHandler(error.message, 500));
    }
  });

  export const getOrdersAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
      
      const orders = await generateLast12MothsData(OrderModel); 
  
      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error: any) {
      
      return next(new ErrorHandler(error.message, 500));
    }
  });