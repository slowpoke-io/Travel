/**
 * 幣別與金額格式化。
 *
 * 兩個容易做錯的地方，這裡集中處理：
 *
 * 1. **小數位數不是每個幣別都是 2**。韓元與日圓沒有小數，把 ₩12,000 顯示成
 *    ₩12,000.00 會讓人以為自己看錯。輸入時也不該讓人打小數點。
 *
 * 2. **金額不能用浮點數直接累加**。資料庫存的是 numeric，JS 拿到的是 number，
 *    直接相加會累積出 0.30000000000000004 那種東西。加總一律先換成「分」的
 *    整數再相加，而且進位只在最後做一次（見 sumMoney）。
 */

type CurrencyMeta = {
  code: string
  symbol: string
  /** 小數位數。JPY / KRW 是 0 */
  digits: number
  label: string
}

/**
 * 只列常用的。沒列到的幣別會走 fallback（用代碼當符號、2 位小數），
 * 功能不會壞，只是顯示樸素一點。
 */
const CURRENCIES: CurrencyMeta[] = [
  { code: 'TWD', symbol: 'NT$', digits: 0, label: '新台幣' },
  { code: 'JPY', symbol: '¥', digits: 0, label: '日圓' },
  { code: 'KRW', symbol: '₩', digits: 0, label: '韓元' },
  { code: 'USD', symbol: '$', digits: 2, label: '美元' },
  { code: 'EUR', symbol: '€', digits: 2, label: '歐元' },
  { code: 'CNY', symbol: '¥', digits: 2, label: '人民幣' },
  { code: 'HKD', symbol: 'HK$', digits: 2, label: '港幣' },
  { code: 'THB', symbol: '฿', digits: 2, label: '泰銖' },
  { code: 'VND', symbol: '₫', digits: 0, label: '越南盾' },
  { code: 'SGD', symbol: 'S$', digits: 2, label: '新加坡幣' },
  { code: 'MYR', symbol: 'RM', digits: 2, label: '馬來西亞令吉' },
  { code: 'PHP', symbol: '₱', digits: 2, label: '菲律賓披索' },
  { code: 'IDR', symbol: 'Rp', digits: 0, label: '印尼盾' },
  { code: 'GBP', symbol: '£', digits: 2, label: '英鎊' },
  { code: 'AUD', symbol: 'A$', digits: 2, label: '澳幣' },
  { code: 'CAD', symbol: 'C$', digits: 2, label: '加幣' },
  { code: 'CHF', symbol: 'CHF', digits: 2, label: '瑞士法郎' },
  { code: 'NZD', symbol: 'NZ$', digits: 2, label: '紐西蘭幣' },
  { code: 'TRY', symbol: '₺', digits: 2, label: '土耳其里拉' },
  { code: 'AED', symbol: 'AED', digits: 2, label: '阿聯迪拉姆' },
]

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c] as const))

export const CURRENCY_LIST = CURRENCIES

/*
  新台幣在台灣的日常習慣是不寫角分，所以上面 TWD 的 digits 設成 0。
  但它同時是預設的結算幣別，換算結果（例如 ₩12,000 ≈ NT$281）本來就只是
  概數，寫到小數點對閱讀沒有幫助。
*/
export function currencyMeta(code: string): CurrencyMeta {
  return (
    BY_CODE.get(code.toUpperCase()) ?? {
      code: code.toUpperCase(),
      symbol: code.toUpperCase(),
      digits: 2,
      label: code.toUpperCase(),
    }
  )
}

/** 這個幣別有沒有小數 —— 輸入介面用來決定要不要顯示小數點鍵 */
export function currencyDigits(code: string): number {
  return currencyMeta(code).digits
}

/**
 * 格式化成可以直接顯示的字串，例如 `₩12,000`、`NT$281`、`$12.50`。
 */
export function formatMoney(amount: number, code: string): string {
  const meta = currencyMeta(code)
  const n = Number.isFinite(amount) ? amount : 0
  return (
    meta.symbol +
    n.toLocaleString('zh-TW', {
      minimumFractionDigits: meta.digits,
      maximumFractionDigits: meta.digits,
    })
  )
}

/**
 * 換算後的補充顯示，例如 `≈NT$281`。
 *
 * 前面的 ≈ 是刻意的：匯率是一趟設一次的概算，不是即時牌價，
 * 寫成等號會讓人以為這是精確金額。
 */
export function formatApprox(amount: number, code: string): string {
  return `≈${formatMoney(amount, code)}`
}

/**
 * 依幣別的小數位數做四捨五入。
 * 累加之後一定要走這一道，否則會累積出 0.30000000000000004 這種東西。
 */
export function roundTo(amount: number, code: string): number {
  const p = 10 ** currencyMeta(code).digits
  return Math.round(amount * p) / p
}

/**
 * 把一串金額加總。
 *
 * 兩件事要同時滿足，而且很容易只顧到一邊：
 *
 * 1. **不能用浮點數直接累加** —— 0.1 + 0.2 那類誤差在幾十筆之後會浮現。
 *    所以一律先乘 100 變成整數（分）再相加。
 *
 * 2. **不能在加總前就依幣別的小數位數進位**。新台幣的顯示位數是 0，但
 *    換算值（amount_home）是 numeric(14,2)，實際帶著角分。先把每一筆
 *    各自進位成整數再相加，等於把每一筆的角分都丟掉 ——
 *    130.76 + 15.58 + 15.61 + 10.39 應該是 172，那樣算會變成 173。
 *
 * 所以：一律以「分」為單位累加，最後才依幣別的位數收尾一次。
 */
export function sumMoney(amounts: number[], code: string): number {
  const cents = amounts.reduce((acc, a) => acc + Math.round(a * 100), 0)
  return roundTo(cents / 100, code)
}

/**
 * 匯率的反向顯示：1 個結算幣別換得到多少當地幣別。
 *
 * 輸入欄位問的是「1 KRW 等於多少 TWD」（0.0234），但那個數字看不出對不對 ——
 * 沒有人記得 0.0234，大家記得的是「1 塊台幣大概 43 韓元」。
 *
 * 這裡刻意不套用幣別的小數位數：它是「比率」不是「金額」。韓元的顯示位數是 0，
 * 照著套會把 42.735 變成 43 還算堪用，但換成美元（1 TWD ≈ 0.03 USD）就只剩
 * 0.03，完全看不出你打的匯率精不精確。改用四位有效數字，兩種量級都讀得出來。
 */
export function formatInverseRate(rate: number, code: string): string {
  if (!Number.isFinite(rate) || rate <= 0) return ''
  const value = Number((1 / rate).toPrecision(4))
  return (
    currencyMeta(code).symbol +
    value.toLocaleString('zh-TW', { maximumFractionDigits: 6 })
  )
}
