export interface IResponse<T> {
  data: T;
  error: string;
  success: boolean;
}
