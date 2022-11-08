import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RouterModule } from '@nestjs/core'

@Module({
  imports: [
    AuthModule,
    RouterModule.register([
        {
          path: 'v1',
          module: AuthModule,
        },
      ]),
  ],
  providers: [],

})

export class ModuleV1 { }
