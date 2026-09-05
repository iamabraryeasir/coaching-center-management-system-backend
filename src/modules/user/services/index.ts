import { changePasswordService } from './change-password.service';
import { deleteUserService } from './delete-user.service';
import { getAllUsersService } from './get-all-users.service';
import { getMyProfileService } from './get-my-profile.service';
import { getUserByIdService } from './get-user-by-id.service';
import { updateMyProfileService } from './update-my-profile.service';
import { updateUserStatusService } from './update-user-status.service';

export const userService = Object.freeze({
  getMyProfile: getMyProfileService,
  updateMyProfile: updateMyProfileService,
  changePassword: changePasswordService,
  getAllUsers: getAllUsersService,
  getUserById: getUserByIdService,
  updateUserStatus: updateUserStatusService,
  deleteUser: deleteUserService,
});

export {
  changePasswordService,
  deleteUserService,
  getAllUsersService,
  getMyProfileService,
  getUserByIdService,
  updateMyProfileService,
  updateUserStatusService,
};
