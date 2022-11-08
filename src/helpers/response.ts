import { TeleBot } from "./teleBot";
export function success(res: any) {
    let data = {
        'success': true,
        'code': 200,
        'message': 'success',
        'data': res
    }
    return data;
};

export function error(res: any,service:string ="") {
    let data = {
        'success': false,
        'code': 201,
        'message': res,
        'data': []
    }
    if(process.env.NODE_ENV==="production"){
        TeleBot(res,service)
    }
    return data;
};
export function notFound(res: any) {
    let data = {
        'success': false,
        'code': 404,
        'message': res,
        'data': null
    }
    return data;
};