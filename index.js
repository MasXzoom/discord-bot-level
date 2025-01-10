require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const client = new Client({ checkUpdate: false });
let focusedUserId = null;
let isWaitingForReply = false;

async function checkSlowmode(channel) {
  try {
    const slowmode = channel.rateLimitPerUser;
    console.log(slowmode > 0 ? `Slowmode active: ${slowmode} seconds` : 'No slowmode active');
    return slowmode;
  } catch (error) {
    console.error('Error checking slowmode:', error);
    return 0;
  }
}

async function getLastMessage(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 1 });
    return messages.size === 0 ? null : messages.first();
  } catch (error) {
    console.error('Error fetching last message:', error);
    return null;
  }
}

async function respondToMessage(message) {
  if (!message.content.trim().endsWith('?')) {
    console.log(`Skipping non-question message from ${message.author.username}: ${message.content}`);
    return;
  }
  try {
    const response = await axios.get('https://api.ryzendesu.vip/api/ai/v2/chatgpt', {
      params: { text: message.content },
    });
    if (response.data && response.data.action === 'success') {
      const reply = response.data.response;
      const friendlyReply = `${reply} 😊`;
      await message.reply(friendlyReply);
      console.log(`Bot replied to ${message.author.username}: ${friendlyReply}`);
    } else {
      console.error('Invalid API response.');
    }
  } catch (error) {
    console.error('Error fetching AI response:', error);
  }
}

async function processMessages() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return;

    const slowmode = await checkSlowmode(channel);

    if (!isWaitingForReply) {
      const lastMessage = await getLastMessage(channel);
      if (lastMessage && lastMessage.author.id !== client.user.id) {
        focusedUserId = lastMessage.author.id;
        console.log(`Focusing on user: ${lastMessage.author.username}`);
        await respondToMessage(lastMessage);
        isWaitingForReply = true;

        setTimeout(async () => {
          if (isWaitingForReply) {
            console.log(`No response from ${lastMessage.author.username}. Looking for new message...`);
            isWaitingForReply = false;
            focusedUserId = null;
            await processMessages();
          }
        }, Math.max(Math.random() * (180000 - 120000) + 120000, slowmode * 1000));
      }
    }
  } catch (error) {
    console.error('Error processing messages:', error);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.author.id === client.user.id) return;

  if (message.author.id === focusedUserId) {
    isWaitingForReply = false;
    console.log(`Reply detected from ${message.author.username}. Responding...`);
    await respondToMessage(message);
    setTimeout(() => {
      isWaitingForReply = true;
    }, Math.random() * (180000 - 120000) + 120000);
  }
});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (channel) await checkSlowmode(channel);
  processMessages();
});

client.login(DISCORD_TOKEN);
