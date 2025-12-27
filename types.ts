
export enum StructureCode {
  P = 'P', // 鋼骨造
  A = 'A', // 鋼骨混凝土造
  S = 'S', // 鋼骨鋼筋混凝土造
  B = 'B', // 鋼筋混凝土造
  T = 'T', // 預鑄混凝土造
  C = 'C', // 加強磚造
}

export interface BuildingInputs {
  area: number;
  costPerPing: number;
  age: number;
  structCode: StructureCode;
  landPingPrice: number;
  landArea: number;
  roiPercent: number;
}

export interface CalculationResults {
  lifeLimit: number;
  totalCost: number;
  usedRatio: number;
  depreciationAmount: number;
  residualValue: number;
  rentLandRoi: number;
  rentBuildRoi: number;
  rentBuildCost: number;
  totalRent: number;
  yearlyData: {
    year: number;
    value: number;
    depreciation: number;
  }[];
}
