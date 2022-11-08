export class UpdateUserDto {
  name: string;
  password: string;
  email: string;
  mobile: string;
  position: string;
  status: number;
  role: number;
  group: string;
  avatar_name: string;
  avatar_url: string;
  avatar_s3_name: string;
  updated_by: number;
  soft_delete: Date;
  stores: number[];
}
