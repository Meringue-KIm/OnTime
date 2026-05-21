export function getErrorMessage(error: any): string {
  if (error?.response) {
    return error.response.data?.message ?? '서버 오류가 발생했습니다.';
  }
  if (error?.request) {
    return '네트워크 연결을 확인해주세요.';
  }
  return '알 수 없는 오류가 발생했습니다.';
}
