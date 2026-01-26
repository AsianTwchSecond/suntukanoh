const mineflayer = require("mineflayer")
const express = require("express")

const app = express()
app.use(express.json())

let bot = null
let connecting = false
let logs = []

function addLog(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`
  console.log(line)
  logs.push(line)
  if (logs.length > 300) logs.shift()
}

/* ---------- BOT ---------- */
function joinBot() {
  if (bot || connecting) {
    addLog("Join ignored (already online or connecting)")
    return
  }

  connecting = true
  addLog("Starting bot...")

  bot = mineflayer.createBot({
    host: "play.bingungsmp.top",
    username: "AltNiXac",
    version: false
  })

  bot.once("spawn", () => {
    connecting = false
    addLog("Bot spawned")

    setTimeout(() => bot.chat("/login kurtalle"), 3000)
    setTimeout(() => bot.chat("/server ecocpvp"), 6000)

    // Auto jump every 5s
    bot.jumpInterval = setInterval(() => {
      bot.setControlState("jump", true)
      setTimeout(() => bot.setControlState("jump", false), 200)
    }, 5000)
  })

  bot.on("chat", (username, message) => {
    addLog(`<${username}> ${message}`)
  })

  bot.on("end", () => {
    addLog("Bot disconnected")
    if (bot?.jumpInterval) clearInterval(bot.jumpInterval)
    bot = null
    connecting = false
  })

  bot.on("error", err => addLog("Error: " + err.message))
}

function leaveBot() {
  if (!bot) {
    addLog("Leave ignored (bot offline)")
    return
  }
  addLog("Bot leaving server")
  if (bot.jumpInterval) clearInterval(bot.jumpInterval)
  bot.quit()
  bot = null
}

/* ---------- WEBSITE ---------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>AFK Bot Control</title>
  <style>
    body { background:#111; color:#0f0; font-family:monospace; padding:20px }
    button { padding:8px 16px; margin:4px; font-size:15px }
    input { padding:8px; width:300px; background:#000; color:#0f0; border:1px solid #0f0 }
    #logs { background:#000; padding:10px; height:300px; overflow:auto; margin-top:10px; white-space:pre-wrap }
  </style>
</head>
<body>
  <h2>AFK Bot Control Panel</h2>

  <button onclick="fetch('/join')">JOIN</button>
  <button onclick="fetch('/leave')">LEAVE</button>

  <div style="margin-top:10px">
    <input id="chat" placeholder="Type chat or command..." />
    <button onclick="sendChat()">SEND</button>
  </div>

  <div id="logs"></div>

  <script>
    async function refreshLogs() {
      const res = await fetch('/logs')
      document.getElementById('logs').textContent = await res.text()
      const box = document.getElementById('logs')
      box.scrollTop = box.scrollHeight
    }

    async function sendChat() {
      const input = document.getElementById('chat')
      if (!input.value) return
      await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.value })
      })
      input.value = ''
    }

    setInterval(refreshLogs, 1000)
    refreshLogs()
  </script>
</body>
</html>
`)
})

app.get("/join", (req, res) => {
  joinBot()
  res.send("OK")
})

app.get("/leave", (req, res) => {
  leaveBot()
  res.send("OK")
})

app.post("/chat", (req, res) => {
  const msg = req.body.message
  if (!bot) {
    addLog("Chat failed (bot offline)")
    return res.send("Bot offline")
  }
  addLog(`You: ${msg}`)
  bot.chat(msg)
  res.send("OK")
})

app.get("/logs", (req, res) => {
  res.send(logs.join("\n"))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => addLog("Website running on port " + PORT))
