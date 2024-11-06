import {Request, Response,NextFunction} from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary"

export const createLayout = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{
    try {
        const {type} =req.body;

        const isTypeExist = await LayoutModel.findOne({type});
        if(isTypeExist){
            return next(new ErrorHandler(`${type} already exist`, 400))
        }
        if(type === "Banner"){
            const {image, title, subTitle} =req.body;
            const myCloud = await cloudinary.v2.uploader.upload(image,{
                folder: "layout"
            });
            const banner ={
                image:{
                    type:"Banner",
                    banner:{
                        image:{
                            public_id: myCloud.public_id,
                            url:myCloud.secure_url,
                        },
                        title,
                        subTitle,
                    }
                   
                },
                title,
                subTitle
            }
            await LayoutModel.create(banner)
        }
        if(type==="FAQ"){
            const{faq} =req.body;
            await LayoutModel.create(faq)
        }
        if(type==="Categories"){
            const{categories} = req.body;
           await LayoutModel.create(categories)
        }
        res.status(200).json({
            success:true,
            message:"Layout Update Succesfully"
        })
    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
        
    }
})


export const editLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;

        if (type === "Banner") {
            const bannerData: any = await LayoutModel.findOne({ type: "Banner" });
            const { image, title, subTitle } = req.body;

            const data = image.startsWith("https") ? bannerData.image : await cloudinary.v2.uploader.upload(image, {
                folder: "layout",
            });

            const banner = {
                type: "Banner",
                image: {
                    public_id: image.startsWith("https") ? bannerData.image.public_id : data.public_id,
                    url: image.startsWith("https") ? bannerData.image.url : data.secure_url,
                },
                title,
                subTitle,
            };

            await LayoutModel.findByIdAndUpdate(
                bannerData?._id,
                banner,
                { upsert: true, new: true }
            );
        }

        if (type === "FAQ") {
            const { faq } = req.body;
            let faqData = await LayoutModel.findOne({ type: "FAQ" });

            if (!faqData) {
                // Create a new FAQ layout if none exists
                faqData = await LayoutModel.create({ type: "FAQ", faq: [] });
            }

            const faqItems = await Promise.all(faq.map(async (item: any) => ({
                question: item.question,
                answer: item.answer,
            })));

            await LayoutModel.findByIdAndUpdate(
                faqData._id,
                { type: "FAQ", faq: faqItems },
                { upsert: true, new: true }
            );
        }

        if (type === "Categories") {
            const { categories } = req.body;
            let categoriesData = await LayoutModel.findOne({ type: "Categories" });

            if (!categoriesData) {
                // Create a new Categories layout if none exists
                categoriesData = await LayoutModel.create({ type: "Categories", categories: [] });
            }

            const categoriesItems = categories.map((item: any) => ({
                title: item.title,
            }));

            await LayoutModel.findByIdAndUpdate(
                categoriesData._id,
                { type: "Categories", categories: categoriesItems },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: "Layout updated successfully",
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



export const getLayoutByType = CatchAsyncError(async(req:Request, res:Response, next:NextFunction)=>{ 
    try {
        const {type}= req.params;
        const layout = await LayoutModel.findOne({type});
        res.status(201).json({
            success: true,
            layout,
        })
    } catch (error:any) {
        return next(new ErrorHandler(error.message,500))
        
    }
})
