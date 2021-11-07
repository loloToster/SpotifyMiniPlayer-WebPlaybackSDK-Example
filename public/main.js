window.onSpotifyWebPlaybackSDKReady = () => {

    { // custom methods
        Spotify.Player.prototype.defaultHeaders = function (access_token) {
            return {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
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

        let playlistContainer = document.getElementById("playlists")
        let playlists = await player.getMyPlaylists()
        playlists.forEach(playlist => {
            let clone = likedSongs.cloneNode(true)
            clone.querySelector(".cover").src = playlist.images.length ? playlist.images[0].url : "/images/default-pl.png"
            clone.querySelector(".name").innerText = playlist.name
            playlistContainer.appendChild(clone)
        })
    }

    player.addListener("ready", async ({ device_id }) => {
        await updateUserInfo()
    })

    player.connect()
}
