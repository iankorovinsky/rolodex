import { Request, Response } from 'express';
import { getItems } from '../src/controllers/itemController';
import { items } from '../src/services/item';

describe('Item Controller', () => {
  it('should return an empty array when no items exist', () => {
    const req = {} as Request;
    const res = {
      json: jest.fn(),
    } as unknown as Response;

    items.length = 0;

    getItems(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith([]);
  });
});
