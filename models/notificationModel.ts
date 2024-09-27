import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
    title: string;
    message: string;
    status: string;
    userId: string;
    createdAt: Date; // Added createdAt
}

const notificationSchema = new Schema<INotification>({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: "unread",
    },
}, { timestamps: true }); // This enables createdAt and updatedAt

const NotificationModel: Model<INotification> = mongoose.model('Notification', notificationSchema);

export default NotificationModel;
