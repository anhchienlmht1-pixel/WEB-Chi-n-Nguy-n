// Định giá ngân hàng — số liệu SSI (chỉ số tài chính theo quý), chụp ngày 18/11/2026.
// bvps: giá trị sổ sách / cổ phiếu (VND) quý 3/2026; eps: lợi nhuận / cổ phiếu 4 quý gần nhất (VND);
// roe: ROE 4 quý gần nhất (%); pbQ3: P/B cuối quý 3/2026; pbAvg/Min/Max: P/B cuối các quý
// từ 2022 đến Q3/2026 (n quý). P/B, P/E trên trang = giá đang khớp / bvps, / eps.
export interface BankValuation { bvps: number; eps: number; roe: number; pbQ3: number; pbAvg: number; pbMin: number; pbMax: number; n: number }
export const VALUATION: Record<string, BankValuation> = {
 "VCB": {
  "bvps": 30359,
  "eps": 4986,
  "roe": 17.34,
  "pbQ3": 1.716,
  "pbAvg": 2.626,
  "pbMin": 1.716,
  "pbMax": 3.164,
  "n": 14
 },
 "BID": {
  "bvps": 25348,
  "eps": 4524,
  "roe": 18.09,
  "pbQ3": 1.223,
  "pbAvg": 1.907,
  "pbMin": 1.223,
  "pbMax": 2.354,
  "n": 14
 },
 "CTG": {
  "bvps": 26545,
  "eps": 5479,
  "roe": 21.94,
  "pbQ3": 1.166,
  "pbAvg": 1.375,
  "pbMin": 1.055,
  "pbMax": 1.908,
  "n": 14
 },
 "TCB": {
  "bvps": 17601,
  "eps": 2694,
  "roe": 15.22,
  "pbQ3": 1.202,
  "pbAvg": 1.214,
  "pbMin": 0.859,
  "pbMax": 1.832,
  "n": 14
 },
 "VPB": {
  "bvps": 18696,
  "eps": 3118,
  "roe": 16.45,
  "pbQ3": 1.155,
  "pbAvg": 1.273,
  "pbMin": 1.049,
  "pbMax": 1.758,
  "n": 13
 },
 "MBB": {
  "bvps": 15594,
  "eps": 3508,
  "roe": 21.25,
  "pbQ3": 1.215,
  "pbAvg": 1.318,
  "pbMin": 1.042,
  "pbMax": 1.777,
  "n": 13
 },
 "ACB": {
  "bvps": 17920,
  "eps": 2773,
  "roe": 16.23,
  "pbQ3": 1.136,
  "pbAvg": 1.404,
  "pbMin": 1.136,
  "pbMax": 1.682,
  "n": 13
 },
 "HDB": {
  "bvps": 13787,
  "eps": 2970,
  "roe": 22.31,
  "pbQ3": 1.625,
  "pbAvg": 1.566,
  "pbMin": 1.185,
  "pbMax": 1.991,
  "n": 13
 },
 "STB": {
  "bvps": 34021,
  "eps": 809,
  "roe": 2.46,
  "pbQ3": 2.116,
  "pbAvg": 1.542,
  "pbMin": 1.171,
  "pbMax": 2.159,
  "n": 14
 },
 "SHB": {
  "bvps": 16696,
  "eps": 2911,
  "roe": 18.56,
  "pbQ3": 0.647,
  "pbAvg": 0.858,
  "pbMin": 0.645,
  "pbMax": 1.307,
  "n": 14
 },
 "LPB": {
  "bvps": 15597,
  "eps": 4048,
  "roe": 25.96,
  "pbQ3": 2.353,
  "pbAvg": 2.164,
  "pbMin": 0.991,
  "pbMax": 3.78,
  "n": 13
 },
 "VIB": {
  "bvps": 13323,
  "eps": 2070,
  "roe": 15.95,
  "pbQ3": 1.032,
  "pbAvg": 1.367,
  "pbMin": 1.032,
  "pbMax": 1.56,
  "n": 14
 },
 "TPB": {
  "bvps": 15144,
  "eps": 2642,
  "roe": 17.27,
  "pbQ3": 0.835,
  "pbAvg": 1.119,
  "pbMin": 0.815,
  "pbMax": 1.327,
  "n": 13
 },
 "EIB": {
  "bvps": 14297,
  "eps": 103,
  "roe": 0.72,
  "pbQ3": 1.116,
  "pbAvg": 1.483,
  "pbMin": 1.116,
  "pbMax": 1.894,
  "n": 13
 },
 "MSB": {
  "bvps": 12515,
  "eps": 1673,
  "roe": 14.04,
  "pbQ3": 1.306,
  "pbAvg": 1.008,
  "pbMin": 0.793,
  "pbMax": 1.306,
  "n": 14
 },
 "OCB": {
  "bvps": 12121,
  "eps": 1487,
  "roe": 12.81,
  "pbQ3": 0.87,
  "pbAvg": 0.969,
  "pbMin": 0.845,
  "pbMax": 1.082,
  "n": 13
 }
};

