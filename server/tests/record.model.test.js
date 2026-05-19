const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Record = require('../models/Record');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Record.deleteMany({});
});

describe('Record model — schema validation', () => {
  test('saves a complete valid record', async () => {
    const record = new Record({
      fileName: 'test.jpg',
      originalText: 'raw ocr text',
      extractedData: {
        date: '2024-01-15',
        shift: 'A',
        employeeNumber: 'EMP-001',
        machineNumber: 'MC-001',
        operationCode: 'OP-1',
        workOrderNumber: 'WO-001',
        quantityProduced: 100,
        timeTaken: '8h',
      },
      confidenceScores: { date: 0.9 },
      validationErrors: [],
      reviewRequired: false,
    });
    const saved = await record.save();
    expect(saved._id).toBeDefined();
    expect(saved.fileName).toBe('test.jpg');
  });

  test('fails validation when fileName is missing', async () => {
    const record = new Record({
      originalText: 'text',
    });
    await expect(record.save()).rejects.toThrow();
  });

  test('defaults reviewRequired to false', async () => {
    const record = new Record({ fileName: 'test.jpg' });
    const saved = await record.save();
    expect(saved.reviewRequired).toBe(false);
  });

  test('defaults createdAt to current date', async () => {
    const before = new Date();
    const record = new Record({ fileName: 'test.jpg' });
    const saved = await record.save();
    const after = new Date();
    expect(saved.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(saved.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('stores validationErrors as array of strings', async () => {
    const record = new Record({
      fileName: 'test.jpg',
      validationErrors: ['Missing required field: date', 'Invalid shift'],
    });
    const saved = await record.save();
    expect(saved.validationErrors).toHaveLength(2);
    expect(saved.validationErrors[0]).toBe('Missing required field: date');
  });

  test('stores quantityProduced as Number', async () => {
    const record = new Record({
      fileName: 'test.jpg',
      extractedData: { quantityProduced: 500 },
    });
    const saved = await record.save();
    expect(typeof saved.extractedData.quantityProduced).toBe('number');
    expect(saved.extractedData.quantityProduced).toBe(500);
  });
});
