export class UpdateOrderDto {
    description: string;
    status: number;
    total_price: number;
    order_at: Date;
    updated_by: number;
    updated_by_name: string;
    stores: number;
    store_name: string;
    payment_type: string;
    money_paid: number;
    money_owed: number;
    id_booking: number;
    isDeposit:boolean;
    deposit_total: number
    customers: {
        id: number;
        gender: number;
        full_name: string;
        mobile: string;
        city: string;
        district: string;
        address: string;
        email: string;
        facebook_id: string;
        birthday: string;
        day_birthday: string;
        month_birthday: string;
        year_birthday: string;
        type: number //1: default, 2: khách lẻ (không hiển thị ở customer)
    };
    orderItem: {
        id:number;
        order_id: number;
        package_code: string;
        product_id: number;
        quantity: number;
        price: number;
        new_package: boolean;
        product_code: string; //get from database
        product_name: string; //get from database
        packageList: any; //get from database
        status_package: number //check the number of uses of the package: 1-active, 4-limit
        employee_consultant1: number;
        employee_consultant2: number;
        employee_consultant3: number;
        employee_consultant4: number;
        employee_consultant5: number;
        employee_consultant_name1: string;
        employee_consultant_name2: string;
        employee_consultant_name3: string;
        employee_consultant_name4: string;
        employee_consultant_name5: string;
        employee_service1: number;
        employee_service2: number;
        employee_service3: number;
        employee_service4: number;
        employee_service5: number;
        employee_service_name1: string;
        employee_service_name2: string;
        employee_service_name3: string;
        employee_service_name4: string;
        employee_service_name5: string;
        commission_presenter: number;
        discount: number;
        type_presenter: number;
        presenter_user_id: number;
        presenter_customer_id: number
        presenter_name:string
        presenter_mobile:string
        package: any,
        note: string,
        max_used_package: number
        last_used_count:number
        max_used: number
    }[]
    transaction: {
        paid_amount: number,
        pay_type: string,
        store_id: number,
        pay_account_number: string
        total_amount: number,
    }[]
}