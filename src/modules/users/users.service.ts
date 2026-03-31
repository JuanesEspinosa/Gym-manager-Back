import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../auth/entities/user.entity';
import { Location } from '../gym/locations/entities/location.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignLocationsDto } from './dto/assign-locations.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  findAll(companyId: string) {
    return this.userRepository.find({
      where: { company_id: companyId, role: UserRole.ADMIN },
      select: [
        'id',
        'email',
        'role',
        'location_ids',
        'is_active',
        'created_at',
      ],
    });
  }

  async findOne(id: string, companyId: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      select: [
        'id',
        'email',
        'role',
        'location_ids',
        'is_active',
        'created_at',
      ],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, companyId: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password_hash,
      role: UserRole.ADMIN,
      company_id: companyId,
      location_ids: dto.location_ids ?? [],
      is_active: true,
    });
    const saved = await this.userRepository.save(user);
    const { password_hash: _, ...result } = saved;
    return result;
  }

  async update(id: string, dto: UpdateUserDto, companyId: string) {
    await this.findOne(id, companyId);
    await this.userRepository.update({ id, company_id: companyId }, dto);
    return this.findOne(id, companyId);
  }

  async assignLocations(
    id: string,
    dto: AssignLocationsDto,
    companyId: string,
  ) {
    await this.findOne(id, companyId);
    const locations = await this.locationRepository.find({
      where: dto.location_ids.map((lid) => ({
        id: lid,
        company_id: companyId,
      })),
    });
    if (locations.length !== dto.location_ids.length) {
      throw new NotFoundException(
        'One or more locations not found in this company',
      );
    }
    await this.userRepository.update(
      { id, company_id: companyId },
      {
        location_ids: dto.location_ids,
      },
    );
    return this.findOne(id, companyId);
  }

  async deactivate(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.userRepository.update(
      { id, company_id: companyId },
      { is_active: false },
    );
    return { message: 'User deactivated successfully' };
  }
}
