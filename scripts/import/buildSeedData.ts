import { randomUUID } from 'node:crypto';
import { readSheetAsObjects, mapRow } from './parseExcel';
import { VEHICLE_COLUMN_MAP, EXPENSE_COLUMN_MAP } from './columnMaps';
import { normalizePlate, extractPlateFromVehicleNumberField } from './normalize';
import { deriveSystemCategory } from './categorize';

export interface SeedVehicle extends Record<string, unknown> {
  id: string;
  plate_no: string;
}

export interface SeedExpense extends Record<string, unknown> {
  id: string;
  vehicle_id: string | null;
  system_category: string;
}

export interface ImportSummary {
  vehiclesImported: number;
  expensesImported: number;
  matchedExpenses: number;
  unassignedExpenses: number;
  recordsRequiringReview: number;
}

export function buildSeedData(
  vehicleFilePath: string,
  expenseFilePath: string
): { vehicles: SeedVehicle[]; expenses: SeedExpense[]; summary: ImportSummary } {
  const vehicleRows = readSheetAsObjects(vehicleFilePath, 'Vehicle_Report').map((r) =>
    mapRow(r, VEHICLE_COLUMN_MAP)
  );
  const expenseRows = readSheetAsObjects(expenseFilePath, 'All_Quartermaster_Expenses').map((r) =>
    mapRow(r, EXPENSE_COLUMN_MAP)
  );

  const vehicles: SeedVehicle[] = vehicleRows.map((v) => ({
    id: randomUUID(),
    ...v,
    plate_no: normalizePlate(String(v.plate_no)),
  }));
  const idByPlate = new Map(vehicles.map((v) => [v.plate_no, v.id]));

  let matchedExpenses = 0;
  let unassignedExpenses = 0;
  let recordsRequiringReview = 0;

  const expenses: SeedExpense[] = expenseRows.map((e) => {
    const raw = e.raw_vehicle_number_text as string | null;
    const systemCategory = deriveSystemCategory(
      String(e.type_of_expense ?? ''),
      String(e.expense ?? '')
    );
    let vehicleId: string | null = null;

    if (raw) {
      const plate = extractPlateFromVehicleNumberField(raw);
      vehicleId = (plate && idByPlate.get(plate)) || null;
      if (vehicleId) {
        matchedExpenses++;
      } else {
        recordsRequiringReview++;
      }
    } else {
      unassignedExpenses++;
    }

    return { id: randomUUID(), ...e, vehicle_id: vehicleId, system_category: systemCategory };
  });

  return {
    vehicles,
    expenses,
    summary: {
      vehiclesImported: vehicles.length,
      expensesImported: expenses.length,
      matchedExpenses,
      unassignedExpenses,
      recordsRequiringReview,
    },
  };
}
