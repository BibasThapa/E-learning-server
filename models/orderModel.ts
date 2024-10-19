import mongoose, { Document, Model, Schema } from "mongoose";


interface DocumentWithCreatedAt extends Document {
    createdAt: Date;
    updatedAt: Date;
}

export interface IOrder extends DocumentWithCreatedAt {
    courseId: string;
    userId: string;
    payment_info: any;
}

const orderSchema = new Schema<IOrder>({
    courseId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    payment_info: {
        type: Object,
        
    },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const OrderModel: Model<IOrder> = mongoose.model('Order', orderSchema);

export default OrderModel;
