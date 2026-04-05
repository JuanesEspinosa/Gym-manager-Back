import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
      relations: ['locations'],
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

    const locationIds = (user.locations ?? []).map((l) => l.id);

    const payload: Record<string, unknown> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id ?? null,
      location_ids: locationIds,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        company_id: user.company_id ?? null,
        location_ids: locationIds,
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
        relations: ['locations'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const locationIds = (user.locations ?? []).map((l) => l.id);

      const newPayload: Record<string, unknown> = {
        sub: user.id,
        email: user.email,
        role: user.role,
        company_id: user.company_id ?? null,
        location_ids: locationIds,
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

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, is_active: true },
      relations: ['locations'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      company_id: user.company_id,
      location_ids: (user.locations ?? []).map((l) => l.id),
      created_at: user.created_at,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, is_active: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.phone !== undefined) user.phone = dto.phone;

    await this.userRepository.save(user);

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, is_active: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(
      dto.current_password,
      user.password_hash,
    );
    if (!isValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    user.password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
