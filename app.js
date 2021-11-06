const scopes = [
    "ugc-image-upload",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming",
    "app-remote-control",
    "user-read-email",
    "user-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-read-private",
    "playlist-modify-private",
    "user-library-modify",
    "user-library-read",
    "user-top-read",
    "user-read-playback-position",
    "user-read-recently-played",
    "user-follow-read",
    "user-follow-modify"
]

require("dotenv").config()

const express = require("express"),
    app = express()

const SpotifyApiNode = require("spotify-web-api-node")

const spotifyApi = new SpotifyApiNode({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_CALLBACK
})

app.use(express.static("public"))

express.response.renderHTML = function (file) {
    this.sendFile(file, { root: __dirname })
}

async function loggedIn() {
    try {
        await spotifyApi.getMe()
    } catch {
        return false
    }
    return true
}

app.get("/", async (req, res) => {
    await loggedIn() ? res.renderHTML("views/index.html") : res.redirect("/login")
})

app.get("/login", (req, res) => {
    res.renderHTML("views/login.html")
})

app.get("/login/redirect", (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes, "some status"))
})

app.get("/callback", async (req, res) => {
    const error = req.query.error
    const code = req.query.code

    if (error) {
        console.error("Callback Error:", error)
        res.send(`Callback Error: ${error}`)
        return
    }
    if (!code) return console.log("No code in callback")

    let data = await spotifyApi.authorizationCodeGrant(code.toString())

    spotifyApi.setAccessToken(data.body.access_token)
    spotifyApi.setRefreshToken(data.body.refresh_token)

    res.redirect("/")

    setInterval(async () => {
        const data = await spotifyApi.refreshAccessToken()
        const accessToken = data.body.access_token
        spotifyApi.setAccessToken(accessToken)
    }, data.body.expires_in / 2 * 1000)

})

const PORT = 88
app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`)
})
