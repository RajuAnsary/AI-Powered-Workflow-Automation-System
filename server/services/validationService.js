const REQUIRED_FIELDS = [
  'date', 'shift', 'employeeNumber', 'machineNumber',
  'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken',
];

const VALID_SHIFTS = ['I', 'II', 'III', '1', '2', '3'];
const MACHINE_NUMBER_REGEX = /^MC-\d{3}$/;
const QUANTITY_THRESHOLD = 10000;

/**
 * Validate extracted data against business rules.
 * @param {Object} extractedData
 * @param {string[]} existingWorkOrders - work order numbers already in DB
 * @returns {string[]} array of validation error messages
 */
function validate(extractedData, existingWorkOrders = []) {
  const errors = [];

  // Check all 8 required fields
  for (const field of REQUIRED_FIELDS) {
    const value = extractedData[field];
    if (value === null || value === undefined || value === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate shift value
  if (extractedData.shift && !VALID_SHIFTS.includes(String(extractedData.shift).trim())) {
    errors.push(`Invalid shift value: "${extractedData.shift}". Must be I, II, or III.`);
  }

  // Validate machine number format
  if (extractedData.machineNumber && !MACHINE_NUMBER_REGEX.test(extractedData.machineNumber)) {
    errors.push(`Invalid machine number format: "${extractedData.machineNumber}". Expected MC-XXX.`);
  }

  // Quantity threshold warning
  if (typeof extractedData.quantityProduced === 'number' && extractedData.quantityProduced > QUANTITY_THRESHOLD) {
    errors.push(`Quantity produced (${extractedData.quantityProduced}) exceeds expected threshold of ${QUANTITY_THRESHOLD}.`);
  }

  // Duplicate work order check
  if (extractedData.workOrderNumber && existingWorkOrders.includes(extractedData.workOrderNumber)) {
    errors.push(`Duplicate work order number: "${extractedData.workOrderNumber}" already exists.`);
  }

  return errors;
}

module.exports = { validate };
