 export interface OrderListParam {
    start: string;
    end: string | null;
    type: string| null;
    status: number | null;
    store_id: number | null;
    keyword: string | null;
    take: number | null;
    page: number | null;
    code: string | null;
    createdBy: number | null;
    description: string | null;
    owed_type: number | null;
    type_export: number;
    store_ids: string
  }
  