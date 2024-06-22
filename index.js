require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const schedule = require('node-schedule');
const fs = require('fs');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

let interval = '*/10 * * * * *'; 
let messageCount = 0; 

const client = new Client({ checkUpdate: false });
const sentMessages = new Set();
let messages = [];

const colors = [
  '\x1b[31m', 
  '\x1b[32m', 
  '\x1b[33m', 
  '\x1b[34m', 
  '\x1b[35m', 
  '\x1b[36m', 
];
const reset = '\x1b[0m';

function loadMessages() {
  try {
    const data = fs.readFileSync('kata.txt', 'utf8');
    messages = data.split('\n').filter(line => line.trim() !== '');
  } catch (error) {
    console.error('Error reading kata.txt:', error);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadMessages(); 
  scheduleMessage();
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!setinterval ')) {
    const newInterval = message.content.split('!setinterval ')[1];
    if (newInterval) {
      interval = newInterval;
      message.channel.send(`Interval changed to: ${interval}`);
      schedule.cancelJob('messageJob');
      scheduleMessage();
    } else {
      message.channel.send('Please provide a new interval.');
    }
  }
});

function getUniqueMessage() {
  if (messages.length === 0) {
    return 'No messages available.';
  }

  let message;
  do {
    const randomIndex = Math.floor(Math.random() * messages.length);
    message = messages[randomIndex];
  } while (sentMessages.has(message) && sentMessages.size < messages.length);

  sentMessages.add(message);
  return message;
}

async function deletePreviousMessages(channel) {
  try {
    const fetchedMessages = await channel.messages.fetch({ limit: 100 });
    const botMessages = fetchedMessages.filter(msg => msg.author.id === client.user.id);
    for (const msg of botMessages.values()) {
      await msg.delete();
    }
  } catch (error) {
    console.error('Error deleting previous messages:', error);
  }
}

function scheduleMessage() {
  schedule.scheduleJob('messageJob', interval, async function() {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel) {
        await deletePreviousMessages(channel);
        const messageText = getUniqueMessage();
        const color = colors[messageCount % colors.length];
        const coloredMessageText = `${color}${messageText}${reset}`;
        messageCount++;
        console.log(`(${messageCount}) Sedang Mengirim Pesan: ${coloredMessageText} ✅`);
        const message = await channel.send(messageText);
        console.log('Pesan Bot Sukses Terkirim 📨');
        setTimeout(async () => {
          await message.delete();
          console.log('Pesan Bot Telah Di Hapus 🗑️');
        }, 5000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
}

client.login(DISCORD_TOKEN);