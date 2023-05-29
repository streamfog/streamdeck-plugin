/// <reference path="libs/js/stream-deck.js" />
/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/utils.js" />

// To be dynamically fetched
const OVERLAY_PATH = "C:\\Users\\kbond\\Streamfog";

// Action Cache
const MACTIONS = {};

// Action Events
const playOverlayAction = new Action('com.streamfog.overlay.action');

console.log("asd");

playOverlayAction.onWillAppear(({ context, payload }) => {
    // console.log('will appear', context, payload);
    MACTIONS[context] = new PlayOverlayAction(context, payload);
});

playOverlayAction.onWillDisappear(({ context }) => {
    // console.log('will disappear', context);
    MACTIONS[context].interval && clearInterval(MACTIONS[context].interval);
    delete MACTIONS[context];
});

playOverlayAction.onDidReceiveSettings(({ context, payload }) => {
    //  console.log('onDidReceiveSettings', payload?.settings?.hour12, context, payload);
    MACTIONS[context].didReceiveSettings(payload?.settings);
});

playOverlayAction.onTitleParametersDidChange(({ context, payload }) => {
    // console.log('wonTitleParametersDidChange', context, payload);
    MACTIONS[context].color = payload.titleParameters.titleColor;
    MACTIONS[context].ticks = ''; // trigger re-rendering of ticks
});

playOverlayAction.onDialPress(({ context, payload }) => {
    // console.log('dial was pressed', context, payload);
    if (payload.pressed === false) {
        MACTIONS[context].toggleSeconds();
    }
});

playOverlayAction.onTouchTap(({ context, payload }) => {
    console.log('touchpanel was tapped', context, payload);
    if (payload.hold === false) {
        MACTIONS[context].toggleSeconds();
    }
});

playOverlayAction.onKeyDown(async ({ context, payload }) => {

    MACTIONS[context].playAnimation();
});

class PlayOverlayAction {
    constructor(context, payload) {
        this.context = context;
        this.payload = payload;
        this.interval = null;
        this.isEncoder = payload?.controller === 'Encoder';
        this.settings = {};
        if (Object.keys(payload.settings).length > 0) {
            this.settings.selectedOverlay = payload?.settings.selectedOverlay;
            this.settings.overlayPath = payload?.settings.overlayPath;
        } else {
            this.settings.selectedOverlay = "";
            this.settings.overlayPath = "";
        }
        console.log(this.settings.selectedOverlay);
        this.size = 48; // default size of the icon is 48
        this.color = '#EFEFEF';
        this.saveSettings();
        this.init();
    }
    init() {
        console.log("asd");
        console.log()
        if (this.settings.selectedOverlay !== "" && this.settings.overlayPath !== "") {
            const icon = this.settings.overlayPath + "\\" + this.settings.selectedOverlay + "\\thumbnail.jpg";
            console.log(icon);
            if (this.isEncoder) {
                console.log("im encoder");
                const payload = {
                    'title': "",
                    'value': o.time,
                    icon
                };
                $SD.setFeedback(this.context, payload);
            }
            $SD.setImage(this.context, icon);
            $SD.setTitle(this.context, "");
        } else {
            $SD.setTitle(this.context, "Overlay");
        }
    }

    didReceiveSettings(settings) {
        if (!settings) return;
        let dirty = false;
        if (settings.hasOwnProperty('selectedOverlay')) {
            this.settings.selectedOverlay = settings.selectedOverlay;
            dirty = true;
        }
        if (settings.hasOwnProperty('overlayPath')) {
            this.settings.overlayPath = settings.overlayPath;
            dirty = true;
        }
        if (dirty) this.init();
    }

    saveSettings(immediateUpdate = false) {
        $SD.setSettings(this.context, this.settings);
        if (immediateUpdate) this.init();
    };

    playError() {
        $SD.showAlert(this.context, "Please start Streamfog!");
    }

    async playAnimation() {

        if (this.settings.selectedOverlay !== "" && this.settings.overlayPath !== "") {
            const url = 'http://localhost:5000/animationStatus';

            // Define the headers for the request
            const headers = {
                'Content-Type': 'application/json'
            };

            // Define the data for the request
            const data = {
                'status': 'animationOn',
                'folder': this.settings.selectedOverlay,
                'sections': []  // Assuming sections is an empty list in this case
            };

            // Create a promise that rejects in <5s
            const timeout = new Promise((resolve, reject) => {
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error('Request took longer than 5 seconds'));
                }, 1000)
            })

            // Create a promise that sends the POST request
            const fetchPromise = fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            // Initiate a "race" between the two promises
            try {
                await Promise.race([fetchPromise, timeout]);
                this.playAnimationOnKey();
            } catch (error) {
                console.log(error);
                this.playError();
            }
        }
        else {
            this.playError();
        }
    }


    async playAnimationOnKey() {


        const gif_path = this.settings.overlayPath + "\\" + this.settings.selectedOverlay + "\\preview.gif";
        const response = await fetch(gif_path);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const intArray = new Uint8Array(arrayBuffer);

        const reader = new GifReader(intArray);

        const delay = 1000 / 30; // For 30 FPS, the delay should be ~33.33 ms
        let frameIndex = 0;
        const frameCount = reader.numFrames();

        const intervalId = setInterval(() => {
            if (frameIndex >= frameCount) {
                clearInterval(intervalId);
                this.init();  // Call init function here after the animation is done
                return;
            }

            const frameInfo = reader.frameInfo(frameIndex);
            const image = new ImageData(frameInfo.width, frameInfo.height);
            reader.decodeAndBlitFrameRGBA(frameIndex, image.data);

            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(image, 0, 0);

            const url = canvas.toDataURL();
            $SD.setImage(this.context, url);

            frameIndex++;
        }, delay);
    }

};
