// 카카오맵 JavaScript SDK(https://apis.map.kakao.com)를 이용한 주소/키워드 기반 병원 검색.
//
// 이 프로젝트는 백엔드가 없는 순수 프론트엔드라서, 서버 호출 전제의 REST API(dapi.kakao.com에
// Authorization 헤더로 직접 fetch하는 방식)는 브라우저에서 CORS로 막힙니다. 대신 브라우저 전용으로
// 설계된 JavaScript SDK(services 라이브러리)를 사용합니다 — CORS 문제가 없고, 발급 절차도 동일하게
// 사업자 등록이 필요 없습니다.
//
// 사용하려면 카카오 디벨로퍼스에서 발급받은 "JavaScript 키"를 .env.local에
// VITE_KAKAO_JS_KEY=발급받은키 로 설정하고, 앱 설정 > 플랫폼 > Web에 접속 도메인
// (개발 중이면 http://localhost:5173 등)을 등록해야 합니다.

export type HospitalSearchResult = {
  id: string
  name: string
  phone: string
  address: string
  distanceMeters?: number
}

const HOSPITAL_CATEGORY_CODE = 'HP8'
const JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined

type KakaoPlaceDocument = {
  id?: string
  place_name?: string
  phone?: string
  address_name?: string
  road_address_name?: string
  x: string
  y: string
  distance?: string
}

type KakaoLatLng = { getLat(): number; getLng(): number }

type KakaoServicesStatus = 'OK' | 'ZERO_RESULT' | 'ERROR'

type KakaoGeocoderResult = { x: string; y: string }[]

type KakaoPlacesSearchOptions = {
  location?: KakaoLatLng
  radius?: number
  sort?: string
  category_group_code?: string
}

type KakaoMapsNamespace = {
  load: (callback: () => void) => void
  LatLng: new (lat: number, lng: number) => KakaoLatLng
  services: {
    Status: Record<KakaoServicesStatus, KakaoServicesStatus>
    SortBy: { DISTANCE: string; ACCURACY: string }
    Geocoder: new () => {
      addressSearch: (
        query: string,
        callback: (result: KakaoGeocoderResult, status: KakaoServicesStatus) => void,
      ) => void
    }
    Places: new () => {
      categorySearch: (
        code: string,
        callback: (result: KakaoPlaceDocument[], status: KakaoServicesStatus) => void,
        options?: KakaoPlacesSearchOptions,
      ) => void
      keywordSearch: (
        keyword: string,
        callback: (result: KakaoPlaceDocument[], status: KakaoServicesStatus) => void,
        options?: KakaoPlacesSearchOptions,
      ) => void
    }
  }
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsNamespace }
  }
}

let loadPromise: Promise<KakaoMapsNamespace> | null = null

function loadKakaoMaps(): Promise<KakaoMapsNamespace> {
  if (!JS_KEY) {
    return Promise.reject(
      new Error(
        '카카오 지도 API 키가 설정되지 않았어요. .env.local에 VITE_KAKAO_JS_KEY를 추가해 주세요.',
      ),
    )
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao.maps)
      return
    }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false&libraries=services`
    script.async = true
    script.onerror = () =>
      reject(new Error('카카오 지도 스크립트를 불러오지 못했어요. 네트워크를 확인해 주세요.'))
    script.onload = () => {
      if (!window.kakao) {
        reject(new Error('카카오 지도 스크립트 로드에 실패했어요.'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps))
    }
    document.head.appendChild(script)
  })
  return loadPromise
}

function toResult(doc: KakaoPlaceDocument): HospitalSearchResult {
  return {
    id: doc.id ?? `${doc.x},${doc.y},${doc.place_name}`,
    name: doc.place_name ?? '이름 없음',
    phone: doc.phone ?? '',
    address: doc.road_address_name || doc.address_name || '',
    distanceMeters: doc.distance ? Number(doc.distance) : undefined,
  }
}

/**
 * 주소 또는 지역명으로 주변 병원을 검색합니다.
 * 1) 입력값을 주소로 지오코딩해 좌표를 구한 뒤 그 주변 병원을 카테고리 검색합니다.
 * 2) 주소로 인식되지 않으면 "{입력값} 병원" 키워드 검색으로 대체합니다.
 */
export async function searchHospitalsByAddress(
  query: string,
): Promise<HospitalSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const maps = await loadKakaoMaps()
  const geocoder = new maps.services.Geocoder()
  const places = new maps.services.Places()

  const geocoded = await new Promise<KakaoGeocoderResult | null>((resolve) => {
    geocoder.addressSearch(trimmed, (result, status) => {
      resolve(status === maps.services.Status.OK ? result : null)
    })
  })

  if (geocoded && geocoded[0]) {
    const { x, y } = geocoded[0]
    const nearby = await new Promise<KakaoPlaceDocument[]>((resolve, reject) => {
      places.categorySearch(
        HOSPITAL_CATEGORY_CODE,
        (result, status) => {
          if (status === maps.services.Status.OK) resolve(result)
          else if (status === maps.services.Status.ZERO_RESULT) resolve([])
          else reject(new Error('병원 검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'))
        },
        {
          location: new maps.LatLng(Number(y), Number(x)),
          radius: 3000,
          sort: maps.services.SortBy.DISTANCE,
        },
      )
    })
    if (nearby.length > 0) return nearby.map(toResult)
  }

  const keywordResults = await new Promise<KakaoPlaceDocument[]>((resolve, reject) => {
    places.keywordSearch(
      `${trimmed} 병원`,
      (result, status) => {
        if (status === maps.services.Status.OK) resolve(result)
        else if (status === maps.services.Status.ZERO_RESULT) resolve([])
        else reject(new Error('병원 검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'))
      },
      { category_group_code: HOSPITAL_CATEGORY_CODE },
    )
  })
  return keywordResults.map(toResult)
}
