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

app.get("/", (req, res) => {
    res.sendFile("views/index.html", { root: __dirname })
})

const PORT = 88
app.listen(PORT, () => {
    console.log(`Listening at http://localhost:${PORT}`)
})
