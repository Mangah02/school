// apps/api/src/modules/auth/__tests__/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockUser = {
    id: 'user-1',
    email: 'test@school.ke',
    password_hash: '$2b$12$hashedpassword', // Mocked hash
    is_active: true,
    is_deleted: false,
    school_id: 'school-1',
    role: { name: 'teacher' }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            auditLog: { create: jest.fn() },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException if account is locked (4 attempts)', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue('4');
      
      await expect(service.validateUser('test@school.ke', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should increment lockout counter on wrong password', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue('1');
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      
      await expect(service.validateUser('test@school.ke', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(redis.incr).toHaveBeenCalledWith('lockout:test@school.ke');
      expect(redis.expire).toHaveBeenCalledWith('lockout:test@school.ke', 1800);
    });

    it('should return user and reset lockout on successful validation', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue('0');
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      
      const result = await service.validateUser('test@school.ke', 'Password123!');
      expect(result.id).toBe('user-1');
      expect(redis.del).toHaveBeenCalledWith('lockout:test@school.ke');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});