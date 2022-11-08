export class UpdateBookingDto {
    status: number;
    book_status: number;
    description: string;
    intend_time: number;
    updated_by: number;
    book_date: Date;
    source_from: number;
    stores: number;
    customers: {
        id: number;
        gender: number;
        full_name: string;
        mobile: string;
        city: string;
        district: string;
        address: string;

    };
    booking_item: [{
        product_ids: [{
            id: number;
            name: string
        }];
        user_ids: [{
            id: number;
            name: string
        }];
        intend_time: number;
    }]
}
  