/**
 * 로그인 모달을 여는 주소와, 로그인한 뒤에 갈 곳.
 *
 * 예전에는 고객센터의 "로그인하기"가 /?login=true로 보내고, 로그인에 성공하면 무조건
 * /dashboard로 갔습니다. 1:1 문의를 쓰려던 사람이 로그인 한 번에 홈을 거쳐 대시보드로
 * 떨어졌고, 쓰던 자리로 돌아가려면 고객센터를 다시 찾아 들어가야 했습니다.
 */

export const LOGIN_PARAM = 'login'
export const REDIRECT_PARAM = 'redirect'

/**
 * 앱 안의 경로만 통과시킵니다.
 *
 * '//evil.com'은 슬래시로 시작하지만 브라우저에게는 바깥 주소입니다. 이걸 막지 않으면
 * 로그인 링크에 남의 주소를 실어 보내는 것만으로 우리 화면을 거쳐 그리로 보낼 수 있습니다.
 */
export function safeInternalPath(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function stripAuthParams(search: string) {
  const params = new URLSearchParams(search)
  params.delete(LOGIN_PARAM)
  params.delete(REDIRECT_PARAM)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/** 지금 있는 자리에서 로그인 모달을 여는 주소. ?tab=inquiry 같은 기존 쿼리는 그대로 둡니다. */
export function loginHref(pathname: string, search: string) {
  const params = new URLSearchParams(search)
  params.set(LOGIN_PARAM, 'true')
  return `${pathname}?${params.toString()}`
}

/**
 * 로그인에 성공한 뒤 갈 곳.
 *
 * 1) ?redirect=<앱 내부 경로>가 있으면 그리로. 나중에 보호된 경로가 생겼을 때 "로그인하고
 *    원래 가려던 곳으로" 보내는 통로입니다.
 * 2) 없으면 홈과 회원가입에서 시작한 로그인만 /dashboard로. Home의 "도담과 시작하기"와
 *    가입 완료가 여기로 오므로, 그 둘은 지금까지처럼 동작합니다.
 * 3) 그 밖에는 있던 자리 그대로. 고객센터에서 로그인하면 고객센터에 남습니다.
 */
export function postLoginTarget(pathname: string, search: string) {
  const requested = safeInternalPath(new URLSearchParams(search).get(REDIRECT_PARAM))
  if (requested) return requested

  if (pathname === '/' || pathname === '/signup') return '/dashboard'

  return `${pathname}${stripAuthParams(search)}`
}
