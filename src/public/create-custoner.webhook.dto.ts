export interface CreateCustomerWebHook {
    account_id: number
    action: string,
    user: {
        phone_no: string,
        account_id: number,
        updated_at: number,
        role_id: number,
        created_at: number,
        id: number,
        username: string
    }
    object: string
}