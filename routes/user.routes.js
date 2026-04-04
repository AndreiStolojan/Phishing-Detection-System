import { Router } from 'express';

import {getMe, getUser, getUsers} from "../controllers/user.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const userRouter = Router();

userRouter.get('/me', authorize, getMe);
userRouter.get('/', authorize, authorizeRoles('admin'), getUsers);
userRouter.get('/:id', authorize, authorizeRoles('admin'), getUser);

export default userRouter;