// Quy mô quý 3/2026 (tỷ đồng) — từ file tổng hợp bank.xlsm. toi: tổng thu nhập hoạt động trong quý;
// pbt: lợi nhuận trước thuế trong quý; pbtYoy: % tăng/giảm so với cùng kỳ.
export interface BankScale { tts: number; loan: number; dep: number; eq: number; cap: number; toi: number; pbt: number; pbtYoy: number }
export const SCALE: Record<string, BankScale> = {
 "VCB": {
  "tts": 2682409,
  "loan": 1784925,
  "dep": 1781703,
  "eq": 253761,
  "cap": 83557,
  "toi": 25431,
  "pbt": 11218,
  "pbtYoy": -0.2
 },
 "BID": {
  "tts": 3493271,
  "loan": 2526924,
  "dep": 2360525,
  "eq": 203020,
  "cap": 77782,
  "toi": 23206,
  "pbt": 10579,
  "pbtYoy": 39.3
 },
 "CTG": {
  "tts": 2951845,
  "loan": 2100105,
  "dep": 1944301,
  "eq": 207466,
  "cap": 77669,
  "toi": 28654,
  "pbt": 13689,
  "pbtYoy": 29.0
 },
 "TCB": {
  "tts": 1318165,
  "loan": 856641,
  "dep": 661390,
  "eq": 197325,
  "cap": 70862,
  "toi": 16588,
  "pbt": 10375,
  "pbtYoy": 25.8
 },
 "VPB": {
  "tts": 1610787,
  "loan": 1191737,
  "dep": 793047,
  "eq": 200078,
  "cap": 79339,
  "toi": 22084,
  "pbt": 11031,
  "pbtYoy": 20.3
 },
 "MBB": {
  "tts": 1837857,
  "loan": 1269947,
  "dep": 993988,
  "eq": 164142,
  "cap": 100687,
  "toi": 21091,
  "pbt": 10330,
  "pbtYoy": 42.5
 },
 "ACB": {
  "tts": 1104380,
  "loan": 757344,
  "dep": 596302,
  "eq": 104013,
  "cap": 58044,
  "toi": 9898,
  "pbt": 5879,
  "pbtYoy": 9.2
 },
 "HDB": {
  "tts": 1142906,
  "loan": 708564,
  "dep": 709167,
  "eq": 94304,
  "cap": 50053,
  "toi": 11378,
  "pbt": 5176,
  "pbtYoy": 9.3
 },
 "STB": {
  "tts": 1057398,
  "loan": 682457,
  "dep": 775422,
  "eq": 64137,
  "cap": 18852,
  "toi": 10306,
  "pbt": 1757,
  "pbtYoy": -51.9
 },
 "SHB": {
  "tts": 993512,
  "loan": 658143,
  "dep": 646402,
  "eq": 79200,
  "cap": 45942,
  "toi": 9147,
  "pbt": 5166,
  "pbtYoy": 57.1
 },
 "LPB": {
  "tts": 694183,
  "loan": 475910,
  "dep": 421831,
  "eq": 46592,
  "cap": 29873,
  "toi": 7966,
  "pbt": 4448,
  "pbtYoy": 29.0
 },
 "VIB": {
  "tts": 599584,
  "loan": 405812,
  "dep": 322211,
  "eq": 49766,
  "cap": 34040,
  "toi": 6101,
  "pbt": 2406,
  "pbtYoy": 18.5
 },
 "TPB": {
  "tts": 596512,
  "loan": 330152,
  "dep": 301634,
  "eq": 52133,
  "cap": 27740,
  "toi": 5705,
  "pbt": 2981,
  "pbtYoy": 56.7
 },
 "EIB": {
  "tts": 241495,
  "loan": 150221,
  "dep": 158299,
  "eq": 26632,
  "cap": 18688,
  "toi": 1343,
  "pbt": 186,
  "pbtYoy": -66.8
 },
 "MSB": {
  "tts": 439960,
  "loan": 229982,
  "dep": 217398,
  "eq": 46857,
  "cap": 31200,
  "toi": 3985,
  "pbt": 2017,
  "pbtYoy": 27.1
 },
 "OCB": {
  "tts": 363726,
  "loan": 214702,
  "dep": 152006,
  "eq": 37120,
  "cap": 30625,
  "toi": 3291,
  "pbt": 1653,
  "pbtYoy": 7.5
 }
};
