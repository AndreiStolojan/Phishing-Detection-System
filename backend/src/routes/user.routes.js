import { Router } from 'express';

import { deleteMe, getMe, getUser, getUsers, updateMe, updateMeAiSettings, updateMeNotificationSettings } from '../controllers/user.controller.js';
import authorize from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";
import validate from '../middlewares/validate.middleware.js';
import { updateAiSettingsSchema, updateMeSchema, updateNotificationSettingsSchema } from '../validations/user.validation.js';

const userRouter = Router();

userRouter.get('/me', authorize, getMe);
userRouter.patch('/me/ai-settings', authorize, validate(updateAiSettingsSchema), updateMeAiSettings);
userRouter.patch('/me/notification-settings', authorize, validate(updateNotificationSettingsSchema), updateMeNotificationSettings);
userRouter.patch('/me', authorize, validate(updateMeSchema), updateMe);
userRouter.delete('/me', authorize, deleteMe);
userRouter.get('/', authorize, authorizeRoles('admin'), getUsers);
userRouter.get('/:id', authorize, authorizeRoles('admin'), getUser);

export default userRouter;
