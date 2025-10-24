export class WebResponse<T> {
  data?: T;
  errors?: string;
  paging?: Paging;
  message?: string;
}

export class Paging {
  size: number;
  total_page: number;
  current_page: number;
}
