
import { StructureCode } from './types';

export const STRUCT_MAP: Record<StructureCode, { name: string; limit: number }> = {
  [StructureCode.P]: { name: '鋼骨造', limit: 60 },
  [StructureCode.A]: { name: '鋼骨混凝土造', limit: 60 },
  [StructureCode.S]: { name: '鋼骨鋼筋混凝土造', limit: 60 },
  [StructureCode.B]: { name: '鋼筋混凝土造', limit: 60 },
  [StructureCode.T]: { name: '預鑄混凝土造', limit: 60 },
  [StructureCode.C]: { name: '加強磚造', limit: 52 },
};
