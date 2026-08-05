// Test fixture: importing this module must fail immediately on a duplicate key.
import { mergeWeightModules } from '../../src/detection/weights/index.js';

mergeWeightModules([
    { import_time_collision: 10 },
    { import_time_collision: 20 },
]);
