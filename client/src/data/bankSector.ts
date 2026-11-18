// Chỉ số 16 ngân hàng niêm yết, quý 3/2026 — tổng hợp từ báo cáo tài chính quý
// (file tổng hợp bank.xlsm của anh Thiện). Đơn vị: %. `d` = thay đổi so với cùng
// kỳ năm trước, tính bằng điểm %. ROA, ROE theo quý (chưa quy năm).
// Cập nhật: thay mảng BANKS và PERIOD khi có số liệu quý mới.

export const PERIOD = "Q3/2026";

export type BankGroup = "SOBs" | "NHTM lớn" | "NHTM vừa";
export type MetricKey = "casa" | "cir" | "noii" | "credit" | "deposit" | "nim" | "roa" | "roe" | "npl" | "ldr" | "yoea" | "cof";
export interface BankRow {
  bank: string;
  group: BankGroup;
  v: Record<MetricKey, number | null>;
  d: Record<MetricKey, number | null>;
}

export const BANKS: BankRow[] = [
 {
  "bank": "VCB",
  "group": "SOBs",
  "v": {
   "casa": 31.774,
   "cir": 31.573,
   "noii": 19.839,
   "credit": 8.272,
   "deposit": 6.527,
   "nim": 2.908,
   "roa": 0.339,
   "roe": 3.6,
   "npl": 0.706,
   "ldr": 81.775,
   "yoea": 5.439,
   "cof": 2.92
  },
  "d": {
   "casa": -1.543,
   "cir": -1.872,
   "noii": 1.033,
   "credit": 3.059,
   "deposit": -0.535,
   "nim": 0.333,
   "roa": -0.054,
   "roe": -0.535,
   "npl": -0.328,
   "ldr": -0.559,
   "yoea": 0.866,
   "cof": 0.631
  }
 },
 {
  "bank": "BID",
  "group": "SOBs",
  "v": {
   "casa": 19.899,
   "cir": 34.417,
   "noii": 26.502,
   "credit": 8.08,
   "deposit": 6.176,
   "nim": 2.177,
   "roa": 0.244,
   "roe": 4.218,
   "npl": 1.854,
   "ldr": 85.856,
   "yoea": 5.925,
   "cof": 4.068
  },
  "d": {
   "casa": 0.01,
   "cir": -0.444,
   "noii": -1.774,
   "credit": 4.369,
   "deposit": 0.822,
   "nim": 0.085,
   "roa": 0.044,
   "roe": 0.537,
   "npl": -0.021,
   "ldr": 1.361,
   "yoea": 0.753,
   "cof": 0.7
  }
 },
 {
  "bank": "CTG",
  "group": "SOBs",
  "v": {
   "casa": 22.673,
   "cir": 25.077,
   "noii": 23.865,
   "credit": 7.287,
   "deposit": 8.394,
   "nim": 2.814,
   "roa": 0.368,
   "roe": 5.333,
   "npl": 1.204,
   "ldr": 84.779,
   "yoea": 6.29,
   "cof": 3.943
  },
  "d": {
   "casa": -1.688,
   "cir": -1.688,
   "noii": 0.202,
   "credit": 2.829,
   "deposit": 0.469,
   "nim": 0.312,
   "roa": 0.051,
   "roe": 0.231,
   "npl": 0.113,
   "ldr": 1.544,
   "yoea": 1.001,
   "cof": 0.821
  }
 },
 {
  "bank": "TCB",
  "group": "NHTM lớn",
  "v": {
   "casa": 31.046,
   "cir": 31.923,
   "noii": 29.466,
   "credit": 13.145,
   "deposit": 6.863,
   "nim": 3.799,
   "roa": 0.643,
   "roe": 4.316,
   "npl": 1.272,
   "ldr": 86.81,
   "yoea": 7.753,
   "cof": 4.203
  },
  "d": {
   "casa": -6.036,
   "cir": 0.376,
   "noii": -0.849,
   "credit": -0.16,
   "deposit": -0.194,
   "nim": 0.045,
   "roa": 0.033,
   "roe": 0.44,
   "npl": 0.109,
   "ldr": -0.066,
   "yoea": 1.083,
   "cof": 1.059
  }
 },
 {
  "bank": "VPB",
  "group": "NHTM lớn",
  "v": {
   "casa": 12.258,
   "cir": 21.771,
   "noii": 17.775,
   "credit": 28.632,
   "deposit": 26.272,
   "nim": 4.835,
   "roa": 0.569,
   "roe": 4.53,
   "npl": 3.118,
   "ldr": 105.813,
   "yoea": 9.458,
   "cof": 5.133
  },
  "d": {
   "casa": -1.417,
   "cir": -0.216,
   "noii": -7.433,
   "credit": 8.209,
   "deposit": 0.03,
   "nim": -0.306,
   "roa": -0.076,
   "roe": -0.194,
   "npl": -0.395,
   "ldr": -0.524,
   "yoea": 0.76,
   "cof": 1.096
  }
 },
 {
  "bank": "MBB",
  "group": "NHTM lớn",
  "v": {
   "casa": 32.836,
   "cir": 26.172,
   "noii": 15.435,
   "credit": 18.59,
   "deposit": 7.882,
   "nim": 3.84,
   "roa": 0.462,
   "roe": 5.143,
   "npl": 1.667,
   "ldr": 86.993,
   "yoea": 7.592,
   "cof": 4.119
  },
  "d": {
   "casa": -3.097,
   "cir": -2.97,
   "noii": -1.275,
   "credit": 3.131,
   "deposit": 0.726,
   "nim": -0.035,
   "roa": 0.019,
   "roe": 0.696,
   "npl": -0.203,
   "ldr": 0.338,
   "yoea": 1.047,
   "cof": 1.098
  }
 },
 {
  "bank": "ACB",
  "group": "NHTM lớn",
  "v": {
   "casa": 19.264,
   "cir": 31.167,
   "noii": 17.203,
   "credit": 11.513,
   "deposit": 1.901,
   "nim": 2.893,
   "roa": 0.433,
   "roe": 4.622,
   "npl": 1.188,
   "ldr": 81.675,
   "yoea": 7.258,
   "cof": 4.785
  },
  "d": {
   "casa": -2.224,
   "cir": -1.201,
   "noii": -2.058,
   "credit": 3.416,
   "deposit": -0.338,
   "nim": -0.094,
   "roa": -0.022,
   "roe": -0.171,
   "npl": 0.093,
   "ldr": -3.468,
   "yoea": 1.017,
   "cof": 1.161
  }
 },
 {
  "bank": "HDB",
  "group": "NHTM lớn",
  "v": {
   "casa": 7.566,
   "cir": 24.787,
   "noii": 18.37,
   "credit": 31.442,
   "deposit": 26.476,
   "nim": 3.917,
   "roa": 0.372,
   "roe": 4.407,
   "npl": 3.423,
   "ldr": 74.523,
   "yoea": 9.281,
   "cof": 5.245
  },
  "d": {
   "casa": -2.54,
   "cir": -1.357,
   "noii": -0.052,
   "credit": 5.208,
   "deposit": -0.902,
   "nim": -0.806,
   "roa": -0.114,
   "roe": -1.305,
   "npl": 0.522,
   "ldr": 2.151,
   "yoea": 0.137,
   "cof": 0.657
  }
 },
 {
  "bank": "STB",
  "group": "NHTM lớn",
  "v": {
   "casa": 18.958,
   "cir": 27.361,
   "noii": 49.272,
   "credit": 12.554,
   "deposit": 25.403,
   "nim": 2.472,
   "roa": 0.138,
   "roe": 2.122,
   "npl": 7.334,
   "ldr": 72.82,
   "yoea": 6.938,
   "cof": 4.806
  },
  "d": {
   "casa": 3.507,
   "cir": -19.199,
   "noii": 38.789,
   "credit": 19.675,
   "deposit": -2.618,
   "nim": -1.035,
   "roa": -0.212,
   "roe": -2.614,
   "npl": 4.585,
   "ldr": -5.473,
   "yoea": -0.232,
   "cof": 0.947
  }
 },
 {
  "bank": "SHB",
  "group": "NHTM lớn",
  "v": {
   "casa": 6.658,
   "cir": 25.448,
   "noii": 29.011,
   "credit": 8.939,
   "deposit": 12.978,
   "nim": 2.628,
   "roa": 0.421,
   "roe": 5.337,
   "npl": 2.221,
   "ldr": 79.516,
   "yoea": 8.455,
   "cof": 5.94
  },
  "d": {
   "casa": 0.055,
   "cir": 0.035,
   "noii": 12.106,
   "credit": 3.545,
   "deposit": 1.294,
   "nim": -1.201,
   "roa": 0.11,
   "roe": 1.296,
   "npl": -0.836,
   "ldr": 0.094,
   "yoea": 0.009,
   "cof": 1.363
  }
 },
 {
  "bank": "LPB",
  "group": "NHTM vừa",
  "v": {
   "casa": 6.549,
   "cir": 20.714,
   "noii": 50.759,
   "credit": 23.017,
   "deposit": 24.956,
   "nim": 2.62,
   "roa": 0.544,
   "roe": 7.948,
   "npl": 1.871,
   "ldr": 76.943,
   "yoea": 7.606,
   "cof": 5.349
  },
  "d": {
   "casa": -0.251,
   "cir": -6.511,
   "noii": 30.319,
   "credit": 19.325,
   "deposit": -0.118,
   "nim": -0.467,
   "roa": 0.019,
   "roe": 1.384,
   "npl": 0.091,
   "ldr": -2.32,
   "yoea": 0.249,
   "cof": 0.72
  }
 },
 {
  "bank": "VIB",
  "group": "NHTM vừa",
  "v": {
   "casa": 11.351,
   "cir": 29.442,
   "noii": 21.64,
   "credit": 7.61,
   "deposit": 9.381,
   "nim": 3.074,
   "roa": 0.326,
   "roe": 3.944,
   "npl": 3.201,
   "ldr": 84.792,
   "yoea": 7.823,
   "cof": 5.201
  },
  "d": {
   "casa": -3.928,
   "cir": -6.89,
   "noii": 4.978,
   "credit": 1.499,
   "deposit": 0.024,
   "nim": 0.043,
   "roa": 0.024,
   "roe": 0.289,
   "npl": -0.12,
   "ldr": -0.342,
   "yoea": 1.174,
   "cof": 1.167
  }
 },
 {
  "bank": "TPB",
  "group": "NHTM vừa",
  "v": {
   "casa": 16.352,
   "cir": 31.87,
   "noii": 22.449,
   "credit": 9.258,
   "deposit": 8.093,
   "nim": 2.996,
   "roa": 0.411,
   "roe": 4.624,
   "npl": 2.104,
   "ldr": 67.475,
   "yoea": 8.034,
   "cof": 5.007
  },
  "d": {
   "casa": -1.39,
   "cir": -6.007,
   "noii": -6.003,
   "credit": 4.561,
   "deposit": 0.985,
   "nim": -0.152,
   "roa": 0.066,
   "roe": 0.736,
   "npl": -0.122,
   "ldr": -9.865,
   "yoea": 0.98,
   "cof": 0.929
  }
 },
 {
  "bank": "EIB",
  "group": "NHTM vừa",
  "v": {
   "casa": 12.943,
   "cir": 71.332,
   "noii": 18.817,
   "credit": -17.416,
   "deposit": -10.719,
   "nim": 2.426,
   "roa": 0.057,
   "roe": 0.542,
   "npl": 2.616,
   "ldr": 76.082,
   "yoea": 7.634,
   "cof": 5.462
  },
  "d": {
   "casa": -0.936,
   "cir": 16.038,
   "noii": 6.425,
   "credit": -7.215,
   "deposit": -1.153,
   "nim": 0.01,
   "roa": -0.117,
   "roe": -1.148,
   "npl": -0.374,
   "ldr": -7.019,
   "yoea": 1.478,
   "cof": 1.417
  }
 },
 {
  "bank": "MSB",
  "group": "NHTM vừa",
  "v": {
   "casa": 20.419,
   "cir": 38.627,
   "noii": 14.129,
   "credit": 13.651,
   "deposit": 10.538,
   "nim": 3.194,
   "roa": 0.374,
   "roe": 3.581,
   "npl": 2.698,
   "ldr": 71.423,
   "yoea": 7.181,
   "cof": 4.323
  },
  "d": {
   "casa": -6.037,
   "cir": -0.339,
   "noii": -3.156,
   "credit": 6.216,
   "deposit": 0.403,
   "nim": -0.19,
   "roa": 0.009,
   "roe": 0.39,
   "npl": -0.094,
   "ldr": -2.51,
   "yoea": 0.778,
   "cof": 0.979
  }
 },
 {
  "bank": "OCB",
  "group": "NHTM vừa",
  "v": {
   "casa": 11.946,
   "cir": 34.745,
   "noii": 15.891,
   "credit": 9.996,
   "deposit": 1.317,
   "nim": 3.03,
   "roa": 0.367,
   "roe": 3.602,
   "npl": 3.989,
   "ldr": 70.166,
   "yoea": 7.864,
   "cof": 5.408
  },
  "d": {
   "casa": -3.603,
   "cir": -1.738,
   "noii": -1.405,
   "credit": -4.815,
   "deposit": 0.092,
   "nim": -0.179,
   "roa": -0.026,
   "roe": -0.132,
   "npl": 0.289,
   "ldr": -2.468,
   "yoea": 0.904,
   "cof": 1.248
  }
 }
];
