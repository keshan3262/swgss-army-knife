import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  PickType
} from '@nestjs/swagger';
import { makeProblemResponseOptions, ProblemDto } from '../utils/problem';
import { makeItemsPage } from '../utils/make-items-page';
import { ParseBoundedIntPipe } from '../pipes/bounded-int.pipe';
import { ParseCursorPipe, type ParseCursorResult } from '../pipes/parse-cursor.pipe';
import { IsInt, MaxLength, Min, IsString, MinLength, Matches, IsEmail, IsArray, ValidateIf } from 'class-validator';

class UserDto {
  @ApiProperty({ example: 1, type: 'integer', minimum: 1, format: 'int64' })
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({ example: 'alicesmith', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(String.raw`^[a-zA-Z0-9_]+$`)
  username!: string;

  @ApiProperty({ example: 'alice.smith@example.com', format: 'email', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

class CreateUserDto extends PickType(UserDto, ['username', 'email'] as const) {}

class UsersListDto {
  @ApiProperty({ type: [UserDto] })
  @IsArray()
  items!: UserDto[];

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'The cursor to start from. This is an opaque token'
  })
  @IsString()
  @ValidateIf((_, value) => value !== null)
  next_cursor!: string | null;
}

const dummyUsersFirstNames = [
  'Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivy', 'Jack', 'Kyle', 'Liam', 'Mia', 'Noah',
  'Olivia', 'Paul', 'Quinn', 'Ryan', 'Sarah', 'Terry', 'Uma', 'Violet', 'William', 'Xavier', 'Yvonne', 'Zach'
];
const dummyUsersLastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez'
];

const dummyUsers: UserDto[] = dummyUsersFirstNames.flatMap((firstName, i) => dummyUsersLastNames.map((lastName, j) => ({
  id: i * dummyUsersLastNames.length + j + 1,
  username: `${firstName}${lastName}`.toLowerCase(),
  email: `${firstName}.${lastName}@example.com`
})));

let nextUserId = dummyUsers.length + 1;

@Controller('users')
@ApiExtraModels(ProblemDto)
export class UsersController {
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID', operationId: 'getUserById' })
  @ApiParam({ name: 'id', required: true, schema: { type: 'integer', minimum: 1, format: 'int64' } })
  @ApiOkResponse({ description: 'The requested user', type: UserDto })
  @ApiBadRequestResponse(makeProblemResponseOptions('Bad request'))
  @ApiUnauthorizedResponse(makeProblemResponseOptions('Unauthorized'))
  @ApiForbiddenResponse(makeProblemResponseOptions('Forbidden'))
  @ApiNotFoundResponse(makeProblemResponseOptions('Not found'))
  @ApiInternalServerErrorResponse(makeProblemResponseOptions('Internal server error'))
  getUser(@Param('id', new ParseBoundedIntPipe({ min: 1 })) id: number) {
    const user = dummyUsers.find(user => user.id === id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Get()
  @ApiOperation({ summary: 'List users', operationId: 'listUsers' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'The maximum number of users to return',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    schema: { type: 'string', nullable: true, description: 'The cursor to start from. This is an opaque token' }
  })
  @ApiOkResponse({ description: 'A list of users', type: UsersListDto })
  @ApiBadRequestResponse(makeProblemResponseOptions('Bad request'))
  @ApiUnauthorizedResponse(makeProblemResponseOptions('Unauthorized'))
  @ApiForbiddenResponse(makeProblemResponseOptions('Forbidden'))
  @ApiInternalServerErrorResponse(makeProblemResponseOptions('Internal server error'))
  listUsers(
    @Query('cursor', ParseCursorPipe) { startId }: ParseCursorResult,
    @Query('limit', new ParseBoundedIntPipe({ min: 1, max: 100, optional: true })) limit = 10
  ): UsersListDto {
    return makeItemsPage(dummyUsers, limit, startId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user', operationId: 'createUser' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'A unique identifier for the request. If the request is retried, the same idempotency key should be used.',
    schema: { type: 'string', minLength: 1, maxLength: 255 }
  })
  @ApiCreatedResponse({ description: 'User creation result', type: UserDto })
  @ApiBadRequestResponse(makeProblemResponseOptions('Bad request'))
  @ApiUnauthorizedResponse(makeProblemResponseOptions('Unauthorized'))
  @ApiForbiddenResponse(makeProblemResponseOptions('Forbidden'))
  @ApiConflictResponse(makeProblemResponseOptions('Conflict'))
  @ApiUnprocessableEntityResponse(makeProblemResponseOptions('Unprocessable entity'))
  @ApiInternalServerErrorResponse(makeProblemResponseOptions('Internal server error'))
  createUser(@Body() body: CreateUserDto): UserDto {
    const user: UserDto = {
      id: nextUserId++,
      username: body.username,
      email: body.email
    };
    dummyUsers.push(user);
    return user;
  }
}
