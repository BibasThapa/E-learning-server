import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import OrderModel,{IOrder} from "../models/orderModel";
import userModel from "../models/user.models";
import CourseModel, { ICourse } from "../models/course.model";
import path from "path"
import ejs from "ejs"
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notificationModel";
import { getAllOrdersService, newOrder } from "../services/order.service";
import { redis } from "../utils/redis";

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
export const createOrder = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
    try {
        const {courseId, payment_info} = req.body as IOrder;
        if(payment_info){
          if("id" in payment_info){
            const paymentIntentId = payment_info.id;
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentIntentId
            );
            if(paymentIntent.status !== "succeeded"){
              return next(new ErrorHandler("Payment not authorized!",400));
            }
          }
        }
        const user = await userModel.findById(req.user?._id);
        const courseExistInUser = user?.courses.some((course:any)=> course._id.toString() === courseId);
      console.log("testing",courseExistInUser)

        if(courseExistInUser){
            return next(new ErrorHandler("You have already purchased this course", 400));
        }
        const course: ICourse | null = await CourseModel.findById(courseId);
      console.log("course",course)

        if(!course){
            return next(new ErrorHandler("Course not found",404))
        }
        const data: any = {
            courseId: course._id,
            userId: user?._id,
        };
        
        const mailData = {
            order: {
              _id: course._id?.toString().slice(0, 6), // Shortened order ID from course ID
              name: course.name, // Course name
              price: course.price, // Course price
              date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) // Order date
            }
          };
        
          // Render the EJS file with the mailData
          const html = await ejs.renderFile(
            path.join(__dirname, "../mails/order-confirmation.ejs"), 
            {order:mailData}
          );
          try {
            if(user){
                await sendMail({
                    email:user.email  ,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData,
                })
            }
          } catch (error:any) {
            return next (new ErrorHandler(error.message,500))
          }
          user?.courses.push({courseId: course._id as string});
          await redis.set(req.user?.id,JSON.stringify(user))
          await user?.save();
           await NotificationModel.create({
            user:user?._id,
            title:"New Order",
            message:`You have a new order from ${course?.name}`,
          })

          course.purchased = course.purchased + 1 ;
          
          await course.save();
          
          newOrder(data,res,next)
          

    } catch (error:any) {
      console.log("This is error",error)
        return next(new ErrorHandler(error.message,500))
    }
})

export const getAllOrders= CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
  try {
      getAllOrdersService(res)
  } catch (error:any) {
      return next(new ErrorHandler(error.message, 400))
  }
})

export const sendStripePublishableKey = CatchAsyncError(async(req:Request, res:Response)=>{
  res.status(200).json ({
    publishablekey: process.env.STRIPE_PUBLISHABLE_KEY
  })
})

export const newPayment = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
  try {
    const myPayment = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency:"usd",
      metadata:{
        company:"E-Learning"
      }, automatic_payment_methods:{
        enabled:true,
      }
    }); 
    res.status(201).json({
      success:true,
      client_secret: myPayment.client_secret
    })
  } catch (error:any) {
    return next(new ErrorHandler(error.message, 500))
  }
})
