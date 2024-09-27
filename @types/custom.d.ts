import { IUser } from '../models/user.models'; // Adjust the path to where your IUser interface is located

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}
