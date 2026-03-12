import { resolveApiUrl } from './urls';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveApiUrl(path), init);

  if (!res.ok) {
    // 서버에서 보낸 에러 메시지 파싱
    let errorMessage = `요청 실패 (상태 코드: ${res.status})`;

    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // JSON 파싱 실패 시 기본 메시지 사용
      errorMessage = `서버 오류 (상태 코드: ${res.status})`;
    }

    throw new Error(errorMessage);
  }

  return res.json();
}
