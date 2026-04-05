import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  async findAllPlatform() {
    const users = await this.userRepository.find({
      relations: ['company', 'locations'],
      order: { created_at: 'DESC' },
    });
    return users.map((u) => this.toResponse(u));
  }

  async findAll(companyId: string) {
    const users = await this.userRepository.find({
      where: { company_id: companyId, role: UserRole.ADMIN },
      relations: ['locations'],
    });
    return users.map((u) => this.toResponse(u));
  }

  async findOne(id: string, companyId: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['locations'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.toResponse(user);
  }

  async create(dto: CreateUserDto, companyId: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    let locations: Location[] = [];
    if (dto.location_ids?.length) {
      locations = await this.locationRepository.find({
        where: dto.location_ids.map((id) => ({ id, company_id: companyId })),
      });
      if (locations.length !== dto.location_ids.length) {
        throw new NotFoundException(
          'One or more locations not found in this company',
        );
      }
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password_hash,
      role: UserRole.ADMIN,
      company_id: companyId,
      locations,
      is_active: true,
    });
    const saved = await this.userRepository.save(user);
    return this.toResponse(saved);
  }

  async update(id: string, dto: UpdateUserDto, companyId: string) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['locations'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.location_ids) {
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
      user.locations = locations;
    }

    await this.userRepository.save(user);
    return this.findOne(id, companyId);
  }

  async assignLocations(
    id: string,
    dto: AssignLocationsDto,
    companyId: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id, company_id: companyId },
      relations: ['locations'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

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

    user.locations = locations;
    await this.userRepository.save(user);
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

  async findByIdWithLocations(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['locations'],
    });
  }

  private toResponse(user: User) {
    const { password_hash, ...rest } = user;
    return {
      ...rest,
      location_ids: (user.locations ?? []).map((l) => l.id),
    };
  }
}
