const pipeline = {
  zremrangebyscore: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zcard: jest.fn().mockReturnThis(),
  pexpire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([
    [null, 0],
    [null, 1],
    [null, 1],
    [null, 1],
  ]),
};

export const redis = {
  publish: jest.fn().mockResolvedValue(1),
  pipeline: jest.fn().mockReturnValue(pipeline),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue('OK'),
};
