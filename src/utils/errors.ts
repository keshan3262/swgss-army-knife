export class ErrorWithCode extends Error {
  constructor(public readonly typeCode: string, public readonly statusCode: number, message: string) {
    super(message);
  }
}

export class IdempotencyKeyReuseException extends ErrorWithCode {
  constructor() {
    super('idempotency-key-reuse', 422, 'This Idempotency-Key has already been used with a different request body');
  }
}

export class IdempotencyConflictException extends ErrorWithCode {
  constructor() {
    super('idempotency-in-flight', 409, 'The request is already in flight, try again later');
  }
}

export class NotFoundException extends ErrorWithCode {
  constructor(message: string) {
    super('not-found', 404, message);
  }
}
