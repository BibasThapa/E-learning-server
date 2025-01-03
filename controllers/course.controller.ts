import { NextFunction, Request, Response } from "express"
import { CatchAsyncError } from "../middleware/catchAsyncErrors"
import ErrorHandler from "../utils/ErrorHandler"
import cloudinary from "cloudinary"
import { createCourse, getAllCoursesService } from "../services/course.service"
import CourseModel from "../models/course.model"
import { redis } from "../utils/redis"
import ejs from "ejs";
import path from 'path';
import sendMail from "../utils/sendMail";
import mongoose from 'mongoose';
import NotificationModel from "../models/notificationModel";
import axios from "axios";
import userModel from "../models/user.models"

export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            })
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
        createCourse(data, res, next);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = await CourseModel.findById(courseId) as any;


        if (thumbnail && typeof thumbnail === 'string' && !thumbnail.startsWith("https")) {

            await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        } else if (thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith("https")) {
            // If the thumbnail is a valid URL, keep the existing thumbnail data
            data.thumbnail = {
                public_id: courseData?.thumbnail.public_id,
                url: courseData?.thumbnail.url,
            };
        }

        const course = await CourseModel.findByIdAndUpdate(courseId, {
            $set: data,
        }, { new: true });

        res.status(201).json({
            success: true,
            course,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;
        const isCacheExist = await redis.get(courseId);
        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            })
        } else {
            const course = await CourseModel.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.questionns -courseData.links")
            await redis.set(courseId, JSON.stringify(course), "EX", 604800);
            res.status(200).json({
                success: true,
                course,
            })
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})
export const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {


        const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questionns -courseData.links");
        await redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({
            success: true,
            courses,
        })
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})

export const getCourseByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id
        const currentUser = await userModel.findById(userId)
        const userCourseList = currentUser?.courses;
        const courseId = req.params.id;
        console.log("userCourseList", currentUser);
        console.log("courseId", courseId)

        const courseExists = userCourseList?.find((course: any) => course.courseId === courseId);
        if (!courseExists) {
            return next(new ErrorHandler("You are not eligible to access this course", 400));
        }
        const course = await CourseModel.findById(courseId);
        const content = course?.courseData;
        res.status(200).json({
            success: true,
            content,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})
interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, courseId, contentId }: IAddQuestionData = req.body;
        const course = await CourseModel.findById(courseId);
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid content id", 400))
        }
        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler("Invalid content id", 400))
        }
        const newQuestion: any = {
            user: req.user,
            question,
            questionReplies: [],
        };
        courseContent.questions.push(newQuestion);
        await NotificationModel.create({
            user: req.user?._id,
            title: "New Question Received",
            message: `You have a new question in ${courseContent.title}`,
        })
        await course?.save();
        res.status(200).json({
            success: true,
            course,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})
interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body;
        const course = await CourseModel.findById(courseId);
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid content id", 400))
        }
        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler("Invalid content id", 400))
        }
        const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId));
        if (!question) {
            return next(new ErrorHandler("Invalid question id", 400));
        }

        const newAnswer: any = {
            user: req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        question.questionReplies.push(newAnswer);
        await course?.save();
        if (req.user?._id === question.user._id) {
            await NotificationModel.create({
                user: req.user?._id,
                title: "New Question Reply Received",
                message: `You have a new question  reply in ${courseContent.title}`,
            })
        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title,
                question: question.question, 
                answer,
            }
            const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);
            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Question Reply",
                    template: "question-reply.ejs",
                    data,
                })
            } catch (error: any) {
                return next(new ErrorHandler(error.message, 500))
            }
            res.status(200).json({
                success: true,
                course,
            })
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

interface IAddReviewData {
    review: string;
    courseId: string;
    rating: number;
    userId: string;
}
export const addReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;

        if (!courseId) {
            return next(new ErrorHandler("Invalid course ID", 400));
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("Course not found", 404));
        }

        const { review, rating } = req.body as IAddReviewData;
        const reviewData: any = {
            user: req.user,  // or req.user?._id if only ID is needed
            comment: review,
            rating,
        };

        course.reviews.push(reviewData);

        // Calculate average rating
        const totalRating = course.reviews.reduce((sum, rev) => sum + rev.rating, 0);
        course.ratings = totalRating / course.reviews.length;

        await course.save();
        await redis.set(courseId, JSON.stringify(course), 'EX', 604800);

        await NotificationModel.create({
            user: req.user?._id,
            title: "New Review Received",
            message: `${req.user?.name} has given a review for ${course.name}`,
        });

        res.status(200).json({
            success: true,
            course,
        });
    } catch (error: any) {
        return next(new ErrorHandler("An error occurred while adding the review", 500));
    }
});



interface IAddReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
}
export const addReplyToReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { comment, courseId, reviewId } = req.body as IAddReviewData;
        const course = await CourseModel.findById(courseId)
        if (!course) {
            return next(new ErrorHandler("Review not found", 400));
        }
        const review = course?.reviews?.find((rev: any) => rev._id.toString() === reviewId);
        if (!review) {
            return next(new ErrorHandler("Review not found", 400))
        }
        const replyData: any = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies?.push(replyData);
        await course?.save();
        await redis.set(courseId, JSON.stringify(course), 'EX', 604800);
        res.status(200).json({
            success: true,
            course,
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


export const generateVideoUrl = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { videoId } = req.body;
        const response = await axios.post(
            `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
            { ttl: 300 },
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
                },
            }
        );
        res.json(response.data);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

export const getAdminAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllCoursesService(res)
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

export const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const course = await CourseModel.findById(id);
        if (!course) {
            return next(new ErrorHandler("Course not found", 400))
        }
        await course.deleteOne({ id });
        await redis.del(id);

        res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 404))
    }
})
