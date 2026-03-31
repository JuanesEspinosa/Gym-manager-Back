import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private generateTokens(payload: Record<string, unknown>) {
    const accessOpts: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow('jwt.accessExpiresIn'),
    };

    const refreshOpts: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow('jwt.refreshExpiresIn'),
    };

    const accessToken = this.jwtService.sign(payload, accessOpts);
    const refreshToken = this.jwtService.sign(payload, refreshOpts);

    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email, is_active: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: Record<string, unknown> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id ?? null,
      location_ids: user.location_ids ?? [],
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, is_active: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload: Record<string, unknown> = {
        sub: user.id,
        email: user.email,
        role: user.role,
        company_id: user.company_id ?? null,
        location_ids: user.location_ids ?? [],
      };

      const accessOpts: JwtSignOptions = {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.getOrThrow('jwt.accessExpiresIn'),
      };
      const accessToken = this.jwtService.sign(newPayload, accessOpts);

      return { access_token: accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
