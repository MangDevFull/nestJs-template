export const statusOrder = {
    pending: 1,
    close: 2,
    success: 3
}

export const orderStatusOject = {
    1:"Đang xử lý",
    2:"Bị huỷ",
    3:"Hoàn thành",
}

export const generateRandomString = (myLength) => {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    
    const randomArray = Array.from(
        { length: myLength },
        (v, k) => chars[Math.floor(Math.random() * chars.length)]
    );

    const randomString = randomArray.join("");
    return randomString;
};

export const generateRandomNumber = (myLength) => {
    const chars = "1234567890";
    const randomArray = Array.from(
        { length: myLength },
        (v, k) => chars[Math.floor(Math.random() * chars.length)]
    );

    const randomString = randomArray.join("");
    return randomString;
};

export const addLeadingZeros = (num, totalLength) => {
    return String(num).padStart(totalLength, '0');
}