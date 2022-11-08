export class CreateBookingDto {
    status: number;
    book_status: number;
    description: string;
    created_by: number;
    book_date: Date;
    source_from: number;
    stores: number;
    intend_time: number;
    customers: {
        id: any;
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
    isCareSoft: number
    ticketId: string
}
