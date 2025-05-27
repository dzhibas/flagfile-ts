// Simple test to verify interpreter import
import { Interpreter } from '../interpreter';

test('interpreter can be imported', () => {
  const interpreter = new Interpreter();
  expect(interpreter).toBeDefined();
});
