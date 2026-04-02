import { Router } from 'express';

import {getMe, getUser, getUsers} from "../controllers/user.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";

const userRouter = Router();

userRouter.get('/me', authorize, getMe);
userRouter.get('/', authorize, authorizeRoles('admin'), getUsers);
userRouter.get('/:id', authorize, authorizeRoles('admin'), getUser);
userRouter.post('/', (req, res) => res.send({title: 'Create a new user'}));
userRouter.put('/:id', (req, res) => res.send({title: 'Update user'}));
userRouter.delete('/:id', (req, res) => res.send({title: 'Delete user'}));

export default userRouter;
