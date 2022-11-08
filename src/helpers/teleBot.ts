async function TeleBot(message:any,service:string){
    const TelegramBot = require('node-telegram-bot-api');

    // replace the value below with the Telegram token you receive from @BotFather
    const token = "5493742171:AAHJObOhRkfSIVdWE8U0UehZ7DnlwB7LVeg";
    
    // Create a bot that uses 'polling' to fetch new updates
    const bot = new TelegramBot(token);
    bot.sendMessage("-689874505", JSON.stringify({location:service,error:message}));
  }
export {
    TeleBot
}