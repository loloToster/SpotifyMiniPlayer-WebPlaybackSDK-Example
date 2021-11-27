let menuElement = document.getElementById("menu")
let controllerElement = document.getElementById("controller")

let isControllerVisible = () => !(controllerElement.style.display == "none")

function togglePlayer() {
    if (isControllerVisible()) {
        menuElement.style.display = "flex"
        controllerElement.style.display = "none"
    } else {
        menuElement.style.display = "none"
        controllerElement.style.display = "flex"
    }
}

Array.from(document.getElementsByClassName("toggleBtn")).forEach(e => e.addEventListener("click", togglePlayer))

window.onSpotifyWebPlaybackSDKReady = () => {

    { // custom methods
        Spotify.Player.prototype.defaultHeaders = function (access_token) {
            return {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        }
        Spotify.Player.prototype.play = function (spotify_uri, device_id = false) {
            device_id = device_id ? `?device_id=${device_id}` : ""
            let context_uri = undefined
            let uris = undefined
            if (spotify_uri.startsWith("spotify:track:"))
                uris = [spotify_uri]
            else
                context_uri = spotify_uri
            this._options.getOAuthToken(access_token => {
                fetch("https://api.spotify.com/v1/me/player/play" + device_id, {
                    method: "PUT",
                    body: JSON.stringify({
                        "context_uri": context_uri,
                        "uris": uris
                    }),
                    headers: this.defaultHeaders(access_token)
                })
            })
        }
        Spotify.Player.prototype.getMe = function () {
            return new Promise(resolve => {
                this._options.getOAuthToken(async access_token => {
                    let res = await fetch(`https://api.spotify.com/v1/me`, {
                        headers: this.defaultHeaders(access_token)
                    })
                    let data = await res.json()
                    resolve(data)
                })
            })
        }
        Spotify.Player.prototype.getMyPlaylists = function () {
            return new Promise(resolve => {
                this._options.getOAuthToken(async access_token => {
                    let res = await fetch(`https://api.spotify.com/v1/me/playlists`, {
                        headers: this.defaultHeaders(access_token)
                    })
                    let data = await res.json()
                    resolve(data.items)
                })
            })
        }
        Spotify.Player.prototype.transferPlayback = function (device_id) {
            this._options.getOAuthToken(access_token => {
                return new Promise((resolve, reject) => {
                    fetch("https://api.spotify.com/v1/me/player", {
                        method: "PUT",
                        body: JSON.stringify({ device_ids: [device_id] }),
                        headers: this.defaultHeaders(access_token)
                    }).then(() => resolve())
                })
            })
        }
        Spotify.Player.prototype.toggleShuffle = async function () {
            let state = await this.getCurrentState()
            state = !state.shuffle
            this._options.getOAuthToken(access_token => {
                fetch("https://api.spotify.com/v1/me/player/shuffle?state=" + state, {
                    method: "PUT",
                    headers: this.defaultHeaders(access_token)
                })
            })
        }
        Spotify.Player.prototype.toggleRepeat = async function () {
            const REPEAT_MODES = ["off", "context", "track"]
            let state = await this.getCurrentState()
            state = (state.repeat_mode + 1) % 3
            this._options.getOAuthToken(access_token => {
                fetch(`https://api.spotify.com/v1/me/player/repeat?state=${REPEAT_MODES[state]}`, {
                    method: "PUT",
                    headers: this.defaultHeaders(access_token)
                })
            })
        }
    }

    const player = new Spotify.Player({
        name: "Mini Player",
        getOAuthToken: async cb => {
            let res = await fetch("/token")
            let token = await res.text()
            cb(token)
        },
        volume: 0.5
    })

    { // error handling
        player.on("playback_error", ({ message }) => {
            console.log("Failed to perform playback", message)
        })

        player.on("initialization_error", ({ message }) => {
            console.log("Failed to initialize", message)
        })

        player.on("authentication_error", ({ message }) => {
            console.log("Failed to authenticate", message)
        })

        player.on("account_error", ({ message }) => {
            console.log("Failed to validate Spotify account", message)
        })
    }

    async function updateUserInfo() {
        let me = await player.getMe()
        document.getElementById("nickname").innerText = me.display_name
        document.getElementById("profile-pic").src = me.images[0].url

        let likedSongs = document.getElementsByClassName("playlist")[0]
        likedSongs.addEventListener("click", () => {
            togglePlayer()
            player.play(`spotify:user:${me.id}:collection`)
        })

        let playlistContainer = document.getElementById("playlists")
        let playlists = await player.getMyPlaylists()
        playlists.forEach(playlist => {
            let clone = likedSongs.cloneNode(true)
            clone.querySelector(".cover").src = playlist.images.length ? playlist.images[0].url : "/images/default-pl.png"
            clone.querySelector(".name").innerText = playlist.name
            playlistContainer.appendChild(clone)
            clone.addEventListener("click", () => {
                togglePlayer()
                player.play("spotify:playlist:" + playlist.id)
            })
        })
    }

    let shuffleBtn = document.getElementById("shuffle")
    let pauseBtn = document.getElementById("pause-play")
    let repeatBtn = document.getElementById("loop")

    shuffleBtn.addEventListener("click", () => player.toggleShuffle())
    document.getElementById("prev").addEventListener("click", () => player.previousTrack())
    pauseBtn.addEventListener("click", () => player.togglePlay())
    document.getElementById("next").addEventListener("click", () => player.nextTrack())
    repeatBtn.addEventListener("click", () => player.toggleRepeat())

    player.addListener("ready", async ({ device_id }) => {
        await updateUserInfo()
        await player.transferPlayback(device_id)
    })

    function findBestImage(images) {
        lastImg = { height: 0 }
        images.forEach(img => {
            if (lastImg.height < img.height)
                lastImg = img

        })
        return lastImg.url
    }

    player.addListener("player_state_changed", async state => {
        if (!state) return

        // setting album cover
        document
            .getElementById("controller")
            .style
            .setProperty("--image",
                `url("${findBestImage(state.track_window.current_track.album.images)}")`)

        // setting title and artists
        document.getElementById("title").innerText = state.track_window.current_track.name
        document.getElementById("artist").innerText = state.track_window.current_track.artists
            .reduce((acc, cur) => acc + cur.name + ", ", "")
            .slice(0, -2)

        // setting buttons state
        state.paused ?
            pauseBtn.classList.add("paused") :
            pauseBtn.classList.remove("paused")

        state.shuffle ?
            shuffleBtn.classList.add("active") :
            shuffleBtn.classList.remove("active")

        let loop0 = document.querySelector("#loop .loop0")
        let loop1 = document.querySelector("#loop .loop1")
        switch (state.repeat_mode) {
            case 0:
                repeatBtn.classList.remove("active")
                loop0.style.display = "unset"
                loop1.style.display = "none"
                break

            case 1:
                repeatBtn.classList.add("active")
                loop0.style.display = "unset"
                loop1.style.display = "none"
                break

            case 2:
                repeatBtn.classList.add("active")
                loop0.style.display = "none"
                loop1.style.display = "unset"
                break

            default:
                break
        }

    })

    player.connect()
}
