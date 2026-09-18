import { changePasswordService } from './change-password.service';
import { deleteUserService } from './delete-user.service';
import { getAllUsersService } from './get-all-users.service';
import { getMyProfileService } from './get-my-profile.service';
import { getUserByIdService } from './get-user-by-id.service';
import { updateMyProfileService } from './update-my-profile.service';
import { updateStudentByAdminService } from './update-student-by-admin.service';
import { updateTeacherByAdminService } from './update-teacher-by-admin.service';
import { updateTeacherPermissionsService } from './update-teacher-permissions.service';
import { updateUserStatusService } from './update-user-status.service';

export const userService = Object.freeze({
  getMyProfile: getMyProfileService,
  updateMyProfile: updateMyProfileService,
  changePassword: changePasswordService,
  getAllUsers: getAllUsersService,
  getUserById: getUserByIdService,
  updateUserStatus: updateUserStatusService,
  updateTeacherPermissions: updateTeacherPermissionsService,
  updateStudentByAdmin: updateStudentByAdminService,
  updateTeacherByAdmin: updateTeacherByAdminService,
  deleteUser: deleteUserService,
});

export {
  changePasswordService,
  deleteUserService,
  getAllUsersService,
  getMyProfileService,
  getUserByIdService,
  updateMyProfileService,
  updateStudentByAdminService,
  updateTeacherByAdminService,
  updateTeacherPermissionsService,
  updateUserStatusService,
};
