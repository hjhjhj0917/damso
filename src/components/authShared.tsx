export type Carrier = 'SKT' | 'KT' | 'LG U+' | '알뜰폰'

export type AuthMethod = '문자인증' | 'pass'

export type AccountType = 'user' | 'guardian'

export type ParentProfile = {
  name: string
  birthDate?: string
  residentFront: string
  residentBackFirst: string
  phone: string
  relation: string
  address: string
  consentAt: string
}

type UserIdType = 'email' | 'phone'

export type SavedUser = {
  id: string
  idType: UserIdType
  password: string
  phone: string
  carrier: Carrier
  name: string
  residentFront: string
  residentBackFirst: string
  accountType?: AccountType
  parent?: ParentProfile
}

export function getUserIdType(value: string): UserIdType | null {
  const trimmedValue = value.trim()
  const onlyNumber = trimmedValue.replaceAll('-', '')

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)
  const isPhone = /^01[016789]\d{7,8}$/.test(onlyNumber)

  if (isEmail) return 'email'
  if (isPhone) return 'phone'

  return null
}

export function normalizeId(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.includes('@')) {
    return trimmedValue.toLowerCase()
  }

  return trimmedValue.replaceAll('-', '')
}

export function normalizePhone(value: string) {
  return value.trim().replaceAll('-', '')
}

export function isValidPhone(value: string) {
  return /^01[016789]\d{7,8}$/.test(normalizePhone(value))
}

export function CarrierSelect({
  carrier,
  setCarrier,
}: {
  carrier: Carrier
  setCarrier: (value: Carrier) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-lg font-extrabold text-slate-800">
        통신사
      </label>

      <select
        value={carrier}
        onChange={(event) => setCarrier(event.target.value as Carrier)}
        className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition focus:border-blue-500 focus:bg-white"
      >
        <option value="SKT">SKT</option>
        <option value="KT">KT</option>
        <option value="LG U+">LG U+</option>
        <option value="알뜰폰">알뜰폰</option>
      </select>
    </div>
  )
}

export function PhoneInput({
  phone,
  setPhone,
}: {
  phone: string
  setPhone: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-lg font-extrabold text-slate-800">
        전화번호
      </label>

      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        type="tel"
        placeholder="01012345678"
        className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-5 text-xl font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
      />
    </div>
  )
}

export function AuthMethodSelector({
  authMethod,
  setAuthMethod,
}: {
  authMethod: AuthMethod
  setAuthMethod: (value: AuthMethod) => void
}) {
  return (
    <div>
      <label className="mb-3 block text-lg font-extrabold text-slate-800">
        인증 방식
      </label>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setAuthMethod('문자인증')}
          className={`h-14 rounded-2xl text-lg font-black ${
            authMethod === '문자인증'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          문자 인증
        </button>

        <button
          type="button"
          onClick={() => setAuthMethod('pass')}
          className={`h-14 rounded-2xl text-lg font-black ${
            authMethod === 'pass'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          PASS 인증
        </button>
      </div>
    </div>
  )
}
