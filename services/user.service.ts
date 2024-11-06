import { Response } from 'express'

import { redis } from "../utils/redis"
import userModel from '../models/user.models';

export const getUserById = async (id: string, res: Response) => {
    const user = await userModel.findById(id); 
    if (user) {
        res.status(201).json({
            success: true,
            user,
        })
    }
};

export const getAllUsersService = async(res:Response)=> {
    const users = await userModel.find().sort({createdAt: -1});
    res.status(201).json({
        success:true,
        users,
    })
}

export const updateUserRoleService = async (res: Response, email: string, role: string) => {
  
    const user = await userModel.findOneAndUpdate({ email: email }, { role }, { new: true });
    
    if (user) {
        res.status(200).json({
            success: true,
            user,
        });
    } else {
        res.status(404).json({
            success: false,
            message: "User not found",
        });
    }
};