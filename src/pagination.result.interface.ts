export interface PaginationResultInterface<PaginationEntity> {
    data: PaginationEntity[];
    total: number;
    next?: string;
    previous?: string;
  }